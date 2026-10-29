import { parseNumberInput } from "./number-input";
import { t } from "../i18n";
import { requireValue } from "./error";
export interface TankGeometryInput {
  lengthCm?: unknown;
  widthCm?: unknown;
  heightCm?: unknown;
  volumeLitres?: unknown;
  hasSump?: boolean;
  sumpVolumeLitres?: unknown;
  hasCanister?: boolean;
}
function numberOrNull(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  )
    return null;
  requireValue(
    typeof value === "number" || typeof value === "string",
    t("validation.invalidDimensionOrVolumeValue"),
  );
  return parseNumberInput(String(value));
}
export function calculateTankVolume(
  length: unknown,
  width: unknown,
  height: unknown,
): number | null {
  const dimensions = [length, width, height].map(numberOrNull);
  if (dimensions.every((d) => d === null)) return null;
  requireValue(
    dimensions.every(
      (d) => d !== null && Number.isFinite(d) && d > 0 && d <= 10000,
    ),
    t("validation.enterAllThreeDimensionsInCmEachMust"),
  );
  const litres = (dimensions[0]! * dimensions[1]! * dimensions[2]!) / 1000;
  requireValue(
    litres > 0 && litres <= 100000,
    t("validation.volumeMustBeGreaterThan0AndNo"),
  );
  return Number(litres.toPrecision(12));
}
export function normalizeTankGeometry(input: TankGeometryInput) {
  requireValue(
    input.hasSump === undefined || typeof input.hasSump === "boolean",
    t("validation.invalidSumpInformation"),
  );
  requireValue(
    input.hasCanister === undefined || typeof input.hasCanister === "boolean",
    t("validation.invalidCanisterInformation"),
  );
  const lengthCm = numberOrNull(input.lengthCm),
    widthCm = numberOrNull(input.widthCm),
    heightCm = numberOrNull(input.heightCm);
  const calculated = calculateTankVolume(lengthCm, widthCm, heightCm);
  const volumeLitres = calculated ?? numberOrNull(input.volumeLitres);
  requireValue(
    volumeLitres === null ||
      (Number.isFinite(volumeLitres) &&
        volumeLitres > 0 &&
        volumeLitres <= 100000),
    t("validation.volumeMustBeGreaterThan0AndNo"),
  );
  const hasSump = input.hasSump ?? false,
    hasCanister = input.hasCanister ?? false;
  const sumpVolumeLitres = hasSump
    ? numberOrNull(input.sumpVolumeLitres)
    : null;
  requireValue(
    !hasSump ||
      (sumpVolumeLitres !== null &&
        Number.isFinite(sumpVolumeLitres) &&
        sumpVolumeLitres > 0 &&
        sumpVolumeLitres <= 100000),
    t("messages.enterASumpVolumeGreaterThan0And"),
  );
  return {
    lengthCm,
    widthCm,
    heightCm,
    volumeLitres,
    hasSump,
    sumpVolumeLitres,
    hasCanister,
  };
}
export function totalTankVolume(tank: {
  volumeLitres: number | null;
  hasSump?: boolean;
  sumpVolumeLitres?: number | null;
}): number | null {
  if (tank.volumeLitres === null) return null;
  if (
    tank.hasSump &&
    (tank.sumpVolumeLitres === null || tank.sumpVolumeLitres === undefined)
  )
    return null;
  return Number(
    (
      tank.volumeLitres + (tank.hasSump ? tank.sumpVolumeLitres! : 0)
    ).toPrecision(12),
  );
}
