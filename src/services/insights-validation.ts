import type { AppData } from "../domain/models";
import { requireValue } from "../domain/error";
import { t } from "../i18n";
import { isTimestamp, isDate, normalize } from "../domain/dates";
import {
  parameterDefinition,
  validateWaterValue,
} from "../domain/water-readings";
export const insightCollections = [
  "readingPresets",
  "waterTargets",
  "tankPreferences",
  "journalEntries",
] as const;
export function validateInsightsData(d: AppData) {
  const check = (ok: unknown) => requireValue(ok, t("insights.invalid"));
  const ids = new Set<string>(),
    names = new Set<string>(),
    defaults = new Set<string>(),
    targets = new Set<string>(),
    prefs = new Set<string>();
  for (const key of insightCollections) {
    check(Array.isArray(d[key]));
    for (const row of d[key]) {
      check(
        row &&
          typeof row === "object" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            row.id,
          ) &&
          !ids.has(row.id),
      );
      ids.add(row.id);
      check(
        d.tanks.some((t) => t.id === row.tankId) &&
          isTimestamp(row.createdAt) &&
          isTimestamp(row.updatedAt),
      );
    }
  }
  for (const p of d.readingPresets) {
    check(
      typeof p.name === "string" &&
        p.name.trim().length > 0 &&
        p.name.trim().length <= 60 &&
        typeof p.isDefault === "boolean",
    );
    const key = p.tankId + ":" + normalize(p.name);
    check(!names.has(key));
    names.add(key);
    if (p.isDefault) {
      check(!defaults.has(p.tankId));
      defaults.add(p.tankId);
    }
    check(d.readingPresets.filter((x) => x.tankId === p.tankId).length <= 10);
    check(
      Array.isArray(p.parameterKeys) &&
        p.parameterKeys.length > 0 &&
        p.parameterKeys.length <= 41 &&
        new Set(p.parameterKeys).size === p.parameterKeys.length,
    );
    p.parameterKeys.forEach((k) => {
      check(typeof k === "string");
      parameterDefinition(k, d.waterParameters, p.tankId);
    });
  }
  for (const r of d.waterTargets) {
    const key = r.tankId + ":" + r.parameterKey;
    check(!targets.has(key));
    targets.add(key);
    const def = parameterDefinition(
      r.parameterKey,
      d.waterParameters,
      r.tankId,
    );
    check(r.lower !== null || r.upper !== null);
    if (r.lower !== null) validateWaterValue(r.lower, def);
    if (r.upper !== null) validateWaterValue(r.upper, def);
    check(r.lower === null || r.upper === null || r.lower <= r.upper);
  }
  for (const p of d.tankPreferences) {
    check(!prefs.has(p.tankId));
    prefs.add(p.tankId);
    check(
      Number.isInteger(p.staleDays) && p.staleDays >= 1 && p.staleDays <= 365,
    );
  }
  for (const j of d.journalEntries) {
    check(
      isTimestamp(j.performedAt) &&
        Date.parse(j.performedAt) <= Date.now() &&
        isDate(j.performedLocalDate) &&
        typeof j.notes === "string" &&
        j.notes.length <= 2000 &&
        (j.photoId === null || d.photos.some((p) => p.id === j.photoId)),
    );
  }
}
