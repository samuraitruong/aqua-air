import { test } from "node:test";
import assert from "node:assert/strict";
import {
  waterCsv,
  careCsv,
  reportHtml,
  csvCell,
} from "../src/domain/tank-reports";
import type { InsightRange, Tank } from "../src/domain/models";
const tank = {
  name: "<script>alert(1)</script>",
  description: "Tank & shrimp",
  volumeLitres: 100,
  hasSump: true,
  sumpVolumeLitres: 20,
} as Tank;
const data: InsightRange = {
  readings: [
    {
      id: "r",
      performedAt: "2026-10-30T12:00:00Z",
      performedLocalDate: "2026-10-30",
      notes: '=IMPORTXML("bad")',
    } as any,
  ],
  values: [
    {
      id: "v",
      readingId: "r",
      parameterKey: "ph",
      nameSnapshot: "ph",
      unitSnapshot: "",
      value: 7.2,
    },
  ],
  logs: [],
};
test("CSV quotes Unicode, commas and newlines; neutralizes formula text while preserving negative numeric values", () => {
  assert.equal(csvCell("=SUM(A1)"), '"\'=SUM(A1)"');
  assert.equal(csvCell(" \t+cmd"), '"\' \t+cmd"');
  assert.equal(csvCell(-2), "-2");
  assert.equal(csvCell('Bể, "Tép"\nA'), '"Bể, ""Tép""\nA"');
  const csv = waterCsv(data);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes("7.2"));
  assert.ok(csv.includes("2026-10-30T12:00:00Z"));
  assert.ok(csv.includes("'=IMPORTXML"));
  assert.equal(careCsv(data).trim().split("\r\n").length, 1);
});
test("print template escapes user content, includes all rows and no scripts/remote images", () => {
  const report = reportHtml(
    tank,
    {
      ...data,
      values: Array.from({ length: 40 }, (_, i) => ({
        ...data.values[0]!,
        id: String(i),
      })),
    },
    "2026-10-01",
    "2026-10-31",
  );
  assert.ok(report.includes("&lt;script&gt;"));
  assert.ok(!report.includes("<script>"));
  assert.ok(!report.includes("<img"));
  assert.equal((report.match(/7[.,]2/g) ?? []).length >= 40, true);
  assert.ok(report.includes("120"));
  assert.ok(report.includes("2026"));
});
