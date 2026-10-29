import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { SqlStore, type SqlDriver } from "../src/repositories/store";
import { CareService } from "../src/services/care";
import { WaterReadingService } from "../src/services/water-readings";
import { emptyData } from "../src/domain/models";
import {
  encodeBackup,
  decodeBackup,
  validateData,
} from "../src/services/backup-format";
function setup() {
  const db = new DatabaseSync(":memory:");
  let n = 0;
  const driver: SqlDriver = {
    exec: async (sql) => {
      db.exec(sql);
    },
    all: async (sql, ...p) => db.prepare(sql).all(...p) as any,
    run: async (sql, ...p) => {
      db.prepare(sql).run(...p);
    },
  };
  const store = new SqlStore(driver),
    uuid = () => `11111111-1111-4111-8111-${String(++n).padStart(12, "0")}`,
    clock = () => "2026-10-29T12:00:00Z";
  return {
    db,
    store,
    driver,
    care: new CareService(store, uuid, clock),
    water: new WaterReadingService(store, uuid, clock),
  };
}
const tankInput = {
  name: "Measured tank",
  description: "",
  volumeLitres: 100,
  waterType: "freshwater" as const,
  groupName: "",
  coverPhotoId: null,
};
const input = (tankId: string, key = "one") => ({
  tankId,
  performedAt: "2026-10-28T10:00:00Z",
  performedLocalDate: "2026-10-28",
  notes: "test",
  idempotencyKey: key,
  values: [
    { parameterKey: "ph", value: 7.2 },
    { parameterKey: "no2", value: 0 },
  ],
});
test("SQLite water readings persist partial/zero values and idempotent sessions without changing care schedules", async () => {
  const { store, driver, care, water } = setup();
  await store.init();
  const tankId = await care.createTank(tankInput);
  const before = (await store.read()).schedules;
  const id = await water.saveReading(input(tankId));
  assert.equal(await water.saveReading(input(tankId)), id);
  const d = await new SqlStore(driver).read();
  assert.equal(d.waterReadings.length, 1);
  assert.equal(d.waterValues.length, 2);
  assert.equal(d.waterValues.find((v) => v.parameterKey === "no2")!.value, 0);
  assert.deepEqual(d.schedules, before);
  assert.equal((await store.view()).data.waterReadings.length, 0);
  assert.equal((await store.view()).totalReadings, 1);
});
test("latest values are independently selected and full SQL history is stable across pages, edits and deletes", async () => {
  const { store, care, water } = setup();
  await store.init();
  const tankId = await care.createTank(tankInput);
  const first = await water.saveReading(input(tankId));
  await water.saveReading({
    ...input(tankId, "two"),
    performedAt: "2026-10-29T10:00:00Z",
    performedLocalDate: "2026-10-29",
    values: [{ parameterKey: "no3", value: 10 }],
  });
  let latest = await store.latestWaterValues(tankId);
  assert.equal(latest.find((v) => v.parameterKey === "ph")!.value, 7.2);
  assert.equal(latest.find((v) => v.parameterKey === "no3")!.value, 10);
  for (let n = 0; n < 34; n++)
    await water.saveReading(input(tankId, "page" + n));
  const page1 = await store.waterHistory(tankId);
  const page2 = await store.waterHistory(tankId, page1.at(-1));
  assert.equal(page1.length, 30);
  assert.equal(page2.length, 6);
  assert.equal(new Set([...page1, ...page2].map((r) => r.id)).size, 36);
  await water.saveReading({
    ...input(tankId),
    id: first,
    values: [{ parameterKey: "ph", value: 8 }],
  });
  assert.equal((await store.getWaterReading(first))!.values.length, 1);
  await water.deleteReading(first);
  assert.equal(await store.getWaterReading(first), undefined);
});
test("custom definitions and readings are tank-scoped; invalid values and archived edits are rejected", async () => {
  const { store, care, water } = setup();
  await store.init();
  const id = await care.createTank(tankInput),
    other = await care.createTank({ ...tankInput, name: "Other" });
  const custom = await water.addParameter(id, "Dissolved oxygen", "mg/L");
  const reading = await water.saveReading({
    ...input(id),
    values: [{ parameterKey: custom, value: 6.5 }],
  });
  assert.equal(
    (await store.getWaterReading(reading))!.values[0]!.unitSnapshot,
    "mg/L",
  );
  for (const values of [
    [],
    [{ parameterKey: "ph", value: 14.1 }],
    [{ parameterKey: "no3", value: -1 }],
    [{ parameterKey: "nh4", value: NaN }],
    [{ parameterKey: "missing", value: 1 }],
    [
      { parameterKey: "ph", value: 7 },
      { parameterKey: "ph", value: 8 },
    ],
  ])
    await assert.rejects(() =>
      water.saveReading({ ...input(id, "invalid"), values }),
    );
  await assert.rejects(() =>
    water.saveReading({
      ...input(other),
      values: [{ parameterKey: custom, value: 1 }],
    }),
  );
  await assert.rejects(() => water.addParameter(id, "  ", "mg/L"));
  await assert.rejects(() =>
    water.addParameter(id, "Dissolved oxygen", "mg/L"),
  );
  await store.write((d) => {
    d.tanks[0]!.archivedAt = "2026-10-29T00:00:00Z";
  });
  await assert.rejects(() => water.saveReading({ ...input(id), id: reading }));
  await assert.rejects(() => water.addParameter(id, "Iron", "mg/L"));
  await care.deleteTank(id);
  const after = await store.read();
  assert.equal(after.waterReadings.length, 0);
  assert.equal(after.waterParameters.length, 0);
  assert.equal(after.waterValues.length, 0);
});
test("water readings backup format 3 preserves all tables and rejects damaged relationships", async () => {
  const { store, care, water } = setup();
  await store.init();
  const id = await care.createTank(tankInput);
  const custom = await water.addParameter(id, "ORP", "mV");
  await water.saveReading({
    ...input(id),
    values: [{ parameterKey: custom, value: -20 }],
  });
  const data = await store.read(),
    backup = decodeBackup(encodeBackup(data, {}, "2026-10-29T12:00:00Z"));
  assert.equal(backup.manifest.formatVersion, 3);
  assert.deepEqual(backup.data.waterValues, data.waterValues);
  assert.equal(backup.manifest.counts.waterReadings, 1);
  const bad = structuredClone(data);
  bad.waterValues[0]!.readingId = "bad";
  assert.throws(() => validateData(bad));
  const other = structuredClone(data);
  other.waterValues[0]!.unitSnapshot = "changed";
  assert.throws(() => validateData(other));
  await care.reset();
  const empty = await store.read();
  assert.deepEqual(empty.waterReadings, []);
  assert.deepEqual(empty.waterValues, []);
  assert.deepEqual(empty.waterParameters, []);
});

test("schema 4 upgrades with existing tanks; future dates/empty sessions fail without writing partial data", async () => {
  const { migration1, migration2, migration3, migration4 } =
    await import("../src/repositories/schema");
  const { db, store, water } = setup();
  db.exec(migration1 + migration2 + migration3 + migration4);
  const id = "22222222-2222-4222-8222-222222222222";
  db.prepare(
    "INSERT INTO tanks(id,name,description,waterType,groupName,volumeLitres,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?)",
  ).run(
    id,
    "Existing",
    "",
    "freshwater",
    "",
    60,
    "2026-10-01T00:00:00Z",
    "2026-10-01T00:00:00Z",
  );
  await store.init();
  assert.equal((await store.read()).tanks[0]!.name, "Existing");
  assert.equal(
    (db.prepare("PRAGMA user_version").get() as any).user_version,
    5,
  );
  await assert.rejects(() =>
    water.saveReading({ ...input(id), performedAt: "2026-10-30T10:00:00Z" }),
  );
  await assert.rejects(() => water.saveReading({ ...input(id), values: [] }));
  assert.equal((await store.read()).waterReadings.length, 0);
  assert.equal((await store.read()).waterValues.length, 0);
});
test("legacy format-2 backups normalize absent water tables and format-3 count tampering is rejected", async () => {
  const { unzipSync, zipSync, strFromU8, strToU8 } = await import("fflate");
  const { sha256 } = await import("@noble/hashes/sha2.js");
  const { bytesToHex } = await import("@noble/hashes/utils.js");
  const files = unzipSync(
    encodeBackup(emptyData(), {}, "2026-10-29T10:00:00Z"),
  );
  const manifest = JSON.parse(strFromU8(files["manifest.json"]!));
  manifest.counts.waterReadings = 1;
  files["manifest.json"] = strToU8(JSON.stringify(manifest));
  assert.throws(() => decodeBackup(zipSync(files)));
  const data = JSON.parse(strFromU8(files["data.json"]!));
  delete data.waterReadings;
  delete data.waterParameters;
  delete data.waterValues;
  files["data.json"] = strToU8(JSON.stringify(data));
  manifest.formatVersion = 2;
  const item = manifest.files.find((f: any) => f.path === "data.json");
  item.size = files["data.json"].length;
  item.sha256 = bytesToHex(sha256(files["data.json"]));
  files["manifest.json"] = strToU8(JSON.stringify(manifest));
  const legacy = decodeBackup(zipSync(files)).data;
  assert.deepEqual(legacy.waterReadings, []);
  assert.deepEqual(legacy.waterValues, []);
  assert.deepEqual(legacy.waterParameters, []);
});
