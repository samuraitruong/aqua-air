import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateTankVolume,
  totalTankVolume,
  normalizeTankGeometry,
} from "../src/domain/tank-volume";
import { validateTank } from "../src/domain/validation";
const tank = {
  id: "t",
  name: "Bể A",
  volumeLitres: null,
  waterType: "freshwater" as const,
  groupName: "",
  description: "",
  coverPhotoId: null,
  archivedAt: null,
  createdAt: "2026-10-29T00:00:00Z",
  updatedAt: "2026-10-29T00:00:00Z",
};
test("cm dimensions calculate litres with locale decimal input", () => {
  assert.equal(calculateTankVolume(100, 40, 50), 200);
  assert.equal(calculateTankVolume("60,5", 30, 40), 72.6);
  assert.equal(calculateTankVolume("", "", ""), null);
  assert.throws(() => calculateTankVolume(60, "", 40));
  assert.throws(() => calculateTankVolume(60, 0, 40));
  assert.throws(() => calculateTankVolume(-1, 30, 40));
  assert.throws(() => calculateTankVolume("NaN", 30, 40));
});
test("dimensions override stale manual volume and sump and canister can coexist", () => {
  const next = validateTank({
    ...tank,
    volumeLitres: 999,
    lengthCm: 100,
    widthCm: 40,
    heightCm: 50,
    hasSump: true,
    sumpVolumeLitres: 60,
    hasCanister: true,
  });
  assert.equal(next.volumeLitres, 200);
  assert.equal(next.hasSump, true);
  assert.equal(next.hasCanister, true);
  assert.equal(totalTankVolume(next), 260);
});
test("legacy tank volume is retained when dimensions are unknown", () => {
  const legacy = normalizeTankGeometry({ volumeLitres: 60 });
  assert.equal(legacy.volumeLitres, 60);
  assert.equal(legacy.lengthCm, null);
  assert.equal(legacy.hasSump, false);
  assert.equal(legacy.hasCanister, false);
  assert.equal(
    totalTankVolume({ ...legacy, hasSump: true, sumpVolumeLitres: 20 }),
    80,
  );
  assert.equal(
    totalTankVolume({
      ...legacy,
      volumeLitres: null,
      hasSump: true,
      sumpVolumeLitres: 20,
    }),
    null,
  );
});
test("sump requires valid litres when enabled and is cleared when disabled", () => {
  assert.throws(() => normalizeTankGeometry({ hasSump: true }));
  assert.throws(() =>
    normalizeTankGeometry({ hasSump: true, sumpVolumeLitres: 0 }),
  );
  assert.throws(() =>
    normalizeTankGeometry({ hasSump: true, sumpVolumeLitres: 100001 }),
  );
  assert.equal(
    normalizeTankGeometry({ hasSump: true, sumpVolumeLitres: "20,5" })
      .sumpVolumeLitres,
    20.5,
  );
  assert.equal(
    normalizeTankGeometry({ hasSump: false, sumpVolumeLitres: 20 })
      .sumpVolumeLitres,
    null,
  );
  assert.throws(() => normalizeTankGeometry({ hasSump: "yes" as any }));
});
