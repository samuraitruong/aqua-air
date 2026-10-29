import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyData } from "../src/domain/models";
import { filterTanks, calendarItems, dashboard } from "../src/domain/selectors";
const d = emptyData();
d.tanks.push({
  id: "t",
  name: "Bể Thủy Sinh",
  groupName: "Kệ Phòng Khách",
  description: "",
  volumeLitres: null,
  waterType: "freshwater",
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
  initialDueDate: "2026-10-26",
  enabled: true,
  manualNextDueDate: null,
  manualBasisLogId: null,
  revision: 1,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
});
test("tank search ignores Vietnamese accents/case and archived tanks", () => {
  assert.equal(
    filterTanks(d, "ke phong khach", "all", "due", "2026-10-28").length,
    1,
  );
  assert.equal(
    filterTanks(d, "THUY SINH", "all", "name", "2026-10-28").length,
    1,
  );
  assert.equal(filterTanks(d, "", "upcoming", "due", "2026-10-28").length, 0);
});
test("dashboard counts overdue schedules once and calendar distinguishes projected dates", () => {
  assert.equal(dashboard(d, "2026-10-28").need.length, 1);
  assert.equal(
    calendarItems(d, "2026-11-02", "2026-10-28")[0]?.kind,
    "projected",
  );
  assert.equal(calendarItems(d, "2026-10-26", "2026-10-28")[0]?.kind, "due");
  assert.equal(calendarItems(d, "2026-10-28", "2026-10-28").length, 1);
});

test("tank name sorting and care-priority ties use the selected language collation", () => {
  const data = emptyData();
  data.settings.language = "zh";
  data.tanks = ["波", "阿"].map((name, i) => ({
    ...d.tanks[0]!,
    id: `localized-${i}`,
    name,
  }));
  for (const sort of ["name", "due"]) {
    assert.deepEqual(
      filterTanks(data, "", "all", sort, "2026-10-28").map((t) => t.name),
      ["阿", "波"],
    );
  }
});
