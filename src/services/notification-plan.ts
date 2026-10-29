import { type AppData, type Job, type JobKind } from "../domain/models";
import { dueDate } from "../domain/scheduling";
import { addDays, atLocalTime, localDate } from "../domain/dates";
export function planNotifications(
  data: AppData,
  now: string,
  toTime = atLocalTime,
) {
  const jobs = data.jobs.map((j) => ({
    ...j,
  }));
  const time = Date.parse(now),
    horizon = time + 30 * 86400000;
  const active = new Map(
    data.schedules
      .filter(
        (s) =>
          s.enabled &&
          !data.tanks.find((t) => t.id === s.tankId)?.archivedAt &&
          data.reminders.find((r) => r.scheduleId === s.id)?.enabled,
      )
      .map((s) => [s.id, s]),
  );
  for (const job of jobs) {
    if (
      !active.has(job.scheduleId) ||
      active.get(job.scheduleId)!.revision !== job.revision
    )
      job.status = "cancelled";
    else if (Date.parse(job.fireAt) <= time && job.status !== "cancelled")
      job.status = "consumed";
  }
  const wanted = new Set<string>();
  for (const s of active.values()) {
    const r = data.reminders.find((r) => r.scheduleId === s.id)!;
    const due = dueDate(s, data.logs);
    const snoozed = r.snoozeRevision === s.revision && r.snoozedUntil !== null;
    const add = (kind: JobKind, fireAt: string) => {
      const key =
        kind === "catchup"
          ? `${s.id}:${s.revision}:catchup`
          : `${s.id}:${s.revision}:${kind}:${fireAt}`;
      wanted.add(key);
      const old = jobs.find((j) => j.logicalKey === key);
      if (old) return;
      if (Date.parse(fireAt) <= time) return;
      jobs.push({
        logicalKey: key,
        scheduleId: s.id,
        revision: s.revision,
        kind,
        fireAt,
        osId: null,
        status: "desired",
        lastError: null,
        createdAt: now,
        updatedAt: now,
      });
    };
    if (snoozed) {
      add("snooze", r.snoozedUntil!);
      continue;
    }
    if (r.leadDays)
      add("lead", toTime(addDays(due, -r.leadDays), r.localTime).toISOString());
    add("due", toTime(due, r.localTime).toISOString());
    if (r.overdueOnce) {
      const late = toTime(addDays(due, 1), r.localTime).toISOString();
      add("late", late);
      if (Date.parse(late) < time) {
        const old = jobs.find(
          (j) => j.logicalKey === `${s.id}:${s.revision}:catchup`,
        );
        if (old) wanted.add(old.logicalKey);
        else {
          let date = localDate(new Date(now));
          let next = toTime(date, r.localTime);
          if (next.valueOf() <= time)
            next = toTime(addDays(date, 1), r.localTime);
          add("catchup", next.toISOString());
        }
      }
    }
  }
  for (const j of jobs)
    if (!wanted.has(j.logicalKey) && j.status !== "consumed")
      j.status = "cancelled";
  const candidates = jobs
    .filter(
      (j) =>
        wanted.has(j.logicalKey) &&
        !["cancelled", "consumed"].includes(j.status) &&
        Date.parse(j.fireAt) > time &&
        Date.parse(j.fireAt) <= horizon,
    )
    .sort(
      (a, b) =>
        a.fireAt.localeCompare(b.fireAt) ||
        a.scheduleId.localeCompare(b.scheduleId) ||
        a.kind.localeCompare(b.kind),
    );
  return {
    jobs,
    selected: candidates.slice(0, 48),
    budgetExceeded: candidates.length > 48,
  };
}
