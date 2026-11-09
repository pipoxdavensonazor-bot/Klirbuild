import { describe, expect, it } from "vitest";
import {
  CONNECT_API_BASE,
  connectAmountHtg,
  connectIdempotencyKey,
  connectPaymentUrl,
  connectReferenceId,
  connectReturnUrl,
  connectWebhookUrl,
  decideConnectStatus,
  hmacSha256Hex,
  parseConnectWebhookEvent,
  redactConnectSecrets,
  verifyConnectWebhookSignature,
} from "../../supabase/functions/_shared/moncash-connect.ts";
import { readMoncashBrowserReturn } from "./moncash-return.ts";

const ORDER = "11111111-1111-4111-8111-111111111111";

describe("MonCash Connect contract", () => {
  it("uses the documented Connect host and not Digicel", () => {
    expect(CONNECT_API_BASE).toBe("https://api.moncashconnect.com/v1");
    expect(CONNECT_API_BASE.includes("digicel")).toBe(false);
    expect(connectWebhookUrl(null)).toBe(
      "https://whybbqeeqpkbkatnkjjc.supabase.co/functions/v1/moncash-payment/webhook",
    );
  });

  it("accepts whole HTG from 1 to 100000 and rejects the rest", () => {
    expect(connectAmountHtg(500)).toEqual({ ok: true, amount: 500 });
    expect(connectAmountHtg("500.00")).toEqual({ ok: true, amount: 500 });
    expect(connectAmountHtg(199.99).ok).toBe(false);
    expect(connectAmountHtg(0).ok).toBe(false);
    expect(connectAmountHtg(100_001)).toEqual({ ok: false, reason: "above_documented_max" });
  });

  it("keeps an order UUID as referenceId and builds an https return URL", () => {
    expect(connectReferenceId(ORDER)).toBe(ORDER);
    expect(connectReferenceId("order 123")).toBeNull();
    expect(connectIdempotencyKey(ORDER)).toBe(ORDER);
    expect(connectReturnUrl(ORDER)).toBe(
      `https://klirline.com/?checkout=moncash_return&order_id=${ORDER}`,
    );
  });

  it("allows only documented payment URL hosts", () => {
    expect(connectPaymentUrl("https://pay.moncashconnect.com/c/abc123")).toContain("pay.moncashconnect.com");
    expect(connectPaymentUrl("https://moncashconnect.com/sim/order?p=short")).toContain("/sim/");
    expect(connectPaymentUrl("https://moncashbutton.digicelgroup.com/Moncash-middleware/Payment/Redirect?token=abc")).toBeNull();
    expect(connectPaymentUrl("http://pay.moncashconnect.com/c/abc")).toBeNull();
  });
});

describe("status is not the browser return", () => {
  it("settles only a completed pay-status for the same reference and amount", () => {
    expect(decideConnectStatus({
      reference: ORDER,
      status: "completed",
      amount: 500,
      expectedReference: ORDER,
      expectedAmount: 500,
    })).toBe("settle");
    expect(decideConnectStatus({
      reference: ORDER,
      status: "pending",
      amount: 500,
      expectedReference: ORDER,
      expectedAmount: 500,
    })).toBe("not_paid");
    expect(decideConnectStatus({
      reference: ORDER,
      status: "failed",
      amount: 500,
      expectedReference: ORDER,
      expectedAmount: 500,
    })).toBe("failed");
    expect(decideConnectStatus({
      reference: ORDER,
      status: "completed",
      amount: 499,
      expectedReference: ORDER,
      expectedAmount: 500,
    })).toBe("mismatch");
    expect(decideConnectStatus({
      reference: "other",
      status: "completed",
      amount: 500,
      expectedReference: ORDER,
      expectedAmount: 500,
    })).toBe("mismatch");
  });

  it("reads reference from the return query without a paid flag", () => {
    const params = new URLSearchParams(
      `checkout=moncash_return&reference=${ORDER}&error=true&cancelled=true&paid=1`,
    );
    const parsed = readMoncashBrowserReturn(params, null, null);
    expect(parsed).toEqual({ orderId: ORDER, transactionId: null, guestToken: null });
    expect(parsed && "paid" in parsed).toBe(false);
  });
});

describe("webhook signature", () => {
  const secret = "whsec_test_secret";
  const body = JSON.stringify({
    event: "payment.completed",
    reference: ORDER,
    amount: 500,
    status: "completed",
    completedAt: "2026-05-05T14:21:18.000Z",
  });

  it("accepts V1 HMAC of the raw body inside the 5 minute window", async () => {
    const now = 1_700_000_000;
    const sig = `sha256=${await hmacSha256Hex(secret, body)}`;
    const result = await verifyConnectWebhookSignature({
      rawBody: body,
      signature: sig,
      signatureV2: null,
      timestamp: String(now),
      secret,
      nowSeconds: now + 10,
    });
    expect(result).toEqual({ ok: true });
    expect(parseConnectWebhookEvent(body)?.event).toBe("payment.completed");
  });

  it("prefers V2 and rejects a stale timestamp or a bad signature", async () => {
    const now = 1_700_000_000;
    const timestamp = String(now);
    const v2 = `sha256=${await hmacSha256Hex(secret, `${timestamp}.${body}`)}`;
    expect(await verifyConnectWebhookSignature({
      rawBody: body,
      signature: "sha256=deadbeef",
      signatureV2: v2,
      timestamp,
      secret,
      nowSeconds: now,
    })).toEqual({ ok: true });
    expect(await verifyConnectWebhookSignature({
      rawBody: body,
      signature: `sha256=${await hmacSha256Hex(secret, body)}`,
      signatureV2: null,
      timestamp,
      secret,
      nowSeconds: now + 301,
    })).toEqual({ ok: false, reason: "timestamp" });
    expect(await verifyConnectWebhookSignature({
      rawBody: body,
      signature: "sha256=00",
      signatureV2: null,
      timestamp,
      secret,
      nowSeconds: now,
    })).toEqual({ ok: false, reason: "signature" });
  });

  it("redacts Connect key material", () => {
    const cleaned = redactConnectSecrets("Bearer sk_test_proj_abc whsec_xyz");
    expect(cleaned).not.toContain("abc");
    expect(cleaned).not.toContain("xyz");
  });
});
