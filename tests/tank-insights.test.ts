import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { SqlStore, type SqlDriver } from "../src/repositories/store";
import { CareService } from "../src/services/care";
import { WaterReadingService } from "../src/services/water-readings";
import { TankInsightsService } from "../src/services/tank-insights";
import {
  targetStatus,
  isStale,
  chartRange,
  samplePoints,
  presetFields,
} from "../src/domain/tank-insights";
import {
  encodeBackup,
  decodeBackup,
  validateData,
} from "../src/services/backup-format";
function setup() {
  const db = new DatabaseSync(":memory:");
  let n = 0;
  const driver: SqlDriver = {
    exec: async (s) => {
      db.exec(s);
    },
    all: async (s, ...p) => db.prepare(s).all(...p) as any,
    run: async (s, ...p) => {
      db.prepare(s).run(...p);
    },
  };
  const store = new SqlStore(driver),
    uuid = () => `11111111-1111-4111-8111-${String(++n).padStart(12, "0")}`,
    clock = () => "2026-10-31T12:00:00.000Z";
  return {
    db,
    driver,
    store,
    care: new CareService(store, uuid, clock),
    water: new WaterReadingService(store, uuid, clock),
    insights: new TankInsightsService(store, uuid, clock),
  };
}
const tank = {
  name: "Tank",
  description: "",
  volumeLitres: 100,
  waterType: "freshwater" as const,
  groupName: "",
  coverPhotoId: null,
};
test("targets are inclusive, stale is independent, date ranges include today and charts are bounded", () => {
  assert.equal(targetStatus(7, { lower: 7, upper: 8 }), "within");
  assert.equal(targetStatus(6, { lower: 7, upper: null }), "below");
  assert.equal(targetStatus(9, { lower: null, upper: 8 }), "above");
  assert.equal(targetStatus(9, undefined), null);
  assert.equal(
    isStale("2026-10-24T12:00:00Z", 7, new Date("2026-10-31T12:00:00Z")),
    false,
  );
  assert.equal(
    isStale("2026-10-24T11:59:59Z", 7, new Date("2026-10-31T12:00:00Z")),
    true,
  );
  const range = chartRange(7, new Date(2026, 9, 31, 12));
  assert.equal(range.start, "2026-10-25");
  assert.equal(range.end, "2026-10-31");
  const points = Array.from({ length: 1000 }, (_, i) => ({ value: i }));
  const sampled = samplePoints(points, 200);
  assert.ok(sampled.length <= 200);
  assert.equal(sampled[0], points[0]);
  assert.equal(sampled.at(-1), points.at(-1));
  assert.deepEqual(
    presetFields(["ph"], { no3: "0", ph: "7.2" }, ["ph", "no3", "no2"]),
    ["ph", "no3"],
  );
});
test("schema 6 presets/targets/journal persist, enforce ownership and survive backups and cover changes", async () => {
  const { db, store, driver, care, water, insights } = setup();
  await store.init();
  const id = await care.createTank(tank),
    other = await care.createTank({ ...tank, name: "Other" });
  const p = await water.addParameter(other, "ORP", "mV");
  await assert.rejects(() =>
    insights.savePreset({
      tankId: id,
      name: "Bad",
      parameterKeys: [p],
      isDefault: false,
    }),
  );
  const preset = await insights.savePreset({
    tankId: id,
    name: "Weekly",
    parameterKeys: ["ph", "no3"],
    isDefault: true,
  });
  await assert.rejects(() =>
    insights.savePreset({
      tankId: id,
      name: "Weekly",
      parameterKeys: ["ph"],
      isDefault: false,
    }),
  );
  await insights.saveTarget(id, "ph", 6.5, 7.5);
  await assert.rejects(() => insights.saveTarget(id, "ph", 8, 7));
  await insights.savePreference(id, 10);
  const photo = {
    id: "22222222-2222-4222-8222-222222222222",
    relativePath: "photos/test.jpg",
    mimeType: "image/jpeg",
    width: 10,
    height: 10,
    byteSize: 4,
    createdAt: "2026-10-30T12:00:00Z",
  };
  const entry = await insights.saveJournal(
    {
      tankId: id,
      performedAt: "2026-10-30T12:00:00Z",
      performedLocalDate: "2026-10-30",
      notes: "Growth",
    },
    photo,
  );
  await care.updateTank(id, { ...tank, name: "Changed" });
  let d = await new SqlStore(driver).read();
  assert.equal(d.readingPresets[0]?.id, preset);
  assert.equal(d.photos.length, 1);
  assert.equal(d.waterTargets[0]?.lower, 6.5);
  assert.equal(d.tankPreferences[0]?.staleDays, 10);
  assert.equal((await store.journalHistory(id)).length, 1);
  assert.equal((await store.view()).data.journalEntries.length, 0);
  const decoded = decodeBackup(
    encodeBackup(
      d,
      { "photos/test.jpg": new Uint8Array([255, 216, 255, 0]) },
      "2026-10-31T12:00:00Z",
    ),
  );
  assert.equal(decoded.manifest.formatVersion, 4);
  assert.equal(decoded.data.journalEntries[0]?.id, entry);
  assert.equal(decoded.data.readingPresets[0]?.parameterKeys[1], "no3");
  const broken = structuredClone(d);
  broken.waterTargets[0]!.tankId = other;
  broken.waterTargets[0]!.parameterKey = "missing";
  assert.throws(() => validateData(broken));
  await care.archiveTank(id, true);
  await assert.rejects(() => insights.savePreference(id, 7));
  await care.deleteTank(id);
  d = await store.read();
  assert.equal(d.journalEntries.length, 0);
  assert.equal(d.readingPresets.length, 0);
  assert.equal(d.photos.length, 0);
  assert.equal(
    (db.prepare("PRAGMA user_version").get() as any).user_version,
    6,
  );
});
test("range reads include results beyond a history page and journal deletion preserves shared covers", async () => {
  const { store, care, water, insights } = setup();
  await store.init();
  const id = await care.createTank(tank);
  for (let i = 0; i < 35; i++)
    await water.saveReading({
      tankId: id,
      performedAt: "2026-10-30T12:00:00Z",
      performedLocalDate: "2026-10-30",
      notes: "",
      idempotencyKey: String(i),
      values: [{ parameterKey: "ph", value: 7 }],
    });
  const range = await store.insightRange(id, "2026-10-01", "2026-10-31");
  assert.equal(range.readings.length, 35);
  assert.equal(range.values.length, 35);
  const photo = {
    id: "22222222-2222-4222-8222-222222222222",
    relativePath: "photos/shared.jpg",
    mimeType: "image/jpeg",
    width: 10,
    height: 10,
    byteSize: 4,
    createdAt: "2026-10-30T12:00:00Z",
  };
  await care.updateTank(id, { ...tank, coverPhotoId: photo.id }, photo);
  const entry = await insights.saveJournal({
    tankId: id,
    photoId: photo.id,
    performedAt: "2026-10-30T12:00:00Z",
    performedLocalDate: "2026-10-30",
    notes: "",
  });
  await insights.deleteJournal(entry);
  assert.equal((await store.read()).photos.length, 1);
});
test("preset order follows user selection and matching targets do not apply across units", async () => {
  assert.deepEqual(
    presetFields(["no3", "ph"], { no2: "0" }, ["ph", "no2", "no3"]),
    ["no3", "ph", "no2"],
  );
  const { matchingTarget } = await import("../src/domain/tank-insights");
  const { store, care, insights } = setup();
  await store.init();
  const id = await care.createTank(tank);
  await insights.saveTarget(id, "temperature", 20, 28);
  const d = await store.read();
  assert.ok(matchingTarget(d, id, "temperature", "°C"));
  assert.equal(matchingTarget(d, id, "temperature", "°F"), undefined);
});
test("chart windows use current timezone midnight while reports retain recorded local dates", async () => {
  const { store, care, water } = setup();
  await store.init();
  const id = await care.createTank(tank);
  await water.saveReading({
    tankId: id,
    performedAt: "2026-10-25T12:00:00Z",
    performedLocalDate: "2026-10-24",
    notes: "travel",
    idempotencyKey: "travel",
    values: [{ parameterKey: "ph", value: 7 }],
  });
  assert.equal(
    (await store.insightRange(id, "2026-10-25", "2026-10-31", true)).readings
      .length,
    1,
  );
  assert.equal(
    (await store.insightRange(id, "2026-10-25", "2026-10-31")).readings.length,
    0,
  );
});
test("populated schema 5 upgrades without loss and a failed migration rolls back schema changes", async () => {
  const { migration1, migration2, migration3, migration4, migration5 } =
    await import("../src/repositories/schema");
  const fixture = setup();
  fixture.db.exec(
    migration1 + migration2 + migration3 + migration4 + migration5,
  );
  fixture.db
    .prepare(
      "INSERT INTO tanks (id,name,description,volumeLitres,waterType,groupName,createdAt,updatedAt) VALUES ('legacy','Old tank','',100,'freshwater','','2026-10-30T00:00:00Z','2026-10-30T00:00:00Z')",
    )
    .run();
  const failDriver: SqlDriver = {
    ...fixture.driver,
    exec: async (sql) => {
      await fixture.driver.exec(sql);
      if (sql.includes("CREATE TABLE reading_presets"))
        throw new Error("Injected migration failure");
    },
  };
  await assert.rejects(() => new SqlStore(failDriver).init());
  assert.equal(
    (fixture.db.prepare("PRAGMA user_version").get() as any).user_version,
    5,
  );
  assert.equal(
    fixture.db
      .prepare("SELECT name FROM sqlite_master WHERE name='reading_presets'")
      .get(),
    undefined,
  );
  await fixture.store.init();
  assert.equal((await fixture.store.read()).tanks[0]?.name, "Old tank");
  assert.equal(
    (fixture.db.prepare("PRAGMA user_version").get() as any).user_version,
    6,
  );
});
test("default preset switching, journal validation and reset preserve data integrity", async () => {
  const { store, care, insights } = setup();
  await store.init();
  const id = await care.createTank(tank);
  const first = await insights.savePreset({
    tankId: id,
    name: "A",
    parameterKeys: ["ph"],
    isDefault: true,
  });
  const second = await insights.savePreset({
    tankId: id,
    name: "B",
    parameterKeys: ["no3"],
    isDefault: true,
  });
  let d = await store.read();
  assert.equal(d.readingPresets.filter((p) => p.isDefault).length, 1);
  assert.equal(d.readingPresets.find((p) => p.isDefault)?.id, second);
  await insights.savePreset({
    id: first,
    tankId: id,
    name: "A",
    parameterKeys: ["ph"],
    isDefault: true,
  });
  d = await store.read();
  assert.equal(d.readingPresets.find((p) => p.isDefault)?.id, first);
  await assert.rejects(() => insights.savePreference(id, 1.5));
  await assert.rejects(() =>
    insights.saveJournal({
      tankId: id,
      performedAt: "2027-01-01T00:00:00Z",
      performedLocalDate: "2027-01-01",
      notes: "",
    }),
  );
  await assert.rejects(() =>
    insights.saveJournal({
      tankId: id,
      performedAt: "2026-10-30T00:00:00Z",
      performedLocalDate: "2026-10-30",
      notes: "",
    }),
  );
  await insights.saveTarget(id, "no3", 0, null);
  await insights.saveTarget(id, "no3", null, null);
  assert.equal((await store.read()).waterTargets.length, 0);
  await insights.deletePreset(first);
  assert.equal((await store.read()).readingPresets.length, 1);
});
test("legacy format 3 restores with empty insight collections; format 4 rejects missing collections and bad counts", async () => {
  const { unzipSync, zipSync, strFromU8, strToU8 } = await import("fflate");
  const { sha256 } = await import("@noble/hashes/sha2.js");
  const { bytesToHex } = await import("@noble/hashes/utils.js");
  const { store, care } = setup();
  await store.init();
  await care.createTank(tank);
  const bytes = encodeBackup(await store.read(), {}, "2026-10-31T12:00:00Z");
  const files = unzipSync(bytes),
    manifest = JSON.parse(strFromU8(files["manifest.json"]!)),
    data = JSON.parse(strFromU8(files["data.json"]!));
  manifest.counts.readingPresets = 1;
  files["manifest.json"] = strToU8(JSON.stringify(manifest));
  assert.throws(() => decodeBackup(zipSync(files)));
  manifest.counts.readingPresets = 0;
  for (const key of [
    "readingPresets",
    "waterTargets",
    "tankPreferences",
    "journalEntries",
  ])
    delete data[key];
  files["data.json"] = strToU8(JSON.stringify(data));
  const item = manifest.files.find((f: any) => f.path === "data.json");
  item.size = files["data.json"]!.length;
  item.sha256 = bytesToHex(sha256(files["data.json"]!));
  files["manifest.json"] = strToU8(JSON.stringify(manifest));
  assert.throws(() => decodeBackup(zipSync(files)));
  manifest.formatVersion = 3;
  files["manifest.json"] = strToU8(JSON.stringify(manifest));
  const legacy = decodeBackup(zipSync(files));
  assert.deepEqual(legacy.data.journalEntries, []);
  assert.deepEqual(legacy.data.readingPresets, []);
});
test("journal backup validation rejects future entries and invalid photo relations", async () => {
  const { store, care } = setup();
  await store.init();
  const id = await care.createTank(tank);
  const d = await store.read();
  d.journalEntries.push({
    id: "33333333-3333-4333-8333-333333333333",
    tankId: id,
    photoId: null,
    performedAt: "2099-01-01T00:00:00Z",
    performedLocalDate: "2099-01-01",
    notes: "",
    createdAt: "2026-10-30T00:00:00Z",
    updatedAt: "2026-10-30T00:00:00Z",
  });
  assert.throws(() => validateData(d));
  d.journalEntries[0]!.performedAt = "2026-10-30T00:00:00Z";
  d.journalEntries[0]!.performedLocalDate = "2026-10-30";
  d.journalEntries[0]!.photoId = "missing";
  assert.throws(() => validateData(d));
  d.journalEntries[0]!.photoId = null;
  assert.doesNotThrow(() => validateData(d));
});
