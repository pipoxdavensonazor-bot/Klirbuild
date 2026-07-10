import type { CurrencyCode } from "@/lib/markets/regions";

/** Demo FX rates vs USD (illustrative — replace with live feed later) */
export const fxToUsd: Record<CurrencyCode, number> = {
  USD: 1,
  CAD: 0.73,
  HTG: 0.0076,
  DOP: 0.017,
  JMD: 0.0064,
  TTD: 0.15,
  BBD: 0.5,
  XCD: 0.37,
};

export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode
) {
  if (from === to) return amount;
  const usd = amount * fxToUsd[from];
  return Math.round((usd / fxToUsd[to]) * 100) / 100;
}

export function formatMoney(
  amount: number,
  currency: CurrencyCode = "CAD",
  locale = "en-CA"
) {
  const localeMap: Record<CurrencyCode, string> = {
    CAD: "en-CA",
    USD: "en-US",
    HTG: "fr-HT",
    DOP: "es-DO",
    JMD: "en-JM",
    TTD: "en-TT",
    BBD: "en-BB",
    XCD: "en-LC",
  };
  try {
    return new Intl.NumberFormat(locale || localeMap[currency], {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "HTG" || currency === "JMD" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
