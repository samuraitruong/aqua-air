import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  differenceDays,
  isDate,
  normalize,
} from "../src/domain/dates";
import {
  dueDate,
  latestLog,
  taskStatus,
  projectDates,
  getTasks,
} from "../src/domain/scheduling";
import {
  validateTank,
  validateSchedule,
  validateLog,
} from "../src/domain/validation";
import type { CareLog, Schedule, Tank } from "../src/domain/models";
export const tank: Tank = {
  id: "tank",
  name: "Bể thủy sinh",
  waterType: "freshwater",
  description: "",
  groupName: "Kệ phòng khách",
  volumeLitres: 60,
  coverPhotoId: null,
  archivedAt: null,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
};
export const schedule: Schedule = {
  id: "schedule",
  tankId: "tank",
  activityType: "water_change",
  title: "Thay nước",
  intervalDays: 7,
  targetPercent: 30,
  initialDueDate: "2026-10-26",
  enabled: true,
  manualNextDueDate: null,
  manualBasisLogId: null,
  revision: 1,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
};
export function log(date: string, id = date): CareLog {
  return {
    id,
    tankId: "tank",
    scheduleId: "schedule",
    activityType: "water_change",
    titleSnapshot: "Thay nước",
    performedAt: date + "T09:00:00Z",
    performedLocalDate: date,
    percent: 30,
    notes: "",
    nextDueOverrideDate: null,
    idempotencyKey: id,
    createdAt: "2026-10-28T10:00:00Z",
    updatedAt: "2026-10-28T10:00:00Z",
  };
}
test("calendar arithmetic survives DST, leap days and year rollover", () => {
  assert.equal(addDays("2026-10-03", 2), "2026-10-05");
  assert.equal(differenceDays("2026-10-28", "2026-10-19"), 9);
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(isDate("2026-02-29"), false);
  assert.equal(isDate("2026-13-01"), false);
  assert.throws(() => addDays("bad", 1));
});
test("required due examples use performed time rather than entry order", () => {
  const old = log("2026-10-19"),
    recent = log("2026-10-28");
  assert.equal(dueDate(schedule, [old]), "2026-10-26");
  assert.equal(taskStatus("2026-10-26", "2026-10-28").days, -2);
  assert.equal(dueDate(schedule, [recent, log("2026-10-20")]), "2026-11-04");
  assert.equal(dueDate(schedule, [log("2026-10-27")]), "2026-11-03");
  assert.equal(dueDate(schedule, []), "2026-10-26");
  assert.equal(
    dueDate(schedule, [{ ...recent, nextDueOverrideDate: "2026-11-02" }]),
    "2026-11-02",
  );
  assert.equal(
    dueDate(
      {
        ...schedule,
        manualNextDueDate: "2026-11-06",
        manualBasisLogId: recent.id,
      },
      [recent],
    ),
    "2026-11-06",
  );
  assert.equal(
    dueDate(
      {
        ...schedule,
        manualNextDueDate: "2026-11-06",
        manualBasisLogId: "stale",
      },
      [recent],
    ),
    "2026-11-04",
  );
  assert.equal(
    dueDate(schedule, [{ ...recent, scheduleId: null }]),
    "2026-10-26",
  );
});
test("latest log has stable timestamp and ID tie breaks", () => {
  assert.equal(
    latestLog([{ ...log("2026-10-28", "a") }, { ...log("2026-10-28", "b") }])
      ?.id,
    "b",
  );
});
test("paused and archived tasks are excluded, projections are not overdue occurrences", () => {
  assert.equal(getTasks([tank], [schedule], [], "2026-10-28").length, 1);
  assert.equal(
    getTasks(
      [{ ...tank, archivedAt: "2026-10-28" }],
      [schedule],
      [],
      "2026-10-28",
    ).length,
    0,
  );
  assert.equal(
    getTasks([tank], [{ ...schedule, enabled: false }], [], "2026-10-28")
      .length,
    0,
  );
  assert.deepEqual(projectDates(schedule, [], "2026-10-28", "2026-11-10"), [
    "2026-11-02",
    "2026-11-09",
  ]);
  assert.throws(() => projectDates(schedule, [], "2026-01-01", "2027-01-01"));
});
test("validation rejects invalid values and accepts locale decimal input", () => {
  assert.equal(
    validateTank({ ...tank, volumeLitres: "60,5" }).volumeLitres,
    60.5,
  );
  assert.throws(() => validateTank({ ...tank, name: "  " }));
  assert.throws(() => validateTank({ ...tank, volumeLitres: 0 }));
  assert.throws(() => validateSchedule({ ...schedule, intervalDays: 0 }));
  assert.throws(() =>
    validateSchedule({ ...schedule, initialDueDate: "2026-02-30" }),
  );
  assert.throws(() =>
    validateLog({ ...log("2026-10-28"), percent: 0 }, "2026-10-28T10:00:00Z"),
  );
  assert.throws(() => validateLog(log("2026-10-29"), "2026-10-28T10:00:00Z"));
  assert.equal(normalize("KỆ thủy SINH"), "ke thuy sinh");
});
test("timestamps reject normalized impossible dates and compare equivalent ISO precision correctly", () => {
  assert.throws(() =>
    validateLog(
      { ...log("2026-02-28"), performedAt: "2026-02-30T09:00:00Z" },
      "2026-10-28T10:00:00Z",
    ),
  );
  const a = {
    ...log("2026-10-28", "a"),
    performedAt: "2026-10-28T09:00:00.500Z",
  };
  const b = { ...log("2026-10-28", "b"), performedAt: "2026-10-28T09:00:00Z" };
  assert.equal(latestLog([a, b])?.id, "a");
});
