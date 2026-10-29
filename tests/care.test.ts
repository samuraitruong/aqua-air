import { languageOptions } from "../src/i18n";
import { migration1, migration2 } from "../src/repositories/schema";
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { SqlStore, type SqlDriver } from "../src/repositories/store";
import { CareService } from "../src/services/care";
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
  let seq = 0;
  const store = new SqlStore(driver);
  const care = new CareService(
    store,
    () => `id-${++seq}`,
    () => "2026-10-28T10:00:00.000Z",
  );
  return { db, driver, store, care };
}
const input = {
  name: "Bể A",
  waterType: "freshwater" as const,
  description: "",
  volumeLitres: 60,
  groupName: "",
  coverPhotoId: null,
};
test("SQLite atomically creates a tank and optional schedule without fabricated logs; persists across store instances", async () => {
  const { store, care, driver } = setup();
  await store.init();
  const id = await care.createTank(input, {
    intervalDays: 7,
    targetPercent: 30,
    initialDueDate: "2026-11-04",
  });
  const data = await new SqlStore(driver).read();
  assert.equal(data.tanks[0]?.id, id);
  assert.equal(data.logs.length, 0);
  assert.equal(data.schedules[0]?.initialDueDate, "2026-11-04");
});
test("log save is idempotent, double taps produce one row and reset only linked schedule", async () => {
  const { store, care } = setup();
  await store.init();
  const tankId = await care.createTank(input, {
    intervalDays: 7,
    targetPercent: 30,
    initialDueDate: "2026-10-28",
  });
  const s = (await store.read()).schedules[0]!;
  const entry = {
    tankId,
    scheduleId: s.id,
    activityType: "water_change" as const,
    performedAt: "2026-10-28T09:00:00Z",
    performedLocalDate: "2026-10-28",
    percent: 20,
    notes: "",
    nextDueOverrideDate: null,
    idempotencyKey: "tap",
  };
  const [a, b] = await Promise.all([care.saveLog(entry), care.saveLog(entry)]);
  assert.equal(a, b);
  const data = await store.read();
  assert.equal(data.logs.length, 1);
  assert.equal(data.schedules[0]?.targetPercent, 30);
  assert.equal(data.schedules[0]?.revision, 2);
  assert.equal(data.logs[0]?.percent, 20);
});
test("type edit recomputes both schedules; log cannot move tanks; deletion preserves remaining history", async () => {
  const { store, care } = setup();
  await store.init();
  const tankId = await care.createTank(input, {
    intervalDays: 7,
    targetPercent: 30,
    initialDueDate: "2026-10-28",
  });
  const water = (await store.read()).schedules[0]!;
  const filterId = await care.upsertSchedule({
    tankId,
    activityType: "filter_clean",
    title: "Vệ sinh lọc",
    intervalDays: 14,
    targetPercent: null,
    initialDueDate: "2026-10-28",
    enabled: true,
  });
  const id = await care.saveLog({
    tankId,
    scheduleId: water.id,
    activityType: "water_change",
    performedAt: "2026-10-28T09:00:00Z",
    performedLocalDate: "2026-10-28",
    percent: 30,
    notes: "",
    nextDueOverrideDate: null,
    idempotencyKey: "one",
  });
  await care.setNextDue(water.id, "2026-11-09");
  await care.saveLog({
    ...(await store.read()).logs[0]!,
    id,
    activityType: "filter_clean",
    scheduleId: filterId,
    nextDueOverrideDate: null,
  });
  const d = await store.read();
  assert.equal(d.logs[0]?.percent, null);
  assert.equal(
    d.schedules.find((s) => s.id === water.id)?.manualNextDueDate,
    null,
  );
  assert.equal(d.schedules.find((s) => s.id === filterId)?.revision, 2);
  await assert.rejects(care.saveLog({ ...d.logs[0]!, tankId: "another" }));
  await care.deleteLog(id);
  assert.equal((await store.read()).logs.length, 0);
});
test("invalid mutations roll back and snooze does not change due or logs", async () => {
  const { store, care } = setup();
  await store.init();
  await assert.rejects(
    care.createTank(
      { ...input, name: "" },
      { intervalDays: 7, targetPercent: 30, initialDueDate: "2026-11-04" },
    ),
  );
  assert.equal((await store.read()).tanks.length, 0);
  await care.createTank(input, {
    intervalDays: 7,
    targetPercent: 30,
    initialDueDate: "2026-10-28",
  });
  const s = (await store.read()).schedules[0]!;
  await care.snooze(s.id, "2026-10-29T09:00:00Z");
  const d = await store.read();
  assert.equal(d.schedules[0]?.initialDueDate, "2026-10-28");
  assert.equal(d.logs.length, 0);
  await care.archiveTank(s.tankId, true);
  assert.ok((await store.read()).tanks[0]?.archivedAt);
});
test("deleting a schedule preserves overridden log as independent history", async () => {
  const { store, care } = setup();
  await store.init();
  const tankId = await care.createTank(input, {
    intervalDays: 7,
    targetPercent: 30,
    initialDueDate: "2026-10-28",
  });
  const sc = (await store.read()).schedules[0]!;
  await care.saveLog({
    tankId,
    scheduleId: sc.id,
    activityType: "water_change",
    performedAt: "2026-10-28T09:00:00Z",
    performedLocalDate: "2026-10-28",
    percent: 30,
    notes: "",
    nextDueOverrideDate: "2026-11-02",
    idempotencyKey: "override",
  });
  await care.deleteSchedule(sc.id);
  const d = await store.read();
  assert.equal(d.logs.length, 1);
  assert.equal(d.logs[0]?.scheduleId, null);
  assert.equal(d.logs[0]?.nextDueOverrideDate, null);
});
test("invalid manual date rolls back schedule changes in the same save", async () => {
  const { store, care } = setup();
  await store.init();
  const tankId = await care.createTank(input, {
    intervalDays: 7,
    targetPercent: 30,
    initialDueDate: "2026-10-28",
  });
  const sc = (await store.read()).schedules[0]!;
  await assert.rejects(
    care.upsertSchedule({ ...sc, intervalDays: 14 }, undefined, {
      nextDueDate: "2026-10-01",
    }),
  );
  assert.equal((await store.read()).schedules[0]?.intervalDays, 7);
});
test("summary loads only latest logs while history uses stable cursor pagination", async () => {
  const { store, care } = setup();
  await store.init();
  const tankId = await care.createTank(input, {
    intervalDays: 7,
    targetPercent: 30,
    initialDueDate: "2026-10-28",
  });
  const sc = (await store.read()).schedules[0]!;
  for (let day = 1; day <= 5; day++)
    await care.saveLog({
      tankId,
      scheduleId: sc.id,
      activityType: "water_change",
      performedAt: `2026-10-0${day}T09:00:00Z`,
      performedLocalDate: `2026-10-0${day}`,
      percent: 30,
      notes: "",
      nextDueOverrideDate: null,
      idempotencyKey: "page" + day,
    });
  const summary = await store.view();
  assert.equal(summary.data.logs.length, 1);
  assert.equal(summary.totalLogs, 5);
  const first = await store.history(tankId, undefined, "", 2);
  assert.deepEqual(
    first.map((l) => l.performedLocalDate),
    ["2026-10-05", "2026-10-04"],
  );
  const second = await store.history(tankId, first.at(-1), "", 2);
  assert.deepEqual(
    second.map((l) => l.performedLocalDate),
    ["2026-10-03", "2026-10-02"],
  );
  assert.equal(
    (await store.getLog(first[0]!.id))?.performedLocalDate,
    "2026-10-05",
  );
  assert.equal((await store.logsOnDate("2026-10-01")).length, 1);
});
test("migration from schema 1 preserves legacy volume and adds geometry/filter fields", async () => {
  const { db, store } = setup();
  db.exec(migration1);
  db.prepare(
    "INSERT INTO tanks(id,name,description,volumeLitres,waterType,groupName,coverPhotoId,archivedAt,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?)",
  ).run(
    "legacy",
    "Bể cũ",
    "",
    60,
    "freshwater",
    "",
    null,
    null,
    "2026-10-01T00:00:00Z",
    "2026-10-01T00:00:00Z",
  );
  await store.init();
  const d = await store.read();
  assert.equal(d.tanks.length, 1);
  assert.equal(d.tanks[0]?.volumeLitres, 60);
  assert.equal(d.tanks[0]?.lengthCm, null);
  assert.equal(d.tanks[0]?.hasSump, false);
  assert.equal(d.tanks[0]?.hasCanister, false);
  assert.equal(
    (db.prepare("PRAGMA user_version").get() as any).user_version,
    5,
  );
  await store.init();
  assert.equal((await store.read()).tanks.length, 1);
  assert.ok(
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE name='idx_logs_local_date'",
      )
      .get(),
  );
});
test("SQLite commit-path failure rolls back every inserted record", async () => {
  const { store, care, driver } = setup();
  await store.init();
  const run = driver.run;
  let fault = true;
  driver.run = async (sql, ...args) => {
    if (fault && sql.includes("app_settings")) throw Error("disk full");
    await run(sql, ...args);
  };
  await assert.rejects(
    care.createTank(input, {
      intervalDays: 7,
      targetPercent: 30,
      initialDueDate: "2026-11-04",
    }),
  );
  fault = false;
  const d = await store.read();
  assert.equal(d.tanks.length, 0);
  assert.equal(d.schedules.length, 0);
  assert.equal(d.outbox.length, 0);
});
test("language selection persists in SQLite and does not change care schedules or snoozes", async () => {
  const { store, care, driver } = setup();
  await store.init();
  await care.createTank(input, {
    intervalDays: 7,
    targetPercent: 30,
    initialDueDate: "2026-11-04",
  });
  const sc = (await store.read()).schedules[0]!;
  await care.snooze(sc.id, "2026-10-29T09:00:00Z");
  const before = await store.read();
  for (const [language] of languageOptions) {
    await care.setLanguage(language);
    const next = await new SqlStore(driver).read();
    assert.equal(next.settings.language, language);
    assert.deepEqual(next.schedules, before.schedules);
    assert.deepEqual(next.reminders, before.reminders);
    assert.deepEqual(next.logs, before.logs);
    assert.deepEqual(next.tanks, before.tanks);
  }
  await assert.rejects(care.setLanguage("unsupported" as any));
});

test("geometry and both filters survive SQLite restart and metadata updates", async () => {
  const { store, care, driver } = setup();
  await store.init();
  const id = await care.createTank({
    ...input,
    lengthCm: 100,
    widthCm: 40,
    heightCm: 50,
    hasSump: true,
    sumpVolumeLitres: 60,
    hasCanister: true,
  });
  let d = await new SqlStore(driver).read();
  assert.equal(d.tanks[0]?.volumeLitres, 200);
  assert.equal(d.tanks[0]?.sumpVolumeLitres, 60);
  assert.equal(d.tanks[0]?.hasCanister, true);
  await care.updateTank(id, {
    ...input,
    lengthCm: 120,
    widthCm: 40,
    heightCm: 50,
    hasSump: false,
    sumpVolumeLitres: 60,
    hasCanister: true,
  });
  d = await store.read();
  assert.equal(d.tanks[0]?.volumeLitres, 240);
  assert.equal(d.tanks[0]?.sumpVolumeLitres, null);
  assert.equal(d.tanks[0]?.hasCanister, true);
});
test("schema 2 migration keeps existing care history", async () => {
  const { db, store } = setup();
  db.exec(migration1 + migration2);
  db.exec(
    "INSERT INTO tanks VALUES('old','Bể cũ','',60,'freshwater','',NULL,NULL,'2026-10-01T00:00:00Z','2026-10-01T00:00:00Z'); INSERT INTO care_logs VALUES('log','old',NULL,'water_change','Thay nước','2026-10-19T09:00:00Z','2026-10-19',30,'',NULL,'key','2026-10-19T09:00:00Z','2026-10-19T09:00:00Z');",
  );
  await store.init();
  const d = await store.read();
  assert.equal(d.tanks[0]?.volumeLitres, 60);
  assert.equal(d.logs.length, 1);
  assert.equal(d.logs[0]?.percent, 30);
});
test("SQLite constraints reject partial dimensions and sump without litres", async () => {
  const { store, care, db } = setup();
  await store.init();
  const id = await care.createTank(input);
  assert.throws(() =>
    db.prepare("UPDATE tanks SET lengthCm=100 WHERE id=?").run(id),
  );
  assert.throws(() =>
    db
      .prepare("UPDATE tanks SET hasSump=1,sumpVolumeLitres=NULL WHERE id=?")
      .run(id),
  );
  assert.equal((await store.read()).tanks[0]?.volumeLitres, 60);
});
