import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { SqlStore, type SqlDriver } from "../src/repositories/store";
import { CareService } from "../src/services/care";
import { reconcileNotifications } from "../src/services/notification-worker";
import { addDays } from "../src/domain/dates";
import assert from "node:assert/strict";
async function main() {
  const db = new DatabaseSync(":memory:");
  let fullReads = 0;
  const driver: SqlDriver = {
    exec: async (s) => {
      db.exec(s);
    },
    all: async <T>(sql: string, ...p: any[]) => {
      if (sql.includes("SELECT * FROM care_logs ORDER BY")) fullReads++;
      return db.prepare(sql).all(...p) as T[];
    },
    run: async (s, ...p) => {
      db.prepare(s).run(...p);
    },
  };
  const store = new SqlStore(driver);
  await store.init();
  const now = "2026-10-28T10:00:00.000Z";
  await store.write((d) => {
    for (let i = 0; i < 100; i++) {
      const tankId = randomUUID(),
        scheduleId = randomUUID();
      d.tanks.push({
        id: tankId,
        name: "Bể " + i,
        description: "",
        volumeLitres: null,
        waterType: "freshwater",
        groupName: "Kệ A",
        coverPhotoId: null,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      });
      d.schedules.push({
        id: scheduleId,
        tankId,
        activityType: "water_change",
        title: "Thay nước",
        intervalDays: 7,
        targetPercent: 30,
        initialDueDate: "2026-10-28",
        enabled: true,
        manualNextDueDate: null,
        manualBasisLogId: null,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      });
      d.reminders.push({
        scheduleId,
        enabled: true,
        localTime: "09:00",
        leadDays: 1,
        overdueOnce: true,
        snoozedUntil: null,
        snoozeRevision: null,
      });
      for (let j = 0; j < 100; j++) {
        const date = addDays("2026-10-27", -j);
        const id = randomUUID();
        d.logs.push({
          id,
          tankId,
          scheduleId,
          activityType: "water_change",
          titleSnapshot: "Thay nước",
          performedAt: date + "T09:00:00.000Z",
          performedLocalDate: date,
          percent: 30,
          notes: "",
          nextDueOverrideDate: null,
          idempotencyKey: id,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  });
  let start = performance.now();
  const view = await store.view();
  const viewMs = performance.now() - start;
  assert.equal(view.totalLogs, 10000);
  assert.equal(view.data.logs.length, 100);
  fullReads = 0;
  start = performance.now();
  let jobs = 0;
  await reconcileNotifications(
    store,
    {
      permission: async () => true,
      list: async () => [],
      cancel: async () => {},
      schedule: async () => `os-${++jobs}`,
    },
    () => now,
  );
  const reconcileMs = performance.now() - start;
  assert.equal(jobs, 48);
  assert.ok(fullReads <= 3);
  const sc = view.data.schedules[0]!;
  start = performance.now();
  await new CareService(store, randomUUID, () => now).saveLog({
    tankId: sc.tankId,
    scheduleId: sc.id,
    activityType: "water_change",
    performedAt: "2026-10-28T09:00:00.000Z",
    performedLocalDate: "2026-10-28",
    percent: 20,
    notes: "",
    nextDueOverrideDate: null,
    idempotencyKey: randomUUID(),
  });
  const saveMs = performance.now() - start;
  console.log(
    JSON.stringify(
      {
        environment: "Node SQLite in-memory; not native device",
        tanks: 100,
        logs: 10000,
        summaryLoadedLogs: view.data.logs.length,
        viewMs: Math.round(viewMs),
        reconcileMs: Math.round(reconcileMs),
        fullHistoryReadsDuringReconcile: fullReads - 1,
        saveMs: Math.round(saveMs),
        scheduledJobs: jobs,
      },
      null,
      2,
    ),
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
