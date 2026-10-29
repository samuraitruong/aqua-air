import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { SqlStore, type SqlDriver } from "../src/repositories/store";
import { CareService } from "../src/services/care";
import { emptyData } from "../src/domain/models";
import {
  encodeBackup,
  decodeBackup,
  validateData,
} from "../src/services/backup-format";
import { waterCost, validateWaterRate } from "../src/domain/water-usage";
function setup() {
  const db = new DatabaseSync(":memory:");
  const driver: SqlDriver = {
    exec: async (s) => {
      db.exec(s);
    },
    all: async (s, ...p) => db.prepare(s).all(...p) as any,
    run: async (s, ...p) => {
      db.prepare(s).run(...p);
    },
  };
  const store = new SqlStore(driver);
  let n = 0;
  const care = new CareService(
    store,
    () => `id-${++n}`,
    () => "2026-10-29T10:00:00Z",
  );
  return { db, store, care, driver };
}
const tank = {
  name: "Water",
  description: "",
  volumeLitres: 100,
  hasSump: true,
  sumpVolumeLitres: 20,
  waterType: "freshwater" as const,
  groupName: "",
  coverPhotoId: null,
};
const log = (tankId: string, date = "2026-10-28", key = date) => ({
  tankId,
  activityType: "water_change" as const,
  scheduleId: null,
  percent: 25,
  performedAt: date + "T09:00:00Z",
  performedLocalDate: date,
  notes: "",
  nextDueOverrideDate: null,
  idempotencyKey: key,
});
test("monthly usage queries all history, uses local dates, includes archived tanks, and responds to edits/deletion", async () => {
  const { store, care } = setup();
  await store.init();
  const id = await care.createTank(tank);
  for (let n = 0; n < 45; n++)
    await care.saveLog(log(id, "2026-10-28", String(n)));
  await care.saveLog(log(id, "2026-09-30")); // excluded
  const edge = log(id, "2026-09-30", "edge");
  edge.performedLocalDate = "2026-10-01";
  await care.saveLog(edge);
  let m = await store.monthlyWaterUsage("2026-10");
  assert.equal(m.litres, 46 * 30);
  assert.equal(m.changes, 46);
  assert.equal(m.missing, 0);
  assert.ok((await store.view()).data.logs.length < 46);
  const row = (await store.read()).logs[0]!;
  await care.saveLog({ ...row, percent: 50 });
  assert.equal((await store.monthlyWaterUsage("2026-10")).litres, 46 * 30 + 30);
  await care.deleteLog(row.id);
  assert.equal((await store.monthlyWaterUsage("2026-10")).litres, 45 * 30);
  await store.write((d) => {
    d.tanks[0]!.archivedAt = "2026-10-29T10:00:00Z";
  });
  assert.equal((await store.monthlyWaterUsage("2026-10")).changes, 45);
  assert.equal((await store.monthlyWaterUsage("2026-11")).litres, 0);
});
test("capacity snapshots survive tank resizing and normal log edits; legacy logs estimate and unknown snapshots stay missing", async () => {
  const { store, care } = setup();
  await store.init();
  const id = await care.createTank(tank);
  const saved = await care.saveLog(log(id));
  assert.equal((await store.getLog(saved))!.waterCapacityLitres, 120);
  await store.write((d) => {
    d.tanks[0]!.volumeLitres = 200;
  });
  assert.equal((await store.monthlyWaterUsage("2026-10")).litres, 30);
  await care.saveLog({
    ...(await store.getLog(saved))!,
    notes: "edited",
    percent: 50,
  });
  assert.equal((await store.monthlyWaterUsage("2026-10")).litres, 60);
  await store.write((d) => {
    d.logs[0]!.waterCapacityLitres = undefined;
    d.logs[0]!.waterCapacityRecorded = false;
  });
  const legacy = await store.monthlyWaterUsage("2026-10");
  assert.equal(legacy.litres, 110);
  assert.equal(legacy.estimated, 1);
  await store.write((d) => {
    d.tanks[0]!.volumeLitres = null;
  });
  const unknown = await care.saveLog(log(id, "2026-10-27"));
  await store.write((d) => {
    d.tanks[0]!.volumeLitres = 100;
  });
  const m = await store.monthlyWaterUsage("2026-10");
  assert.equal(m.missing, 1);
  assert.equal((await store.getLog(unknown))!.waterCapacityLitres, null);
});
test("water rate distinguishes unset and free, validates and persists currency/unit, estimates costs", async () => {
  const { store, care, driver } = setup();
  await store.init();
  assert.equal((await store.read()).settings.waterRate, null);
  for (const currency of ["AUD", "VND", "USD", "EUR"]) {
    await care.setWaterRate({ amount: 4.5, currency, perLitres: 1000 });
    assert.deepEqual((await new SqlStore(driver).read()).settings.waterRate, {
      amount: 4.5,
      currency,
      perLitres: 1000,
    });
  }
  assert.equal(
    waterCost(250, { amount: 4, currency: "AUD", perLitres: 1000 }),
    1,
  );
  assert.equal(waterCost(250, { amount: 0, currency: "AUD", perLitres: 1 }), 0);
  for (const rate of [
    { amount: -1, currency: "AUD", perLitres: 1 },
    { amount: Infinity, currency: "AUD", perLitres: 1 },
    { amount: 1, currency: "XXX", perLitres: 1 },
    { amount: 1, currency: "AUD", perLitres: 10 },
  ])
    assert.throws(() => validateWaterRate(rate));
  await care.setWaterRate(null);
  assert.equal((await store.read()).settings.waterRate, null);
});
test("backup round trips rate and capacity metadata, accepts legacy settings, and rejects invalid rates/snapshots", () => {
  const data = emptyData();
  data.settings.waterRate = { amount: 25000, currency: "VND", perLitres: 1000 };
  const preview = decodeBackup(encodeBackup(data, {}, "2026-10-29T10:00:00Z"));
  assert.deepEqual(preview.data.settings.waterRate, data.settings.waterRate);
  delete (data.settings as any).waterRate;
  validateData(data);
  assert.equal(
    decodeBackup(encodeBackup(data, {}, "2026-10-29T10:00:00Z")).data.settings
      .waterRate,
    null,
  );
  (data.settings as any).waterRate = {
    amount: -1,
    currency: "AUD",
    perLitres: 1000,
  };
  assert.throws(() => validateData(data));
});

test("existing schema-3 logs migrate without losing history and snapshot metadata survives backup round trips", async () => {
  const { db, store, care } = setup();
  await store.init();
  const id = await care.createTank(tank);
  await care.saveLog(log(id));
  // Recreate the shape of an existing version-3 database, then upgrade it.
  db.exec(
    "ALTER TABLE care_logs DROP COLUMN waterCapacityLitres; ALTER TABLE care_logs DROP COLUMN waterCapacityRecorded; PRAGMA user_version=3;",
  );
  await store.init();
  assert.equal((await store.read()).logs.length, 1);
  assert.equal((await store.monthlyWaterUsage("2026-10")).estimated, 1);
  const data = emptyData();
  const tid = "11111111-1111-4111-8111-111111111111";
  data.tanks.push({
    ...tank,
    id: tid,
    archivedAt: null,
    createdAt: "2026-10-28T00:00:00Z",
    updatedAt: "2026-10-28T00:00:00Z",
  });
  for (const [n, capacity, recorded] of [
    [1, 120, true],
    [2, null, true],
    [3, null, false],
  ] as const)
    data.logs.push({
      ...log(tid),
      id: `22222222-2222-4222-8222-22222222222${n}`,
      idempotencyKey: String(n),
      titleSnapshot: "Water change",
      createdAt: "2026-10-28T00:00:00Z",
      updatedAt: "2026-10-28T00:00:00Z",
      waterCapacityLitres: capacity,
      waterCapacityRecorded: recorded,
    });
  const restored = decodeBackup(
    encodeBackup(data, {}, "2026-10-29T10:00:00Z"),
  ).data;
  assert.deepEqual(
    restored.logs.map((l) => [l.waterCapacityLitres, l.waterCapacityRecorded]),
    [
      [120, true],
      [null, true],
      [null, false],
    ],
  );
  data.logs[0]!.waterCapacityLitres = -5;
  assert.throws(() => validateData(data));
});
test("changing activity type clears the water snapshot; changing back records current capacity and deleting tank removes usage", async () => {
  const { store, care } = setup();
  await store.init();
  const id = await care.createTank(tank);
  const saved = await care.saveLog(log(id));
  await care.saveLog({
    ...(await store.getLog(saved))!,
    activityType: "other",
    percent: null,
  });
  assert.equal((await store.monthlyWaterUsage("2026-10")).changes, 0);
  const other = (await store.getLog(saved))!;
  assert.equal(other.waterCapacityLitres, null);
  await store.write((d) => {
    d.tanks[0]!.volumeLitres = 200;
  });
  await care.saveLog({ ...other, activityType: "water_change", percent: 50 });
  assert.equal((await store.monthlyWaterUsage("2026-10")).litres, 110);
  await store.write((d) => {
    d.logs = [];
    d.tanks = [];
  });
  assert.equal((await store.monthlyWaterUsage("2026-10")).litres, 0);
});
