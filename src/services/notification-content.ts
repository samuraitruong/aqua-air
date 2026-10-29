import { t, activityTitle } from "../i18n";
import type { AppData, Job } from "../domain/models";
export function buildNotificationContent(job: Job, data: AppData) {
  const schedule = data.schedules.find((s) => s.id === job.scheduleId)!;
  const tank = data.tanks.find((t) => t.id === schedule.tankId)!;
  const language = data.settings.language;
  const key =
    job.kind === "lead"
      ? "notification.upcomingTitle"
      : job.kind === "late" || job.kind === "catchup"
        ? "notification.overdueTitle"
        : "notification.dueTitle";
  return {
    title: t(key, {}, language),
    body: `${tank.name} · ${activityTitle(schedule.activityType, schedule.title, language)}${schedule.targetPercent ? ` ${schedule.targetPercent}%` : ""}`,
    data: {
      logicalKey: job.logicalKey,
      fireAt: job.fireAt,
      tankId: tank.id,
      scheduleId: schedule.id,
      scheduleRevision: schedule.revision,
      language,
    },
  };
}
