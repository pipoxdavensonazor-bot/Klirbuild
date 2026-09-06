/**
 * Digicel MonCash REST (paiements plans KlirBuild).
 * @see apps/klirline-store/docs/moncash/MONCASH.md
 */

export type MonCashEnv = "sandbox" | "live";

export function getMonCashEnv(): MonCashEnv {
  const raw = (process.env.MONCASH_ENV || "sandbox").trim().toLowerCase();
  return raw === "live" || raw === "production" ? "live" : "sandbox";
}

export function isMonCashConfigured() {
  return Boolean(
    process.env.MONCASH_CLIENT_ID?.trim() && process.env.MONCASH_CLIENT_SECRET?.trim()
  );
}

function restHost(env: MonCashEnv) {
  return env === "live"
    ? "moncashbutton.digicelgroup.com/Api"
    : "sandbox.moncashbutton.digicelgroup.com/Api";
}

function gatewayBase(env: MonCashEnv) {
  return env === "live"
    ? "https://moncashbutton.digicelgroup.com/Moncash-middleware"
    : "https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware";
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.MONCASH_CLIENT_ID?.trim();
  const clientSecret = process.env.MONCASH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "MonCash non configuré. Ajoutez MONCASH_CLIENT_ID et MONCASH_CLIENT_SECRET."
    );
  }

  const env = getMonCashEnv();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`https://${restHost(env)}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "scope=read,write&grant_type=client_credentials",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MonCash auth échouée (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("MonCash: access_token manquant");
  return data.access_token;
}

export async function createMonCashPayment(input: {
  amountHtg: number;
  orderId: string;
}) {
  const amount = Math.round(input.amountHtg);
  if (!Number.isFinite(amount) || amount < 1) {
    throw new Error("Montant MonCash invalide (HTG entier ≥ 1)");
  }

  const env = getMonCashEnv();
  const token = await getAccessToken();
  const res = await fetch(`https://${restHost(env)}/v1/CreatePayment`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ amount, orderId: input.orderId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MonCash CreatePayment échoué (${res.status}): ${text.slice(0, 400)}`);
  }

  const data = (await res.json()) as { payment_token?: { token?: string } };
  const paymentToken = data.payment_token?.token;
  if (!paymentToken) throw new Error("MonCash: token de paiement manquant");

  return {
    paymentToken,
    paymentUrl: `${gatewayBase(env)}/Payment/Redirect?token=${encodeURIComponent(paymentToken)}`,
  };
}

export async function retrieveMonCashOrderPayment(orderId: string) {
  const env = getMonCashEnv();
  const token = await getAccessToken();
  const res = await fetch(`https://${restHost(env)}/v1/RetrieveOrderPayment`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ orderId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `MonCash RetrieveOrderPayment échoué (${res.status}): ${text.slice(0, 400)}`
    );
  }

  const data = (await res.json()) as {
    payment?: {
      message?: string;
      cost?: number | string;
      transaction_id?: string | number;
    };
  };
  const payment = data.payment;
  const message = payment?.message ?? null;
  const costRaw = payment?.cost;
  const cost = costRaw == null || costRaw === "" ? null : Number(costRaw);

  return {
    successful: message === "successful",
    message,
    cost: Number.isFinite(cost as number) ? (cost as number) : null,
    transactionId:
      payment?.transaction_id != null ? String(payment.transaction_id) : null,
    raw: data,
  };
}
