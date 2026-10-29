import { getLocale } from "../i18n";
/** Reference's compact date, retaining the locale's day/month order. */
export function shortDate(date: string) {
  return new Intl.DateTimeFormat(getLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .formatToParts(new Date(date.length === 10 ? date + "T12:00:00" : date))
    .filter((part) => part.type === "day" || part.type === "month")
    .map((part) => part.value)
    .join("/");
}
