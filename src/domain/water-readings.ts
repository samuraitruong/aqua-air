import type { WaterParameter } from "./models";
import { requireValue } from "./error";
import { t } from "../i18n";
export const waterMetrics = [
  { key: "ph", label: "pH", unit: "", min: 0, max: 14 },
  { key: "temperature", label: "", unit: "°C", min: -100, max: 200 },
  { key: "nh3", label: "NH₃", unit: "mg/L", min: 0, max: 1e9 },
  { key: "nh4", label: "NH₄⁺", unit: "mg/L", min: 0, max: 1e9 },
  { key: "no2", label: "NO₂", unit: "mg/L", min: 0, max: 1e9 },
  { key: "no3", label: "NO₃", unit: "mg/L", min: 0, max: 1e9 },
  { key: "gh", label: "GH", unit: "°dGH", min: 0, max: 1e9 },
  { key: "kh", label: "KH", unit: "°dKH", min: 0, max: 1e9 },
  { key: "tds", label: "TDS", unit: "ppm", min: 0, max: 1e9 },
  { key: "po4", label: "PO₄", unit: "mg/L", min: 0, max: 1e9 },
  { key: "salinity", label: "", unit: "ppt", min: 0, max: 1e9 },
] as const;
export function waterParameterLabel(key: string, snapshot: string) {
  const metric = waterMetrics.find((m) => m.key === key);
  return metric
    ? metric.label ||
        t(
          metric.key === "temperature"
            ? "readings.temperature"
            : "readings.salinity",
        )
    : snapshot;
}
export function parameterDefinition(
  key: string,
  custom: WaterParameter[],
  tankId: string,
) {
  const builtin = waterMetrics.find((m) => m.key === key);
  if (builtin)
    return {
      name: builtin.key,
      unit: builtin.unit,
      min: builtin.min,
      max: builtin.max,
    };
  const p = custom.find((p) => p.id === key && p.tankId === tankId);
  requireValue(p, t("readings.invalidParameter"));
  return { name: p.name, unit: p.unit, min: -1e9, max: 1e9 };
}
export function validateWaterValue(
  value: unknown,
  definition: { min: number; max: number },
) {
  requireValue(
    typeof value === "number" &&
      Number.isFinite(value) &&
      value >= definition.min &&
      value <= definition.max,
    t("readings.invalidValue"),
  );
}
