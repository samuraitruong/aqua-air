import { getLocale } from "../i18n";
import type { AppData, Tank, CareLog, Task } from "./models";
import { getTasks, projectDates, latestLog } from "./scheduling";
import { normalize } from "./dates";
export function dashboard(d: AppData, today: string) {
  const tasks = getTasks(d.tanks, d.schedules, d.logs, today);
  return {
    tasks,
    need: tasks.filter((t) => t.status.days <= 0),
    upcoming: tasks.filter((t) => t.status.days > 0 && t.status.days <= 7),
    tanks: d.tanks.filter((t) => !t.archivedAt),
  };
}
export function filterTanks(
  d: AppData,
  query: string,
  filter: string,
  sort: string,
  today: string,
): Tank[] {
  const tasks = getTasks(d.tanks, d.schedules, d.logs, today);
  const next = new Map<string, string>();
  for (const t of tasks) if (!next.has(t.tank.id)) next.set(t.tank.id, t.due);
  const search = normalize(query);
  return d.tanks
    .filter(
      (t) =>
        !t.archivedAt &&
        normalize(t.name + " " + t.groupName).includes(search) &&
        (filter === "all" ||
          tasks.some(
            (x) =>
              x.tank.id === t.id &&
              (filter === "need"
                ? x.status.days <= 0
                : x.status.days > 0 && x.status.days <= 7),
          )),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name, getLocale(d.settings.language))
        : (next.get(a.id) ?? "9999").localeCompare(next.get(b.id) ?? "9999") ||
          a.name.localeCompare(b.name, getLocale(d.settings.language)),
    );
}
export function lastWaterChange(d: AppData, tankId: string) {
  return latestLog(
    d.logs.filter(
      (l) => l.tankId === tankId && l.activityType === "water_change",
    ),
  );
}
export type CalendarItem =
  | {
      kind: "due" | "projected";
      task: Task;
      date: string;
    }
  | {
      kind: "log";
      log: CareLog;
      date: string;
    };
export function calendarItems(
  d: AppData,
  date: string,
  today: string,
  tankId = "",
  type = "",
): CalendarItem[] {
  const items: CalendarItem[] = [];
  for (const task of getTasks(d.tanks, d.schedules, d.logs, today)) {
    if (
      (tankId && task.tank.id !== tankId) ||
      (type && task.schedule.activityType !== type)
    )
      continue;
    if (task.due === date || (date === today && task.due < today))
      items.push({
        kind: "due",
        task,
        date: task.due,
      });
    else if (projectDates(task.schedule, d.logs, date, date).includes(date))
      items.push({
        kind: "projected",
        task,
        date,
      });
  }
  for (const log of d.logs)
    if (
      log.performedLocalDate === date &&
      (!tankId || log.tankId === tankId) &&
      (!type || log.activityType === type)
    )
      items.push({
        kind: "log",
        log,
        date,
      });
  return items;
}
