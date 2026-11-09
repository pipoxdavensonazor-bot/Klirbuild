import { describe, expect, it } from "vitest";
import {
  KLIRLINE_SUPABASE_URL,
  MONCASH_ALERT_URL,
  alertRedirect,
  amountsMatch,
  decideMoncashSettlement,
  gatewayModeMatches,
  interpretSettleRace,
  moncashAmountHtg,
  moncashCancelUrl,
  moncashEnvironment,
  moncashHosts,
  moncashNotifyUrl,
  orderCurrencyIsHtg,
  paymentRedirectUrl,
  readNotifyTransactionId,
  redactSensitive,
  type OrderPaymentState,
} from "../../supabase/functions/_shared/moncash-protocol.ts";
import { readMoncashBrowserReturn } from "./moncash-return.ts";

const ORDER = "11111111-1111-4111-8111-111111111111";

function order(partial: Partial<OrderPaymentState> = {}): OrderPaymentState {
  return {
    id: ORDER,
    status: "pending",
    total: 250,
    paymentMethod: "moncash",
    paymentCurrency: "HTG",
    moncashOrderId: ORDER,
    moncashTransactionId: null,
    moncashAmountHtg: 250,
    ...partial,
  };
}

const paid = {
  reference: ORDER,
  transaction_id: "12874820",
  cost: 250,
  message: "successful",
  payer: "50937007294",
};

describe("moncash hosts and urls", () => {
  it("stays on sandbox unless MONCASH_ENV is exactly live", () => {
    expect(moncashEnvironment(undefined)).toBe("sandbox");
    expect(moncashEnvironment("sandbox")).toBe("sandbox");
    expect(moncashEnvironment("LIVE")).toBe("sandbox");
    expect(moncashEnvironment("live")).toBe("live");
    expect(moncashHosts("sandbox").rest).toBe(
      "https://sandbox.moncashbutton.digicelgroup.com/Api",
    );
    expect(moncashHosts("live").gateway).toBe(
      "https://moncashbutton.digicelgroup.com/Moncash-middleware",
    );
  });

  it("derives the KlirlineCore notify URL and the klirline.com alert URL", () => {
    expect(moncashNotifyUrl(null)).toBe(
      `${KLIRLINE_SUPABASE_URL}/functions/v1/moncash-payment/notify`,
    );
    expect(moncashNotifyUrl("https://whybbqeeqpkbkatnkjjc.supabase.co/")).toBe(
      "https://whybbqeeqpkbkatnkjjc.supabase.co/functions/v1/moncash-payment/notify",
    );
    expect(MONCASH_ALERT_URL).toBe("https://klirline.com/?checkout=moncash_return");
    expect(moncashCancelUrl()).toBe("https://klirline.com/?checkout=moncash_cancel");
  });
});

describe("integer HTG", () => {
  it("accepts whole gourdes and rejects decimals", () => {
    expect(moncashAmountHtg(250)).toEqual({ ok: true, amount: 250 });
    expect(moncashAmountHtg("250.00")).toEqual({ ok: true, amount: 250 });
    expect(moncashAmountHtg(199.99).ok).toBe(false);
    expect(moncashAmountHtg(0).ok).toBe(false);
    expect(moncashAmountHtg(-10).ok).toBe(false);
    expect(orderCurrencyIsHtg(null)).toBe(true);
    expect(orderCurrencyIsHtg("HTG")).toBe(true);
    expect(orderCurrencyIsHtg("USD")).toBe(false);
    expect(amountsMatch("250", 250)).toBe(true);
    expect(amountsMatch(249.5, 250)).toBe(false);
  });
});

describe("settlement", () => {
  it("settles only a successful retrieve that matches order, amount and HTG", () => {
    expect(decideMoncashSettlement(order(), paid)).toEqual({
      action: "settle",
      transactionId: "12874820",
      amount: 250,
    });
  });

  it("does not treat a transaction id, URL or non-success message as paid", () => {
    expect(decideMoncashSettlement(order(), { ...paid, message: "pending" }).action).toBe("reject");
    expect(decideMoncashSettlement(order(), { transaction_id: "12874820" }).action).toBe("reject");
    expect(decideMoncashSettlement(order(), null).action).toBe("reject");
    expect(decideMoncashSettlement(order(), { ...paid, message: "Successful" }).action).toBe("reject");
  });

  it("rejects amount, currency, reference and other payment methods", () => {
    expect(decideMoncashSettlement(order(), { ...paid, cost: 249 }).action).toBe("reject");
    expect(decideMoncashSettlement(order({ paymentCurrency: "USD" }), paid)).toMatchObject({
      action: "reject",
      reason: "currency",
    });
    expect(decideMoncashSettlement(order(), { ...paid, reference: "other-order" })).toMatchObject({
      action: "reject",
      reason: "order_mismatch",
    });
    expect(decideMoncashSettlement(order({ paymentMethod: "stripe" }), paid)).toMatchObject({
      action: "reject",
      reason: "method",
    });
    expect(decideMoncashSettlement(order({ total: 10.5, moncashAmountHtg: null }), paid)).toMatchObject({
      action: "reject",
      reason: "not_integer",
    });
  });

  it("is idempotent and rejects a second transaction on a paid order", () => {
    const done = order({ status: "completed", moncashTransactionId: "12874820" });
    expect(decideMoncashSettlement(done, paid)).toEqual({ action: "already" });
    expect(
      decideMoncashSettlement(done, { ...paid, transaction_id: "99999999" }),
    ).toMatchObject({ action: "reject", reason: "duplicate_transaction" });
    expect(interpretSettleRace(true, null, "12874820")).toBe("settled");
    expect(interpretSettleRace(false, { status: "completed", moncashTransactionId: "12874820" }, "12874820")).toBe("already");
    expect(interpretSettleRace(false, { status: "completed", moncashTransactionId: "999" }, "12874820")).toBe("duplicate");
    expect(interpretSettleRace(false, { status: "pending", moncashTransactionId: null }, "12874820")).toBe("lost");
  });
});

describe("notify identifier", () => {
  it("reads transactionId and ignores paid flags in the query", async () => {
    const req = new Request(
      "https://whybbqeeqpkbkatnkjjc.supabase.co/functions/v1/moncash-payment/notify?transactionId=12874820&paid=1&status=successful",
    );
    expect(await readNotifyTransactionId(req)).toBe("12874820");
    const bad = new Request(
      "https://whybbqeeqpkbkatnkjjc.supabase.co/functions/v1/moncash-payment/notify?transactionId=not-a-number",
    );
    expect(await readNotifyTransactionId(bad)).toBeNull();
  });

  it("reads a form or json body without a signature header", async () => {
    const form = new Request("https://example.test/notify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "transactionId=2185608546",
    });
    expect(await readNotifyTransactionId(form)).toBe("2185608546");
    const json = new Request("https://example.test/notify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transactionId: "2160048483", payer: "50937007294" }),
    });
    expect(await readNotifyTransactionId(json)).toBe("2160048483");
  });
});

describe("redirect and redaction", () => {
  it("builds the gateway redirect only for a safe token", () => {
    expect(paymentRedirectUrl(moncashHosts("live").gateway, "abc+/=1234")).toBe(
      "https://moncashbutton.digicelgroup.com/Moncash-middleware/Payment/Redirect?token=abc%2B%2F%3D1234",
    );
    expect(paymentRedirectUrl(moncashHosts("live").gateway, "short")).toBeNull();
    expect(paymentRedirectUrl(moncashHosts("live").gateway, "bad token here")).toBeNull();
    expect(alertRedirect(ORDER, "12874820")).toBe(
      `https://klirline.com/?checkout=moncash_return&order_id=${ORDER}&transactionId=12874820`,
    );
  });

  it("rejects a gateway mode that contradicts the configured environment", () => {
    expect(gatewayModeMatches(undefined, "live")).toBe(true);
    expect(gatewayModeMatches("", "sandbox")).toBe(true);
    expect(gatewayModeMatches("sandbox", "live")).toBe(false);
    expect(gatewayModeMatches("live", "sandbox")).toBe(false);
    expect(gatewayModeMatches("production", "live")).toBe(true);
  });

  it("redacts credentials that must never reach a log or the browser", () => {
    const raw = 'Basic abcdefghijklmnop client_secret=super Bearer eyJ.token "access_token":"secret-token"';
    const cleaned = redactSensitive(raw);
    expect(cleaned).not.toContain("super");
    expect(cleaned).not.toContain("abcdefghijklmnop");
    expect(cleaned).not.toContain("secret-token");
    expect(cleaned).toContain("[redacted]");
  });
});

describe("browser return", () => {
  it("extracts ids and does not carry a paid status", () => {
    const params = new URLSearchParams(
      "checkout=moncash_return&transactionId=12874820&paid=true&order_id=11111111-1111-4111-8111-111111111111",
    );
    const parsed = readMoncashBrowserReturn(params, null, "guest");
    expect(parsed).toEqual({
      orderId: ORDER,
      transactionId: "12874820",
      guestToken: "guest",
    });
    expect(parsed && "paid" in parsed).toBe(false);
    expect(readMoncashBrowserReturn(new URLSearchParams("checkout=stripe_success"), null, null)).toBeNull();
    expect(readMoncashBrowserReturn(new URLSearchParams("transactionId=12874820"), null, null)).toBeNull();
  });
});
