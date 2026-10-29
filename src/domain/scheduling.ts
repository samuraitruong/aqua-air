import { UserFacingError } from "./error";
import { t as tr } from "../i18n";
import type { CareLog, Schedule, Tank, Task } from "./models";
import { addDays, differenceDays } from "./dates";
export function latestLog(logs: CareLog[]): CareLog | undefined {
  return logs.reduce<CareLog | undefined>(
    (last, l) => (!last || compareLogs(last, l) < 0 ? l : last),
    undefined,
  );
}
export function compareLogs(a: CareLog, b: CareLog): number {
  return (
    Date.parse(a.performedAt) - Date.parse(b.performedAt) ||
    Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
    a.id.localeCompare(b.id)
  );
}
export function dueDate(s: Schedule, logs: CareLog[]): string {
  const l = latestLog(logs.filter((l) => l.scheduleId === s.id));
  if (s.manualNextDueDate && s.manualBasisLogId === (l?.id ?? null))
    return s.manualNextDueDate;
  return l
    ? (l.nextDueOverrideDate ?? addDays(l.performedLocalDate, s.intervalDays))
    : s.initialDueDate;
}
export function taskStatus(due: string, today: string) {
  const days = differenceDays(due, today);
  return {
    days,
    kind:
      days < 0
        ? "overdue"
        : days === 0
          ? "today"
          : days <= 7
            ? "upcoming"
            : "future",
    label:
      days < 0
        ? tr("status.overdueDays", {
            0: -days,
          })
        : days === 0
          ? tr("status.today")
          : tr("status.dueInDays", {
              0: days,
            }),
  } as const;
}
export function getTasks(
  tanks: Tank[],
  schedules: Schedule[],
  logs: CareLog[],
  today: string,
): Task[] {
  const active = new Map(
    tanks.filter((t) => !t.archivedAt).map((t) => [t.id, t]),
  );
  return schedules
    .filter((s) => s.enabled && active.has(s.tankId))
    .map((s) => {
      const due = dueDate(s, logs);
      return {
        tank: active.get(s.tankId)!,
        schedule: s,
        due,
        status: taskStatus(due, today),
      };
    })
    .sort(
      (a, b) =>
        a.due.localeCompare(b.due) ||
        a.schedule.id.localeCompare(b.schedule.id),
    );
}
export function projectDates(
  s: Schedule,
  logs: CareLog[],
  start: string,
  end: string,
): string[] {
  const span = differenceDays(end, start);
  if (span < 0 || span > 90)
    throw new UserFacingError("validation.chooseADateRangeOfNoMoreThan");
  let next = dueDate(s, logs);
  if (next < start)
    next = addDays(
      next,
      Math.ceil(differenceDays(start, next) / s.intervalDays) * s.intervalDays,
    );
  const dates: string[] = [];
  while (next <= end) {
    dates.push(next);
    next = addDays(next, s.intervalDays);
  }
  return dates;
}
