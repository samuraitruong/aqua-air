import { UserFacingError } from "./error";
import { getLocale } from "../i18n";
import { t as tr } from "../i18n";
const DAY = 86400000;
export function isDate(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < "1900-01-01" ||
    value > "9999-12-31"
  )
    return false;
  const d = new Date(value + "T12:00:00Z");
  return Number.isFinite(d.valueOf()) && d.toISOString().slice(0, 10) === value;
}
export function addDays(date: string, n: number): string {
  if (!isDate(date) || !Number.isInteger(n))
    throw new UserFacingError("validation.invalidDate");
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  const result = d.toISOString().slice(0, 10);
  if (!isDate(result))
    throw new UserFacingError("messages.theDateIsOutsideTheSupportedRange");
  return result;
}
export function differenceDays(a: string, b: string): number {
  if (!isDate(a) || !isDate(b))
    throw new UserFacingError("validation.invalidDate");
  return Math.round(
    (Date.parse(a + "T12:00:00Z") - Date.parse(b + "T12:00:00Z")) / DAY,
  );
}
export function localDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function localTime(date: Date = new Date()): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
export function atLocalTime(date: string, time: string): Date {
  if (!isDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new UserFacingError("validation.invalidDateTime");
  return new Date(`${date}T${time}:00`);
}
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}
export function formatDate(
  date: string | null,
  options?: Intl.DateTimeFormatOptions,
): string {
  return date
    ? new Intl.DateTimeFormat(
        getLocale(),
        options ?? {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        },
      ).format(new Date(date.length === 10 ? date + "T12:00:00" : date))
    : tr("activity.notRecorded");
}
export function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d{1,3})?Z$/.test(
      value,
    ) &&
    isDate(value.slice(0, 10)) &&
    Number.isFinite(Date.parse(value))
  );
}
