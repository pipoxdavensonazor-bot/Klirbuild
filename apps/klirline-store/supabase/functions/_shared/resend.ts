/** Shared Resend API helper for Klirline Store edge functions. */

export type ResendPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export function isResendConfigured(): boolean {
  return Boolean(Deno.env.get("RESEND_API_KEY")?.trim());
}

export async function sendResendEmail(
  payload: ResendPayload,
): Promise<{ ok: boolean; id?: string; error?: string; skipped?: boolean }> {
  const apiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!apiKey) {
    return { ok: false, skipped: true, error: "RESEND_API_KEY manquant" };
  }

  const from =
    Deno.env.get("RESEND_FROM")?.trim() ||
    "Klirline Store <noreply@klirline.ca>";

  const to = Array.isArray(payload.to) ? payload.to : [payload.to];
  const recipients = to.map((e) => e.trim()).filter(Boolean);
  if (!recipients.length) {
    return { ok: false, error: "Destinataire email manquant" };
  }

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg =
        typeof body === "object" && body && "message" in body
          ? String((body as { message: unknown }).message)
          : `Resend HTTP ${r.status}`;
      console.error("resend failed", msg);
      return { ok: false, error: msg };
    }

    const id =
      typeof body === "object" && body && "id" in body
        ? String((body as { id: unknown }).id)
        : undefined;
    return { ok: true, id };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("resend exception", message);
    return { ok: false, error: message };
  }
}
