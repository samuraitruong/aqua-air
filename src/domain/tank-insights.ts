import { parameterDefinition } from "./water-readings";
import { addDays, localDate } from "./dates";
import type { AppData, WaterTarget } from "./models";
export function targetStatus(
  value: number,
  target?: Pick<WaterTarget, "lower" | "upper">,
): "below" | "within" | "above" | null {
  if (!target) return null;
  if (target.lower !== null && value < target.lower) return "below";
  if (target.upper !== null && value > target.upper) return "above";
  return "within";
}
export function isStale(timestamp: string, days: number, now = new Date()) {
  return now.getTime() - Date.parse(timestamp) > days * 86400000;
}
export function chartRange(days: number, now = new Date()) {
  const end = localDate(now);
  return { start: addDays(end, -(days - 1)), end };
}
export function samplePoints<T>(points: T[], limit = 200): T[] {
  if (points.length <= limit) return points;
  return Array.from(
    { length: limit },
    (_, i) => points[Math.round((i * (points.length - 1)) / (limit - 1))]!,
  );
}
export function presetFields(
  selected: string[],
  values: Record<string, string>,
  all: string[],
) {
  const visible = new Set([
    ...selected,
    ...all.filter((k) => values[k]?.trim()),
  ]);
  return [...visible].filter((k) => all.includes(k));
}
export function collectReferencedPhotos(d: AppData) {
  const used = new Set([
    ...d.tanks.map((t) => t.coverPhotoId),
    ...d.journalEntries.map((j) => j.photoId),
  ]);
  d.photos = d.photos.filter((p) => used.has(p.id));
}

export function matchingTarget(
  d: AppData,
  tankId: string,
  key: string,
  unit: string,
) {
  const target = d.waterTargets.find(
    (t) => t.tankId === tankId && t.parameterKey === key,
  );
  if (!target) return;
  const definition = parameterDefinition(key, d.waterParameters, tankId);
  return definition.unit === unit ? target : undefined;
}
