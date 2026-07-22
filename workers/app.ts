/**
 * Custom OpenNext Worker — reuses the generated fetch handler and adds Cron Triggers.
 * @see https://opennext.js.org/cloudflare/howtos/custom-worker
 */

// @ts-expect-error `.open-next/worker.js` is generated at build time
import { default as handler } from "../.open-next/worker.js";

const CRON_BY_EXPRESSION: Record<string, string> = {
  "0 13 * * *": "/api/cron/automations",
  "15 * * * *": "/api/cron/recurring-invoices",
  "0 7 * * *": "/api/cron/backups",
};

async function invokeCron(env: CloudflareEnv, path: string) {
  const secret = env.CRON_SECRET?.trim();
  const headers = new Headers({ "content-type": "application/json" });
  if (secret) headers.set("authorization", `Bearer ${secret}`);

  const base =
    env.NEXT_PUBLIC_APP_URL ||
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL?.trim()) ||
    "https://klirbuild.workers.dev";

  const url = new URL(path, base.endsWith("/") ? base : `${base}/`);
  const init: RequestInit = { method: "POST", headers };

  if (env.WORKER_SELF_REFERENCE) {
    return env.WORKER_SELF_REFERENCE.fetch(url.toString(), init);
  }
  return fetch(url.toString(), init);
}

const worker = {
  fetch: handler.fetch as ExportedHandlerFetchHandler<CloudflareEnv>,

  async scheduled(controller: ScheduledController, env: CloudflareEnv, ctx: ExecutionContext) {
    const path = CRON_BY_EXPRESSION[controller.cron] ?? "/api/cron/automations";
    ctx.waitUntil(
      invokeCron(env, path)
        .then(async (res) => {
          const text = await res.text().catch(() => "");
          console.log(`[cron] ${controller.cron} → ${path} ${res.status} ${text.slice(0, 200)}`);
        })
        .catch((err: unknown) => {
          console.error(`[cron] ${controller.cron} → ${path} failed`, err);
        })
    );
  },
};

export default worker;

// Required when DO queue / tag cache are enabled in open-next config
// @ts-expect-error generated at build time
export { DOQueueHandler, DOShardedTagCache } from "../.open-next/worker.js";
