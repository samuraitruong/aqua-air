import { languageOptions, locales } from "../src/i18n";
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyData, type AppData } from "../src/domain/models";
import { planNotifications } from "../src/services/notification-plan";
import {
  reconcileNotifications,
  type NotificationAdapter,
} from "../src/services/notification-worker";
import type { Store } from "../src/repositories/store";
function data(): AppData {
  const d = emptyData();
  d.tanks.push({
    id: "t",
    name: "Bể",
    description: "",
    volumeLitres: null,
    waterType: "unspecified",
    groupName: "",
    coverPhotoId: null,
    archivedAt: null,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
  });
  d.schedules.push({
    id: "s",
    tankId: "t",
    activityType: "water_change",
    title: "Thay nước",
    intervalDays: 7,
    targetPercent: 30,
    initialDueDate: "2026-10-28",
    enabled: true,
    manualNextDueDate: null,
    manualBasisLogId: null,
    revision: 1,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
  });
  d.reminders.push({
    scheduleId: "s",
    enabled: true,
    localTime: "09:00",
    leadDays: 1,
    overdueOnce: true,
    snoozedUntil: null,
    snoozeRevision: null,
  });
  return d;
}
const time = (date: string, t: string) => new Date(date + "T" + t + ":00Z");
test("catchup is persisted once and never regenerated after consumed or cancelled", () => {
  let d = data();
  let p = planNotifications(d, "2026-11-02T10:00:00Z", time);
  const job = p.jobs.find((j) => j.kind === "catchup")!;
  assert.equal(job.fireAt, "2026-11-03T09:00:00.000Z");
  d.jobs = p.jobs;
  p = planNotifications(d, "2026-11-04T10:00:00Z", time);
  assert.equal(p.selected.length, 0);
  assert.equal(
    p.jobs.find((j) => j.logicalKey === job.logicalKey)?.status,
    "consumed",
  );
  d.jobs = p.jobs;
  assert.equal(
    planNotifications(d, "2026-11-05T10:00:00Z", time).selected.length,
    0,
  );
});
test("snooze replaces all reminders and does not resume old candidates after firing", () => {
  const d = data();
  d.reminders[0]!.snoozedUntil = "2026-10-28T12:00:00Z";
  d.reminders[0]!.snoozeRevision = 1;
  const p = planNotifications(d, "2026-10-27T10:00:00Z", time);
  assert.deepEqual(
    p.selected.map((j) => j.kind),
    ["snooze"],
  );
  d.jobs = p.jobs;
  assert.equal(
    planNotifications(d, "2026-10-28T13:00:00Z", time).selected.length,
    0,
  );
});
test("global budget selects 48 earliest jobs with stable ties and horizon", () => {
  const d = data();
  for (let i = 0; i < 30; i++) {
    d.schedules.push({ ...d.schedules[0]!, id: "s" + i });
    d.reminders.push({ ...d.reminders[0]!, scheduleId: "s" + i });
  }
  const p = planNotifications(d, "2026-10-26T10:00:00Z", time);
  assert.equal(p.selected.length, 48);
  assert.equal(p.budgetExceeded, true);
  d.schedules.forEach((s) => (s.initialDueDate = "2027-01-01"));
  assert.equal(
    planNotifications(d, "2026-10-26T10:00:00Z", time).selected.length,
    0,
  );
});
test("worker adopts existing OS logical key after crash and retries errors without losing data", async () => {
  const d = data();
  let state = d;
  const store: Store = {
    read: async () => structuredClone(state),
    write: async (fn) => {
      const copy = structuredClone(state);
      const r = await fn(copy);
      state = copy;
      return r;
    },
  };
  const now = "2026-10-27T10:00:00Z";
  const desired = planNotifications(d, now).selected;
  let creates = 0;
  const os = desired.map((j, i) => ({
    id: "os" + i,
    logicalKey: j.logicalKey,
    fireAt: j.fireAt,
  }));
  const adapter: NotificationAdapter = {
    permission: async () => true,
    list: async () => os,
    cancel: async () => {},
    schedule: async () => {
      creates++;
      return "new";
    },
  };
  await reconcileNotifications(store, adapter, () => now);
  assert.equal(creates, 0);
  assert.ok(state.jobs.every((j) => j.osId));
  adapter.list = async () => [];
  adapter.schedule = async () => {
    throw Error("OS unavailable");
  };
  await reconcileNotifications(store, adapter, () => now);
  assert.ok(state.settings.notificationError);
  assert.equal(state.tanks.length, 1);
});
test("a revision changing during OS scheduling cancels stale jobs before returning", async () => {
  let state = data();
  const store: Store = {
    read: async () => structuredClone(state),
    write: async (fn) => {
      const copy = structuredClone(state);
      const r = await fn(copy);
      state = copy;
      return r;
    },
  };
  const pending: { id: string; logicalKey: string; fireAt: string }[] = [];
  let changed = false;
  const adapter: NotificationAdapter = {
    permission: async () => true,
    list: async () => [...pending],
    cancel: async (id) => {
      const index = pending.findIndex((p) => p.id === id);
      if (index >= 0) pending.splice(index, 1);
    },
    schedule: async (job) => {
      const id = "os" + pending.length;
      pending.push({ id, logicalKey: job.logicalKey, fireAt: job.fireAt });
      if (!changed) {
        changed = true;
        await store.write((d) => {
          d.schedules[0]!.revision = 2;
          d.schedules[0]!.initialDueDate = "2026-11-01";
        });
      }
      return id;
    },
  };
  await reconcileNotifications(store, adapter, () => "2026-10-27T10:00:00Z");
  assert.ok(pending.length > 0);
  assert.ok(pending.every((p) => p.logicalKey.startsWith("s:2:")));
});
test("changing language replaces pending notification content without changing care state", async () => {
  let state = data();
  let lang = "vi";
  const store: Store = {
    read: async () => structuredClone(state),
    write: async (fn) => {
      const copy = structuredClone(state);
      const value = await fn(copy);
      state = copy;
      return value;
    },
  };
  const pending: {
    id: string;
    logicalKey: string;
    fireAt: string;
    language?: string;
  }[] = [];
  const adapter: NotificationAdapter = {
    permission: async () => true,
    list: async () => [...pending],
    cancel: async (id) => {
      const at = pending.findIndex((p) => p.id === id);
      if (at >= 0) pending.splice(at, 1);
    },
    schedule: async (job, d) => {
      const id = "os-" + Math.random();
      pending.push({
        id,
        logicalKey: job.logicalKey,
        fireAt: job.fireAt,
        language: d.settings.language,
      });
      return id;
    },
  };
  await reconcileNotifications(store, adapter, () => "2026-10-27T10:00:00Z");
  assert.ok(pending.length);
  const schedules = structuredClone(state.schedules);
  state.settings.language = "en";
  await reconcileNotifications(store, adapter, () => "2026-10-27T10:00:00Z");
  assert.ok(pending.every((p) => p.language === "en"));
  assert.deepEqual(state.schedules, schedules);
});
test("notification content uses persisted language and preserves tank names", async () => {
  const { buildNotificationContent } =
    await import("../src/services/notification-content");
  const d = data();
  for (const [language] of languageOptions) {
    d.settings.language = language;
    const job = planNotifications(d, "2026-10-27T10:00:00Z", time).selected[0]!;
    const content = buildNotificationContent(job, d);
    assert.equal(content.data.language, language);
    assert.ok(content.body.startsWith("Bể · "));
    assert.ok(
      content.body.includes(locales[language].messages["activity.waterChange"]),
    );
    assert.ok(
      [
        locales[language].messages["notification.upcomingTitle"],
        locales[language].messages["notification.overdueTitle"],
        locales[language].messages["notification.dueTitle"],
      ].includes(content.title),
    );
  }
});
test("language changes during OS scheduling immediately reconcile the new language", async () => {
  let state = data(),
    changed = false;
  const store: Store = {
    read: async () => structuredClone(state),
    write: async (fn) => {
      const copy = structuredClone(state);
      const result = await fn(copy);
      state = copy;
      return result;
    },
  };
  const pending: {
    id: string;
    logicalKey: string;
    fireAt: string;
    language: string;
  }[] = [];
  const adapter: NotificationAdapter = {
    permission: async () => true,
    list: async () => [...pending],
    cancel: async (id) => {
      const i = pending.findIndex((p) => p.id === id);
      if (i >= 0) pending.splice(i, 1);
    },
    schedule: async (job, d) => {
      const id = "os-" + Math.random();
      pending.push({
        id,
        logicalKey: job.logicalKey,
        fireAt: job.fireAt,
        language: d.settings.language,
      });
      if (!changed) {
        changed = true;
        await store.write((current) => {
          current.settings.language = "en";
        });
      }
      return id;
    },
  };
  await reconcileNotifications(store, adapter, () => "2026-10-27T10:00:00Z");
  assert.ok(pending.length > 0);
  assert.ok(pending.every((p) => p.language === "en"));
});
