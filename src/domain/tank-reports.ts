import type { InsightRange, Tank } from "./models";
import { totalTankVolume } from "./tank-volume";
import { waterParameterLabel } from "./water-readings";
import { formatDate } from "./dates";
import { t, getLocale, getDirection, copy } from "../i18n";
export function csvCell(value: string | number | null | undefined): string {
  if (typeof value === "number") return String(value);
  let text = value == null ? "" : String(value);
  if (/^[\s\uFEFF]*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text))
    text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
function csv(rows: (string | number | null | undefined)[][]) {
  return (
    "\uFEFF" +
    rows.map((row) => row.map(csvCell).join(",")).join("\r\n") +
    "\r\n"
  );
}
export function waterCsv(data: InsightRange) {
  const readings = new Map(data.readings.map((r) => [r.id, r]));
  return csv([
    [
      "reading_id",
      "timestamp_utc",
      "local_date",
      "parameter_key",
      "parameter_name",
      "unit",
      "value",
      "notes",
    ],
    ...data.values.map((v) => {
      const r = readings.get(v.readingId)!;
      return [
        r.id,
        r.performedAt,
        r.performedLocalDate,
        v.parameterKey,
        waterParameterLabel(v.parameterKey, v.nameSnapshot),
        v.unitSnapshot,
        v.value,
        r.notes,
      ];
    }),
  ]);
}
export function careCsv(data: InsightRange) {
  return csv([
    [
      "activity_id",
      "timestamp_utc",
      "local_date",
      "activity_type",
      "title",
      "water_change_percent",
      "notes",
    ],
    ...data.logs.map((l) => [
      l.id,
      l.performedAt,
      l.performedLocalDate,
      l.activityType,
      l.titleSnapshot,
      l.percent,
      l.notes,
    ]),
  ]);
}
const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function reportHtml(
  tank: Tank,
  data: InsightRange,
  start: string,
  end: string,
) {
  const num = (n: number) =>
    new Intl.NumberFormat(getLocale(), { maximumSignificantDigits: 10 }).format(
      n,
    );
  const date = (d: string) =>
    formatDate(d, {
      year: "numeric",
      month: "short",
      day: "numeric",
      ...(d.length > 10
        ? { hour: "2-digit" as const, minute: "2-digit" as const }
        : {}),
    });
  const cell = (v: unknown) => `<td>${escape(v)}</td>`,
    row = (values: unknown[]) => `<tr>${values.map(cell).join("")}</tr>`;
  const readings = new Map(data.readings.map((r) => [r.id, r]));
  const table = (headers: string[], rows: string[]) =>
    rows.length
      ? `<table><thead><tr>${headers.map((h) => `<th>${escape(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`
      : `<p>${escape(t("insights.empty"))}</p>`;
  const stats = new Map<
    string,
    {
      name: string;
      unit: string;
      min: number;
      max: number;
      latest: number;
      count: number;
    }
  >();
  for (const v of data.values) {
    const key = JSON.stringify([v.parameterKey, v.unitSnapshot]);
    const old = stats.get(key);
    stats.set(key, {
      name: waterParameterLabel(v.parameterKey, v.nameSnapshot),
      unit: v.unitSnapshot,
      min: Math.min(old?.min ?? v.value, v.value),
      max: Math.max(old?.max ?? v.value, v.value),
      latest: v.value,
      count: (old?.count ?? 0) + 1,
    });
  }
  const capacity = totalTankVolume(tank);
  return `<!DOCTYPE html><html lang="${escape(getLocale())}" dir="${getDirection()}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font-family:-apple-system,Arial,sans-serif;color:#12394a;font-size:11px;line-height:1.5}h1{font-size:26px;color:#087f8c;margin-bottom:8px}h2{font-size:17px;margin-top:25px}p,td{white-space:pre-wrap;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:10px}th,td{padding:7px;border-bottom:1px solid #d6e6ea;text-align:start;vertical-align:top}th{background:#e6f5f8}thead{display:table-header-group}tr{break-inside:avoid}h2{break-after:avoid}.meta{color:#516b77}.brand{border-bottom:3px solid #087f8c;padding-bottom:12px}</style></head><body><div class="brand"><p>Aqua Air</p><h1>${escape(t("insights.reportTitle"))} · ${escape(tank.name)}</h1><p class="meta">${escape(date(start))} — ${escape(date(end))}</p></div><p>${escape(tank.description)}</p>${capacity != null ? `<p>${escape(num(capacity))} L</p>` : ""}<p>${escape(t("insights.count", { count: data.readings.length }))} · ${escape(t("insights.careCount", { count: data.logs.length }))}</p><h2>${escape(t("readings.title"))}</h2>${table(
    [t("insights.parameter"), t("insights.minMax"), t("readings.latest")],
    [...stats.values()].map((v) =>
      row([
        v.name + (v.unit ? ` (${v.unit})` : ""),
        `${num(v.min)} / ${num(v.max)}`,
        num(v.latest),
      ]),
    ),
  )}<h2>${escape(t("readings.history"))}</h2>${table(
    [
      t("insights.date"),
      t("insights.parameter"),
      t("insights.value"),
      t("insights.notes"),
    ],
    data.values.map((v) => {
      const r = readings.get(v.readingId)!;
      return row([
        date(r.performedAt),
        waterParameterLabel(v.parameterKey, v.nameSnapshot),
        num(v.value) + (v.unitSnapshot ? " " + v.unitSnapshot : ""),
        r.notes,
      ]);
    }),
  )}<h2>${escape(t("insights.careHistory"))}</h2>${table(
    [t("insights.date"), t("insights.activity"), t("insights.notes")],
    data.logs.map((l) =>
      row([
        date(l.performedAt),
        copy.activity[l.activityType] +
          (l.percent != null ? " " + num(l.percent) + "%" : ""),
        [l.titleSnapshot, l.notes].filter(Boolean).join("\n"),
      ]),
    ),
  )}<p class="meta">${escape(t("insights.exportHint"))}</p></body></html>`;
}
