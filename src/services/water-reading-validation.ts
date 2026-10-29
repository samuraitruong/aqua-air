import type { AppData } from "../domain/models";
import { isDate, isTimestamp, normalize } from "../domain/dates";
import { requireValue } from "../domain/error";
import {
  parameterDefinition,
  validateWaterValue,
} from "../domain/water-readings";
import { t } from "../i18n";
export function validateWaterData(d: AppData) {
  const parameters = d.waterParameters ?? [],
    readings = d.waterReadings ?? [],
    values = d.waterValues ?? [];
  requireValue(
    Array.isArray(parameters) &&
      Array.isArray(readings) &&
      Array.isArray(values),
    t("readings.invalid"),
  );
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  for (const rows of [parameters, readings, values]) {
    const ids = new Set<string>();
    for (const row of rows) {
      requireValue(
        row && uuid.test(row.id) && !ids.has(row.id),
        t("readings.invalid"),
      );
      ids.add(row.id);
    }
  }
  const tanks = new Set(d.tanks.map((t) => t.id));
  const names = new Set<string>();
  for (const p of parameters) {
    requireValue(
      tanks.has(p.tankId) &&
        typeof p.name === "string" &&
        p.name.trim().length > 0 &&
        p.name.length <= 60 &&
        typeof p.unit === "string" &&
        p.unit.length <= 24 &&
        isTimestamp(p.createdAt) &&
        isTimestamp(p.updatedAt),
      t("readings.invalidParameter"),
    );
    const key = p.tankId + ":" + normalize(p.name);
    requireValue(!names.has(key), t("readings.duplicateParameter"));
    names.add(key);
  }
  for (const tankId of tanks)
    requireValue(
      parameters.filter((p) => p.tankId === tankId).length <= 30,
      t("readings.invalidParameter"),
    );
  const readingsById = new Map(readings.map((r) => [r.id, r]));
  const counts = new Map<string, number>();
  for (const v of values)
    counts.set(v.readingId, (counts.get(v.readingId) ?? 0) + 1);
  const keys = new Set<string>();
  for (const r of readings) {
    requireValue(
      tanks.has(r.tankId) &&
        isTimestamp(r.performedAt) &&
        Date.parse(r.performedAt) <= Date.now() &&
        isDate(r.performedLocalDate) &&
        isTimestamp(r.createdAt) &&
        isTimestamp(r.updatedAt) &&
        typeof r.notes === "string" &&
        r.notes.length <= 2000 &&
        typeof r.idempotencyKey === "string" &&
        r.idempotencyKey.length > 0 &&
        r.idempotencyKey.length <= 200 &&
        !keys.has(r.idempotencyKey),
      t("readings.invalid"),
    );
    keys.add(r.idempotencyKey);
    const count = counts.get(r.id) ?? 0;
    requireValue(count > 0 && count <= 50, t("readings.atLeastOne"));
  }
  const pairs = new Set<string>();
  for (const v of values) {
    const r = readingsById.get(v.readingId);
    requireValue(
      r && typeof v.parameterKey === "string",
      t("readings.invalid"),
    );
    const pair = v.readingId + ":" + v.parameterKey;
    requireValue(!pairs.has(pair), t("readings.invalid"));
    pairs.add(pair);
    const def = parameterDefinition(v.parameterKey, parameters, r.tankId);
    validateWaterValue(v.value, def);
    requireValue(
      v.nameSnapshot === def.name && v.unitSnapshot === def.unit,
      t("readings.invalid"),
    );
  }
}
