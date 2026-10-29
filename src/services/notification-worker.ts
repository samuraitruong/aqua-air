import { t as tr } from "../i18n";
import type { Store } from "../repositories/store";
import type { AppData, Job } from "../domain/models";
import { planNotifications } from "./notification-plan";
export interface PendingNotification {
  id: string;
  logicalKey: string;
  fireAt: string;
  language?: string;
}
export interface NotificationAdapter {
  permission(): Promise<boolean>;
  list(): Promise<PendingNotification[]>;
  cancel(id: string): Promise<void>;
  schedule(job: Job, data: AppData): Promise<string>;
}
const queues = new WeakMap<Store, Promise<unknown>>();
const fingerprint = (d: AppData) =>
  JSON.stringify([
    d.settings.language,
    d.schedules.map((s) => [s.id, s.revision, s.enabled]),
    d.reminders,
    d.tanks.map((t) => [t.id, t.archivedAt]),
  ]);
export function reconcileNotifications(
  store: Store,
  adapter: NotificationAdapter,
  clock = () => new Date().toISOString(),
): Promise<void> {
  const work = (queues.get(store) ?? Promise.resolve()).then(async () => {
    try {
      for (let attempt = 0; attempt < 5; attempt++) {
        const now = clock();
        const data = await store.write((d) => {
          const p = planNotifications(d, now);
          d.jobs = p.jobs;
          d.settings.budgetExceeded = p.budgetExceeded;
          return structuredCopy(d);
        });
        const source = fingerprint(data),
          outboxIds = new Set(data.outbox.map((o) => o.id));
        const plan = planNotifications(data, now),
          allowed = await adapter.permission(),
          selected = allowed ? plan.selected : [];
        const wanted = new Map(selected.map((j) => [j.logicalKey, j])),
          pending = await adapter.list(),
          existing = new Map<string, string>();
        for (const p of pending) {
          if (
            !wanted.has(p.logicalKey) ||
            existing.has(p.logicalKey) ||
            (p.language ?? "vi") !== data.settings.language
          )
            await adapter.cancel(p.id);
          else existing.set(p.logicalKey, p.id);
        }
        const scheduled = new Map<string, string>();
        for (const job of selected) {
          const osId =
            existing.get(job.logicalKey) ?? (await adapter.schedule(job, data));
          scheduled.set(job.logicalKey, osId);
        }
        // Record all OS results in one transaction, not one full-history transaction per job.
        const changed = await store.write((d) => {
          const changed = fingerprint(d) !== source;
          for (const j of d.jobs) {
            const osId = scheduled.get(j.logicalKey);
            if (
              osId &&
              d.schedules.find((s) => s.id === j.scheduleId)?.revision ===
                j.revision &&
              j.status !== "cancelled"
            ) {
              j.osId = osId;
              j.status = "scheduled";
              j.lastError = null;
            } else if (
              j.status === "scheduled" &&
              !scheduled.has(j.logicalKey)
            ) {
              j.osId = null;
              j.status = "desired";
            }
          }
          if (!changed) {
            for (const o of d.outbox)
              if (outboxIds.has(o.id)) o.processedAt = now;
            d.outbox = d.outbox.filter((o) => o.processedAt === null);
            // All stale OS jobs have been cancelled above; only current-revision tombstones are needed.
            d.jobs = d.jobs.filter(
              (j) =>
                d.schedules.find((s) => s.id === j.scheduleId)?.revision ===
                j.revision,
            );
          }
          d.settings.notificationError = allowed
            ? null
            : d.reminders.some((r) => r.enabled)
              ? "notification.permissionBlocked"
              : null;
          return changed;
        });
        if (!changed) return;
        // New revisions/snoozes arrived while talking to the OS: reconcile immediately.
      }
      throw Error("Notification state kept changing");
    } catch {
      await store.write((d) => {
        d.settings.notificationError = "notification.retryMessage";
      });
    }
  });
  queues.set(
    store,
    work.catch(() => {}),
  );
  return work;
}
function structuredCopy(d: AppData): AppData {
  return JSON.parse(JSON.stringify(d));
}
