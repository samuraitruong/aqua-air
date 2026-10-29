import { t as tr, isLanguage, activityKeys } from "../i18n";
import type { Store } from "../repositories/store";
import {
  emptyData,
  type AppData,
  type Tank,
  type Schedule,
  type CareLog,
  type Photo,
  type Reminder,
} from "../domain/models";
import {
  validateTank,
  validateSchedule,
  validateLog,
  requireValue,
  DomainError,
} from "../domain/validation";
import { totalTankVolume } from "../domain/tank-volume";
import { validateWaterRate } from "../domain/water-usage";
import { latestLog } from "../domain/scheduling";
import { localDate, normalize, isDate } from "../domain/dates";
export const activityLabels = activityKeys;
type TankInput = Pick<
  Tank,
  | "name"
  | "description"
  | "volumeLitres"
  | "waterType"
  | "groupName"
  | "coverPhotoId"
  | "lengthCm"
  | "widthCm"
  | "heightCm"
  | "hasSump"
  | "sumpVolumeLitres"
  | "hasCanister"
>;
type ScheduleInput = Pick<
  Schedule,
  | "tankId"
  | "activityType"
  | "title"
  | "intervalDays"
  | "targetPercent"
  | "initialDueDate"
  | "enabled"
> & {
  id?: string;
};
type LogInput = Omit<
  CareLog,
  | "id"
  | "titleSnapshot"
  | "createdAt"
  | "updatedAt"
  | "waterCapacityLitres"
  | "waterCapacityRecorded"
> & {
  id?: string;
};
export class CareService {
  constructor(
    public store: Store,
    private uuid: () => string,
    private clock: () => string = () => new Date().toISOString(),
  ) {}
  private find<
    T extends {
      id: string;
    },
  >(rows: T[], id: string): T {
    const row = rows.find((x) => x.id === id);
    if (!row) throw new DomainError("NOT_FOUND", tr("error.notFound"));
    return row;
  }
  private dirty(d: AppData, s: Schedule, reason: string, clearManual = true) {
    s.revision++;
    s.updatedAt = this.clock();
    if (clearManual) {
      s.manualNextDueDate = null;
      s.manualBasisLogId = null;
    }
    const r = d.reminders.find((r) => r.scheduleId === s.id);
    if (r) {
      r.snoozedUntil = null;
      r.snoozeRevision = null;
    }
    d.outbox.push({
      id: this.uuid(),
      reason,
      scheduleId: s.id,
      createdAt: this.clock(),
      processedAt: null,
    });
  }
  private schedule(d: AppData, input: ScheduleInput): string {
    const tank = this.find(d.tanks, input.tankId);
    requireValue(
      !tank.archivedAt,
      tr("messages.restoreThisTankBeforeCreatingOrEditingSchedules"),
    );
    const previous = input.id ? this.find(d.schedules, input.id) : undefined;
    requireValue(
      !previous || previous.tankId === input.tankId,
      tr("messages.aScheduleCannotBeMovedToAnotherTank"),
    );
    if (previous && previous.activityType !== input.activityType)
      requireValue(
        !d.logs.some((l) => l.scheduleId === previous.id),
        tr("messages.thisScheduleAlreadyHasActivitiesCreateANew"),
      );
    const now = this.clock();
    const s = validateSchedule({
      ...input,
      id: previous?.id ?? this.uuid(),
      manualNextDueDate: previous?.manualNextDueDate ?? null,
      manualBasisLogId: previous?.manualBasisLogId ?? null,
      revision: previous?.revision ?? 0,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    });
    requireValue(
      !s.enabled ||
        !d.schedules.some(
          (x) =>
            x.id !== s.id &&
            x.tankId === s.tankId &&
            x.enabled &&
            x.activityType === s.activityType &&
            (s.activityType !== "other" ||
              normalize(x.title) === normalize(s.title)),
        ),
      tr("messages.thisTankAlreadyHasAnActiveScheduleFor"),
    );
    if (previous) d.schedules[d.schedules.indexOf(previous)] = s;
    else {
      d.schedules.push(s);
      d.reminders.push({
        scheduleId: s.id,
        enabled: false,
        localTime: d.settings.defaultTime,
        leadDays: 0,
        overdueOnce: false,
        snoozedUntil: null,
        snoozeRevision: null,
      });
    }
    this.dirty(
      d,
      s,
      "schedule",
      !previous || previous.intervalDays !== s.intervalDays,
    );
    return s.id;
  }
  async createTank(
    input: TankInput,
    initial?: {
      intervalDays: number;
      targetPercent: number | null;
      initialDueDate: string;
    },
    photo?: Photo,
  ): Promise<string> {
    return this.store.write((d) => {
      const now = this.clock();
      if (photo) d.photos.push(photo);
      const t = validateTank({
        ...input,
        id: this.uuid(),
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      });
      d.tanks.push(t);
      if (initial)
        this.schedule(d, {
          ...initial,
          tankId: t.id,
          activityType: "water_change",
          title: activityKeys.water_change,
          enabled: true,
        });
      return t.id;
    });
  }
  async updateTank(id: string, input: TankInput, photo?: Photo) {
    return this.store.write((d) => {
      const old = this.find(d.tanks, id);
      if (photo) d.photos.push(photo);
      Object.assign(
        old,
        validateTank({
          ...old,
          ...input,
          updatedAt: this.clock(),
        }),
      );
      for (const s of d.schedules.filter((s) => s.tankId === id))
        this.dirty(d, s, "tank", false);
      this.collectPhotos(d);
    });
  }
  private collectPhotos(d: AppData) {
    const used = new Set(d.tanks.map((t) => t.coverPhotoId));
    d.photos = d.photos.filter((p) => used.has(p.id));
  }
  async saveLog(input: LogInput): Promise<string> {
    return this.store.write((d) => {
      const duplicate = d.logs.find(
        (l) => l.idempotencyKey === input.idempotencyKey,
      );
      if (!input.id && duplicate) return duplicate.id;
      const old = input.id ? this.find(d.logs, input.id) : undefined;
      requireValue(
        !old || old.tankId === input.tankId,
        tr("messages.anActivityCannotBeMovedToAnotherTank"),
      );
      const t = this.find(d.tanks, input.tankId);
      requireValue(
        !t.archivedAt,
        tr("messages.thisTankIsArchivedRestoreItToLog"),
      );
      const s = input.scheduleId
        ? this.find(d.schedules, input.scheduleId)
        : undefined;
      requireValue(
        !s ||
          (s.tankId === input.tankId && s.activityType === input.activityType),
        tr("validation.theScheduleMustMatchTheTankAndActivity"),
      );
      const now = this.clock();
      const typeChanged = old && old.activityType !== input.activityType;
      const l = validateLog(
        {
          ...input,
          id: old?.id ?? this.uuid(),
          waterCapacityRecorded:
            input.activityType === "water_change" &&
            (old?.activityType === "water_change"
              ? !!old.waterCapacityRecorded
              : true),
          waterCapacityLitres:
            input.activityType !== "water_change"
              ? null
              : old?.activityType === "water_change"
                ? (old.waterCapacityLitres ?? null)
                : totalTankVolume(t),
          titleSnapshot:
            old &&
            old.scheduleId === input.scheduleId &&
            old.activityType === input.activityType
              ? old.titleSnapshot
              : (s?.title ?? activityLabels[input.activityType]),
          createdAt: old?.createdAt ?? now,
          updatedAt: now,
          nextDueOverrideDate: typeChanged ? null : input.nextDueOverrideDate,
        },
        now,
      );
      requireValue(
        l.performedLocalDate <= localDate(new Date(now)),
        tr("validation.thePerformedDateCannotBeInTheFuture"),
      );
      if (old) d.logs[d.logs.indexOf(old)] = l;
      else d.logs.push(l);
      const ids = new Set([old?.scheduleId, l.scheduleId]);
      for (const id of ids) {
        const affected = d.schedules.find((s) => s.id === id);
        if (affected) this.dirty(d, affected, "log");
      }
      return l.id;
    });
  }
  async deleteLog(id: string) {
    return this.store.write((d) => {
      const l = this.find(d.logs, id);
      d.logs = d.logs.filter((x) => x.id !== id);
      const s = d.schedules.find((s) => s.id === l.scheduleId);
      if (s) this.dirty(d, s, "delete-log");
    });
  }
  async upsertSchedule(
    input: ScheduleInput,
    reminder?: Omit<Reminder, "scheduleId" | "snoozedUntil" | "snoozeRevision">,
    options?: {
      nextDueDate: string | null;
    },
  ) {
    return this.store.write((d) => {
      const id = this.schedule(d, input);
      if (options) {
        const date = options.nextDueDate;
        requireValue(
          date === null ||
            (isDate(date) && date >= localDate(new Date(this.clock()))),
          tr("validation.theDueDateMustBeTodayOrLater"),
        );
        const schedule = this.find(d.schedules, id);
        schedule.manualNextDueDate = date;
        schedule.manualBasisLogId = date
          ? (latestLog(d.logs.filter((l) => l.scheduleId === id))?.id ?? null)
          : null;
      }
      if (reminder) {
        this.validateReminder(reminder);
        Object.assign(d.reminders.find((r) => r.scheduleId === id)!, reminder);
      }
      return id;
    });
  }
  private validateReminder(r: { localTime: string; leadDays: number }) {
    requireValue(
      /^([01]\d|2[0-3]):[0-5]\d$/.test(r.localTime),
      tr("validation.invalidReminderTime"),
    );
    requireValue(
      [0, 1, 2].includes(r.leadDays),
      tr("validation.advanceRemindersCanBeUpTo2Days"),
    );
  }
  async saveReminder(
    id: string,
    input: Omit<Reminder, "scheduleId" | "snoozedUntil" | "snoozeRevision">,
  ) {
    this.validateReminder(input);
    return this.store.write((d) => {
      const s = this.find(d.schedules, id);
      Object.assign(d.reminders.find((r) => r.scheduleId === id)!, input);
      this.dirty(d, s, "reminder", false);
    });
  }
  async setNextDue(id: string, date: string | null) {
    requireValue(
      date === null ||
        (isDate(date) && date >= localDate(new Date(this.clock()))),
      tr("validation.theDueDateMustBeTodayOrLater"),
    );
    return this.store.write((d) => {
      const s = this.find(d.schedules, id);
      this.dirty(d, s, "manual");
      s.manualNextDueDate = date;
      s.manualBasisLogId = date
        ? (latestLog(d.logs.filter((l) => l.scheduleId === id))?.id ?? null)
        : null;
    });
  }
  async followCycle(id: string) {
    return this.store.write((d) => {
      const s = this.find(d.schedules, id);
      const l = latestLog(d.logs.filter((l) => l.scheduleId === id));
      if (l) l.nextDueOverrideDate = null;
      this.dirty(d, s, "cycle");
    });
  }
  async snooze(id: string, until: string) {
    requireValue(
      Number.isFinite(Date.parse(until)) &&
        Date.parse(until) > Date.parse(this.clock()),
      tr("messages.chooseAReminderTimeInTheFuture"),
    );
    return this.store.write((d) => {
      const s = this.find(d.schedules, id);
      requireValue(
        s.enabled && !this.find(d.tanks, s.tankId).archivedAt,
        tr("messages.thisScheduleIsPaused"),
      );
      const r = d.reminders.find((r) => r.scheduleId === id)!;
      r.snoozedUntil = until;
      r.snoozeRevision = s.revision;
      d.outbox.push({
        id: this.uuid(),
        reason: "snooze",
        scheduleId: id,
        createdAt: this.clock(),
        processedAt: null,
      });
    });
  }
  async archiveTank(id: string, archive: boolean) {
    return this.store.write((d) => {
      const t = this.find(d.tanks, id);
      t.archivedAt = archive ? this.clock() : null;
      t.updatedAt = this.clock();
      for (const s of d.schedules.filter((s) => s.tankId === id))
        this.dirty(d, s, "archive", false);
    });
  }
  async deleteTank(id: string) {
    return this.store.write((d) => {
      const t = this.find(d.tanks, id);
      requireValue(
        t.archivedAt,
        tr("messages.onlyArchivedTanksCanBePermanentlyDeleted"),
      );
      const ids = new Set(
        d.schedules.filter((s) => s.tankId === id).map((s) => s.id),
      );
      const waterIds = new Set(
        d.waterReadings.filter((r) => r.tankId === id).map((r) => r.id),
      );
      d.waterValues = d.waterValues.filter((v) => !waterIds.has(v.readingId));
      d.waterReadings = d.waterReadings.filter((r) => r.tankId !== id);
      d.waterParameters = d.waterParameters.filter((p) => p.tankId !== id);
      d.logs = d.logs.filter((l) => l.tankId !== id);
      d.reminders = d.reminders.filter((r) => !ids.has(r.scheduleId));
      d.jobs = d.jobs.filter((j) => !ids.has(j.scheduleId));
      d.schedules = d.schedules.filter((s) => s.tankId !== id);
      d.tanks = d.tanks.filter((t) => t.id !== id);
      this.collectPhotos(d);
      d.outbox.push({
        id: this.uuid(),
        reason: "delete-tank",
        scheduleId: null,
        createdAt: this.clock(),
        processedAt: null,
      });
    });
  }
  async deleteSchedule(id: string) {
    return this.store.write((d) => {
      this.find(d.schedules, id);
      d.logs.forEach((l) => {
        if (l.scheduleId === id) {
          l.scheduleId = null;
          l.nextDueOverrideDate = null;
        }
      });
      d.schedules = d.schedules.filter((s) => s.id !== id);
      d.reminders = d.reminders.filter((r) => r.scheduleId !== id);
      d.jobs = d.jobs.filter((j) => j.scheduleId !== id);
      d.outbox.push({
        id: this.uuid(),
        reason: "delete-schedule",
        scheduleId: null,
        createdAt: this.clock(),
        processedAt: null,
      });
    });
  }
  async setLanguage(language: import("../i18n").Language) {
    requireValue(isLanguage(language), tr("validation.unsupportedLanguage"));
    return this.store.write((d) => {
      d.settings.language = language;
      d.outbox.push({
        id: this.uuid(),
        reason: "language",
        scheduleId: null,
        createdAt: this.clock(),
        processedAt: null,
      });
    });
  }
  async setWaterRate(rate: import("../domain/models").WaterRate | null) {
    if (rate !== null) validateWaterRate(rate);
    return this.store.write((d) => {
      d.settings.waterRate = rate === null ? null : { ...rate };
    });
  }
  async setDefaultTime(time: string) {
    this.validateReminder({
      localTime: time,
      leadDays: 0,
    });
    return this.store.write((d) => {
      d.settings.defaultTime = time;
    });
  }
  async reset() {
    return this.store.write((d) => Object.assign(d, emptyData()));
  }
}
