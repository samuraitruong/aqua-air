import { normalizeTankGeometry } from "./tank-volume";
import { t as tr } from "../i18n";
import {
  activityTypes,
  waterTypes,
  type Tank,
  type Schedule,
  type CareLog,
} from "./models";
import { isDate, isTimestamp } from "./dates";
import { requireValue } from "./error";
export { DomainError, requireValue } from "./error";
export function validateTank<
  T extends Omit<Tank, "volumeLitres"> & {
    volumeLitres: unknown;
  },
>(
  input: T,
): Omit<T, "volumeLitres"> & {
  volumeLitres: number | null;
} & ReturnType<typeof normalizeTankGeometry> {
  const name = input.name.trim(),
    groupName = input.groupName.trim();
  const geometry = normalizeTankGeometry(input);
  requireValue(
    name.length >= 1 && name.length <= 60,
    tr("messages.theTankNameMustContain1To60"),
    "name",
  );
  requireValue(
    groupName.length <= 60,
    tr("validation.theGroupOrShelfNameMustBeNo"),
    "groupName",
  );
  requireValue(
    input.description.length <= 2000,
    tr("validation.theDescriptionMustBeNoMoreThan2"),
    "description",
  );
  requireValue(
    waterTypes.includes(input.waterType),
    tr("validation.invalidWaterType"),
  );
  return {
    ...input,
    name,
    groupName,
    ...geometry,
  };
}
export function validateSchedule(s: Schedule): Schedule {
  requireValue(
    activityTypes.includes(s.activityType),
    tr("validation.invalidActivityType"),
  );
  requireValue(
    s.title.trim().length > 0 && s.title.trim().length <= 60,
    tr("messages.theScheduleNameMustContain1To60"),
  );
  requireValue(
    Number.isInteger(s.intervalDays) &&
      s.intervalDays >= 1 &&
      s.intervalDays <= 365,
    tr("validation.theIntervalMustBeAWholeNumberFrom"),
  );
  requireValue(isDate(s.initialDueDate), tr("validation.invalidFirstDueDate"));
  requireValue(
    s.manualNextDueDate === null || isDate(s.manualNextDueDate),
    tr("validation.invalidCustomDate"),
  );
  requireValue(
    s.targetPercent === null ||
      (Number.isInteger(s.targetPercent) &&
        s.targetPercent >= 1 &&
        s.targetPercent <= 100),
    tr("validation.theTargetPercentageMustBeAWholeNumber"),
  );
  return {
    ...s,
    title: s.title.trim(),
    targetPercent: s.activityType === "water_change" ? s.targetPercent : null,
  };
}
export function validateLog(l: CareLog, now: string): CareLog {
  requireValue(
    activityTypes.includes(l.activityType),
    tr("validation.invalidActivityType"),
  );
  requireValue(
    isTimestamp(l.performedAt) && Date.parse(l.performedAt) <= Date.parse(now),
    tr("validation.thePerformedTimeCannotBeInTheFuture"),
  );
  requireValue(
    isDate(l.performedLocalDate),
    tr("validation.invalidPerformedDate"),
  );
  requireValue(
    l.notes.length <= 2000,
    tr("validation.notesMustBeNoMoreThan2000"),
  );
  if (l.activityType === "water_change")
    requireValue(
      Number.isInteger(l.percent) && l.percent! >= 1 && l.percent! <= 100,
      tr("validation.theWaterChangePercentageMustBeAWhole"),
    );
  requireValue(
    !l.nextDueOverrideDate ||
      (isDate(l.nextDueOverrideDate) &&
        l.nextDueOverrideDate > l.performedLocalDate),
    tr("validation.theNextDueDateMustBeAfterThe"),
  );
  return {
    ...l,
    performedAt: new Date(l.performedAt).toISOString(),
    percent: l.activityType === "water_change" ? l.percent : null,
    nextDueOverrideDate: l.scheduleId ? l.nextDueOverrideDate : null,
  };
}
