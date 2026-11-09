/**
 * Identifiers carried on the MonCash browser return.
 * The query string is not a payment receipt — the server confirms via Retrieve*.
 */

const CHECKOUTS = new Set(["moncash_return", "moncash_success"]);
const ORDER_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TRANSACTION_ID = /^[0-9]{4,32}$/;

export type PendingWallet = { orderId?: string; method?: string } | null;

export type MoncashBrowserReturn = {
  orderId: string | null;
  transactionId: string | null;
  guestToken: string | null;
};

export function readMoncashBrowserReturn(
  params: URLSearchParams,
  pending: PendingWallet,
  guestToken: string | null,
): MoncashBrowserReturn | null {
  const checkout = params.get("checkout");
  if (!checkout || !CHECKOUTS.has(checkout)) return null;

  const queryOrder = params.get("order_id");
  const pendingOrder = pending?.method === "moncash" ? pending.orderId ?? null : null;
  const orderId = [queryOrder, pendingOrder].find((value) =>
    typeof value === "string" && ORDER_UUID.test(value)
  ) ?? null;

  const rawTx = params.get("transactionId");
  const transactionId = rawTx && TRANSACTION_ID.test(rawTx.trim()) ? rawTx.trim() : null;

  return { orderId, transactionId, guestToken };
}
