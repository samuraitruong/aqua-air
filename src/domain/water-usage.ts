import type { WaterRate } from "./models";
import { requireValue } from "./error";
import { t, getLocale } from "../i18n";
export const waterCurrencies = [
  "AUD",
  "VND",
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "NZD",
  "CHF",
  "CNY",
  "JPY",
  "INR",
  "KRW",
  "SGD",
  "HKD",
  "TWD",
  "IDR",
  "MYR",
  "THB",
  "PHP",
  "BDT",
  "PKR",
  "BRL",
  "MXN",
  "ARS",
  "CLP",
  "COP",
  "PEN",
  "ZAR",
  "NGN",
  "KES",
  "EGP",
  "SAR",
  "AED",
  "QAR",
  "KWD",
  "BHD",
  "OMR",
  "ILS",
  "TRY",
  "RUB",
  "UAH",
  "PLN",
  "CZK",
  "HUF",
  "RON",
  "SEK",
  "NOK",
  "DKK",
] as const;
export interface MonthlyWaterUsage {
  litres: number;
  changes: number;
  missing: number;
  estimated: number;
}
export function validateWaterRate(value: unknown): asserts value is WaterRate {
  const r = value as WaterRate;
  requireValue(
    r &&
      typeof r === "object" &&
      typeof r.amount === "number" &&
      Number.isFinite(r.amount) &&
      r.amount >= 0 &&
      r.amount <= 1e12 &&
      waterCurrencies.includes(r.currency as any) &&
      (r.perLitres === 1 || r.perLitres === 1000),
    t("water.invalidRate"),
  );
}
export function waterCost(litres: number, rate: WaterRate): number {
  return (litres * rate.amount) / rate.perLitres;
}
export function formatWaterCost(litres: number, rate: WaterRate): string {
  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: rate.currency,
    currencyDisplay: "code",
  }).format(waterCost(litres, rate));
}
