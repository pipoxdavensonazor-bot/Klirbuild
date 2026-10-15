#!/usr/bin/env bash
# Disable I'm Under Attack Mode on klirline.ca, keep Bot Fight Mode off,
# and set Clerk CNAMEs to DNS-only (grey cloud). Does not touch Stripe,
# AI bot blocking, or application deploys.
set -euo pipefail

API="https://api.cloudflare.com/client/v4"
ZONE_NAME="${CLOUDFLARE_ZONE_NAME:-klirline.ca}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-a9a3f1c8c174988e084ba22e233c1df2}"
TOKEN="${CLOUDFLARE_API_TOKEN:-}"

CLERK_HOSTS=(
  "accounts.www.${ZONE_NAME}"
  "clerk.www.${ZONE_NAME}"
  "accounts.${ZONE_NAME}"
  "clerk.${ZONE_NAME}"
)

if [[ -z "$TOKEN" ]]; then
  echo "::error::CLOUDFLARE_API_TOKEN is missing. Add a token with Zone Settings Write + Zone DNS Write, or log into dash.cloudflare.com and set Security Level to Medium."
  exit 1
fi

auth_args=(-sS -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json")

cf() {
  local method="$1" path="$2" data="${3:-}"
  if [[ -n "$data" ]]; then
    curl "${auth_args[@]}" -X "$method" "${API}${path}" --data "$data"
  else
    curl "${auth_args[@]}" -X "$method" "${API}${path}"
  fi
}

json_get() {
  python3 -c "$1"
}

cf_ok() {
  python3 -c 'import json,sys; d=json.load(sys.stdin); raise SystemExit(0 if d.get("success") else 1)'
}

echo "== List zone ${ZONE_NAME} (account ${ACCOUNT_ID}) =="
zones_json="$(cf GET "/zones?name=${ZONE_NAME}&account.id=${ACCOUNT_ID}")"
echo "$zones_json" | json_get 'import json,sys; d=json.load(sys.stdin); print("success=", d.get("success"), "errors=", d.get("errors"), "result_count=", len(d.get("result") or []))'

zone_id="$(echo "$zones_json" | json_get 'import json,sys
d=json.load(sys.stdin)
r=d.get("result") or []
if not r:
    sys.exit("Could not resolve zone id — token may lack Zone Read")
print(r[0]["id"])')"
echo "zone_id=${zone_id}"

echo
echo "== BEFORE security_level =="
sec_before="$(cf GET "/zones/${zone_id}/settings/security_level")"
echo "$sec_before" | json_get 'import json,sys; print(json.dumps(json.load(sys.stdin), indent=2)[:4000])'
sec_value_before="$(echo "$sec_before" | json_get 'import json,sys; print((json.load(sys.stdin).get("result") or {}).get("value",""))')"
echo "security_level_before=${sec_value_before}"

echo
echo "== PATCH security_level=medium =="
sec_patch="$(cf PATCH "/zones/${zone_id}/settings/security_level" '{"value":"medium"}')"
echo "$sec_patch" | json_get 'import json,sys; print(json.dumps(json.load(sys.stdin), indent=2)[:4000])'
if ! echo "$sec_patch" | cf_ok; then
  echo "::error::Failed to set security_level to medium. Token likely lacks Zone Settings Write (zone:edit)."
  exit 1
fi

echo
echo "== AFTER security_level =="
sec_after="$(cf GET "/zones/${zone_id}/settings/security_level")"
sec_value_after="$(echo "$sec_after" | json_get 'import json,sys; print((json.load(sys.stdin).get("result") or {}).get("value",""))')"
echo "security_level_after=${sec_value_after}"

echo
echo "== Bot Fight Mode (leave off; do not enable) =="
bot_json="$(cf GET "/zones/${zone_id}/bot_management")"
echo "$bot_json" | json_get 'import json,sys; print(json.dumps(json.load(sys.stdin), indent=2)[:4000])'
fight_mode="$(echo "$bot_json" | json_get 'import json,sys
r=(json.load(sys.stdin).get("result") or {})
v=r.get("fight_mode")
print("true" if v is True else ("false" if v is False else "unknown"))')"
echo "bot_fight_mode=${fight_mode}"
if [[ "$fight_mode" == "true" ]]; then
  echo "Bot Fight Mode was ON; disabling it (required: leave it off)."
  bot_patch="$(cf PUT "/zones/${zone_id}/bot_management" '{"fight_mode":false}')"
  echo "$bot_patch" | json_get 'import json,sys; print(json.dumps(json.load(sys.stdin), indent=2)[:4000])'
  if ! echo "$bot_patch" | cf_ok; then
    echo "::error::Failed to turn Bot Fight Mode off."
    exit 1
  fi
else
  echo "Bot Fight Mode is not enabled. Leaving AI bot blocking unchanged."
fi

echo
echo "== Clerk CNAME proxy status (must be DNS-only / grey cloud) =="
dns_json="$(cf GET "/zones/${zone_id}/dns_records?per_page=100&type=CNAME")"
echo "$dns_json" | python3 -c '
import json,sys
d=json.load(sys.stdin)
print("dns_success=", d.get("success"), "errors=", d.get("errors"))
for rec in d.get("result") or []:
    print("%s\tproxied=%s\ttype=%s\tcontent=%s\tid=%s" % (
        rec.get("name"), rec.get("proxied"), rec.get("type"), rec.get("content"), rec.get("id")))
'

fail_dns=0
for host in "${CLERK_HOSTS[@]}"; do
  rec="$(HOST="$host" python3 -c '
import json,os,sys
d=json.load(sys.stdin)
host=os.environ["HOST"]
matches=[r for r in (d.get("result") or []) if r.get("name")==host]
print(json.dumps(matches[0]) if matches else "")
' <<<"$dns_json")"
  if [[ -z "$rec" ]]; then
    echo "::warning::No CNAME found for ${host}"
    continue
  fi
  rec_id="$(echo "$rec" | json_get 'import json,sys; print(json.load(sys.stdin)["id"])')"
  proxied="$(echo "$rec" | json_get 'import json,sys; print(json.load(sys.stdin).get("proxied"))')"
  content="$(echo "$rec" | json_get 'import json,sys; print(json.load(sys.stdin).get("content"))')"
  echo "record ${host} id=${rec_id} proxied=${proxied} content=${content}"
  if [[ "$proxied" == "True" ]]; then
    echo "Unproxying ${host} (orange -> grey cloud)"
    patch="$(cf PATCH "/zones/${zone_id}/dns_records/${rec_id}" '{"proxied":false}')"
    echo "$patch" | json_get 'import json,sys; print(json.dumps(json.load(sys.stdin), indent=2)[:2000])'
    if ! echo "$patch" | cf_ok; then
      echo "::error::Failed to set ${host} DNS-only. Token likely lacks Zone DNS Edit."
      fail_dns=1
    fi
  else
    echo "Already DNS-only: ${host}"
  fi
done

if [[ "$fail_dns" -ne 0 ]]; then
  exit 1
fi

echo
echo "== HTTP probe (datacenter curl may still be challenged) =="
for url in "https://accounts.www.${ZONE_NAME}/sign-in" "https://www.${ZONE_NAME}/"; do
  echo "--- ${url} ---"
  curl -sI "$url" | python3 -c '
import sys
lines=sys.stdin.read().splitlines()
keep=[ln for ln in lines if ln.lower().startswith(("http/", "http/2", "cf-mitigated", "server:", "location:", "cf-ray:", "content-type:"))]
print("\n".join(keep) if keep else "\n".join(lines[:8]))
'
done

echo
echo "Done. security_level ${sec_value_before} -> ${sec_value_after}; bot_fight_mode=${fight_mode}"
