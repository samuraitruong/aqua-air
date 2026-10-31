import { isDate, atLocalTime, addDays } from "../domain/dates";
import { UserFacingError } from "../domain/error";
import { t as tr, isLanguage, defaultLanguage } from "../i18n";
import { emptyData, type AppData, type CareLog } from "../domain/models";
import {
  migration1,
  migration2,
  migration3,
  migration4,
  migration5,
  migration6,
} from "./schema";
export type SqlValue = string | number | null;
export interface SqlDriver {
  exec(sql: string): Promise<void>;
  all<T = Record<string, unknown>>(
    sql: string,
    ...params: SqlValue[]
  ): Promise<T[]>;
  run(sql: string, ...params: SqlValue[]): Promise<void>;
}
export interface Store {
  read(): Promise<AppData>;
  write<T>(fn: (data: AppData) => T | Promise<T>): Promise<T>;
}
import {
  queryWaterHistory,
  queryWaterReading,
  queryLatestWaterValues,
} from "./water-readings";
const tables = [
  ["photos", "photos", "id"],
  ["tanks", "tanks", "id"],
  ["waterParameters", "water_parameters", "id"],
  ["waterReadings", "water_readings", "id"],
  ["waterValues", "water_reading_values", "id"],
  ["readingPresets", "reading_presets", "id"],
  ["waterTargets", "water_targets", "id"],
  ["tankPreferences", "tank_preferences", "id"],
  ["journalEntries", "journal_entries", "id"],
  ["schedules", "care_schedules", "id"],
  ["logs", "care_logs", "id"],
  ["reminders", "reminder_settings", "scheduleId"],
  ["jobs", "notification_jobs", "logicalKey"],
  ["outbox", "notification_outbox", "id"],
] as const;
const columns: Record<string, string[]> = {
  reading_presets: [
    "id",
    "tankId",
    "name",
    "parameterKeys",
    "isDefault",
    "createdAt",
    "updatedAt",
  ],
  water_targets: [
    "id",
    "tankId",
    "parameterKey",
    "lower",
    "upper",
    "createdAt",
    "updatedAt",
  ],
  tank_preferences: ["id", "tankId", "staleDays", "createdAt", "updatedAt"],
  journal_entries: [
    "id",
    "tankId",
    "photoId",
    "performedAt",
    "performedLocalDate",
    "notes",
    "createdAt",
    "updatedAt",
  ],
  water_parameters: ["id", "tankId", "name", "unit", "createdAt", "updatedAt"],
  water_readings: [
    "id",
    "tankId",
    "performedAt",
    "performedLocalDate",
    "notes",
    "idempotencyKey",
    "createdAt",
    "updatedAt",
  ],
  water_reading_values: [
    "id",
    "readingId",
    "parameterKey",
    "nameSnapshot",
    "unitSnapshot",
    "value",
  ],
  photos: [
    "id",
    "relativePath",
    "mimeType",
    "width",
    "height",
    "byteSize",
    "createdAt",
  ],
  tanks: [
    "id",
    "name",
    "description",
    "volumeLitres",
    "lengthCm",
    "widthCm",
    "heightCm",
    "hasSump",
    "sumpVolumeLitres",
    "hasCanister",
    "waterType",
    "groupName",
    "coverPhotoId",
    "archivedAt",
    "createdAt",
    "updatedAt",
  ],
  care_schedules: [
    "id",
    "tankId",
    "activityType",
    "title",
    "intervalDays",
    "targetPercent",
    "initialDueDate",
    "enabled",
    "manualNextDueDate",
    "manualBasisLogId",
    "revision",
    "createdAt",
    "updatedAt",
  ],
  care_logs: [
    "waterCapacityLitres",
    "waterCapacityRecorded",
    "id",
    "tankId",
    "scheduleId",
    "activityType",
    "titleSnapshot",
    "performedAt",
    "performedLocalDate",
    "percent",
    "notes",
    "nextDueOverrideDate",
    "idempotencyKey",
    "createdAt",
    "updatedAt",
  ],
  reminder_settings: [
    "scheduleId",
    "enabled",
    "localTime",
    "leadDays",
    "overdueOnce",
    "snoozedUntil",
    "snoozeRevision",
  ],
  notification_jobs: [
    "logicalKey",
    "scheduleId",
    "revision",
    "kind",
    "fireAt",
    "osId",
    "status",
    "lastError",
    "createdAt",
    "updatedAt",
  ],
  notification_outbox: [
    "id",
    "reason",
    "scheduleId",
    "createdAt",
    "processedAt",
  ],
};
const booleans = new Set([
  "isDefault",
  "enabled",
  "overdueOnce",
  "hasSump",
  "hasCanister",
  "waterCapacityRecorded",
]);
export class SqlStore implements Store {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private db: SqlDriver) {}
  async init() {
    await this.db.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;");
    const row = await this.db.all<{
      user_version: number;
    }>("PRAGMA user_version");
    const version = row[0]?.user_version ?? 0;
    if (version > 6)
      throw new UserFacingError("messages.thisDataBelongsToANewerVersionOf");
    if (version < 6) {
      await this.db.exec("BEGIN IMMEDIATE");
      try {
        if (version === 0) await this.db.exec(migration1);
        if (version < 2) await this.db.exec(migration2);
        if (version < 3) await this.db.exec(migration3);
        if (version < 4) await this.db.exec(migration4);
        if (version < 5) await this.db.exec(migration5);
        await this.db.exec(migration6);
        await this.db.exec("COMMIT");
      } catch (e) {
        await this.db.exec("ROLLBACK");
        throw e;
      }
    }
  }
  private async readDirect(summary = false): Promise<AppData> {
    const data = emptyData();
    for (const [key, table] of tables) {
      if (
        summary &&
        (key === "waterReadings" ||
          key === "waterValues" ||
          key === "journalEntries")
      )
        continue;
      const rows = await this.db.all(
        table === "care_logs"
          ? summary
            ? `SELECT * FROM care_logs WHERE id IN (
SELECT id FROM (SELECT id,ROW_NUMBER() OVER(PARTITION BY scheduleId ORDER BY performedAt DESC,createdAt DESC,id DESC) AS rn FROM care_logs WHERE scheduleId IS NOT NULL) WHERE rn=1
UNION SELECT id FROM (SELECT id,ROW_NUMBER() OVER(PARTITION BY tankId ORDER BY performedAt DESC,createdAt DESC,id DESC) AS rn FROM care_logs WHERE activityType='water_change') WHERE rn=1
)`
            : `SELECT * FROM ${table} ORDER BY performedAt DESC,createdAt DESC,id DESC`
          : `SELECT * FROM ${table}`,
      );
      (data[key] as unknown[]) = rows.map((row) =>
        Object.fromEntries(
          Object.entries(row as object).map(([k, v]) => [
            k,
            k === "parameterKeys"
              ? JSON.parse(v as string)
              : booleans.has(k)
                ? Boolean(v)
                : v,
          ]),
        ),
      );
    }
    const settings = await this.db.all<{
      key: string;
      valueJson: string;
    }>("SELECT * FROM app_settings");
    for (const item of settings) {
      if (item.key in data.settings)
        (data.settings as unknown as Record<string, unknown>)[item.key] =
          JSON.parse(item.valueJson);
    }
    if (!isLanguage(data.settings.language))
      data.settings.language = defaultLanguage;
    if (
      data.settings.notificationError !== null &&
      !["notification.permissionBlocked", "notification.retryMessage"].includes(
        data.settings.notificationError,
      )
    )
      data.settings.notificationError = "notification.retryMessage";
    return data;
  }
  async read() {
    await this.queue;
    return this.readDirect();
  }
  write<T>(fn: (data: AppData) => T | Promise<T>): Promise<T> {
    const operation = this.queue.then(async () => {
      await this.db.exec("BEGIN IMMEDIATE");
      try {
        const before = await this.readDirect();
        const data = JSON.parse(JSON.stringify(before)) as AppData;
        const result = await fn(data);
        await this.persist(before, data);
        await this.db.exec("COMMIT");
        return result;
      } catch (e) {
        await this.db.exec("ROLLBACK");
        throw e;
      }
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
  private async persist(before: AppData, after: AppData) {
    // Clear both fields before ON DELETE SET NULL can violate the independent-log CHECK.
    const remainingSchedules = new Set(after.schedules.map((s) => s.id));
    for (const log of before.logs) {
      if (
        log.scheduleId &&
        !remainingSchedules.has(log.scheduleId) &&
        after.logs.some((l) => l.id === log.id)
      ) {
        await this.db.run(
          "UPDATE care_logs SET scheduleId=NULL,nextDueOverrideDate=NULL WHERE id=?",
          log.id,
        );
      }
    }
    // Remove children first; upsert parents before children. Never INSERT OR REPLACE (would cascade history).
    for (const [key, table, pk] of [...tables].reverse()) {
      const keep = new Set(
        (after[key] as unknown as Record<string, unknown>[]).map((r) => r[pk]),
      );
      for (const row of before[key] as unknown as Record<string, unknown>[]) {
        if (!keep.has(row[pk]))
          await this.db.run(
            `DELETE FROM ${table} WHERE ${pk}=?`,
            row[pk] as string,
          );
      }
    }
    // Demote old defaults before promoting a different preset under the partial unique index.
    await this.db.run(
      "UPDATE reading_presets SET isDefault=0 WHERE isDefault=1",
    );
    for (const [key, table, pk] of tables) {
      const old = new Map(
        (before[key] as unknown as Record<string, unknown>[]).map((r) => [
          r[pk],
          JSON.stringify(r),
        ]),
      );
      for (const row of after[key] as unknown as Record<string, unknown>[]) {
        if (
          table !== "reading_presets" &&
          old.get(row[pk]) === JSON.stringify(row)
        )
          continue;
        const cols = columns[table]!;
        const record =
          table === "tanks"
            ? {
                ...row,
                lengthCm: row.lengthCm ?? null,
                widthCm: row.widthCm ?? null,
                heightCm: row.heightCm ?? null,
                hasSump: row.hasSump ?? false,
                sumpVolumeLitres: row.sumpVolumeLitres ?? null,
                hasCanister: row.hasCanister ?? false,
              }
            : table === "care_logs"
              ? {
                  ...row,
                  waterCapacityLitres: row.waterCapacityLitres ?? null,
                  waterCapacityRecorded: row.waterCapacityRecorded ?? false,
                }
              : row;
        await this.db.run(
          `INSERT INTO ${table} (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")}) ON CONFLICT(${pk}) DO UPDATE SET ${cols
            .filter((c) => c !== pk)
            .map((c) => `${c}=excluded.${c}`)
            .join(",")}`,
          ...cols.map((c) =>
            c === "parameterKeys"
              ? JSON.stringify(record[c])
              : typeof record[c] === "boolean"
                ? Number(record[c])
                : (record[c] as SqlValue),
          ),
        );
      }
    }
    for (const [key, value] of Object.entries(after.settings))
      await this.db.run(
        "INSERT INTO app_settings(key,valueJson) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET valueJson=excluded.valueJson",
        key,
        JSON.stringify(value),
      );
  }
  async view(): Promise<{
    data: AppData;
    totalLogs: number;
    totalReadings: number;
  }> {
    await this.queue;
    const data = await this.readDirect(true);
    const counts = await this.db.all<{
      n: number;
    }>("SELECT COUNT(*) AS n FROM care_logs");
    return {
      data,
      totalLogs: counts[0]?.n ?? 0,
      totalReadings:
        (
          await this.db.all<{ n: number }>(
            "SELECT COUNT(*) AS n FROM water_readings",
          )
        )[0]?.n ?? 0,
    };
  }
  async insightRange(
    tankId: string,
    start: string,
    end: string,
    byTimestamp = false,
  ): Promise<import("../domain/models").InsightRange> {
    if (!isDate(start) || !isDate(end) || start > end)
      throw new Error("Invalid range");
    const operation = this.queue.then(() =>
      this.rangeDirect(tankId, start, end, byTimestamp),
    );
    this.queue = operation.catch(() => {});
    return operation;
  }
  private async rangeDirect(
    tankId: string,
    start: string,
    end: string,
    byTimestamp: boolean,
  ) {
    const column = byTimestamp ? "performedAt" : "performedLocalDate";
    const from = byTimestamp
      ? atLocalTime(start, "00:00").toISOString()
      : start;
    const to = byTimestamp
      ? atLocalTime(addDays(end, 1), "00:00").toISOString()
      : end;
    const comparison = byTimestamp ? "<" : "<=";
    await this.db.exec("BEGIN DEFERRED");
    try {
      const readings = await this.db.all<
        import("../domain/models").WaterReading
      >(
        `SELECT * FROM water_readings WHERE tankId=? AND ${column}>=? AND ${column}${comparison}? ORDER BY performedAt,createdAt,id`,
        tankId,
        from,
        to,
      );
      const values = await this.db.all<import("../domain/models").WaterValue>(
        `SELECT v.* FROM water_reading_values v JOIN water_readings r ON r.id=v.readingId WHERE r.tankId=? AND r.${column}>=? AND r.${column}${comparison}? ORDER BY r.performedAt,r.createdAt,r.id,v.parameterKey`,
        tankId,
        from,
        to,
      );
      const logs = await this.db.all<CareLog>(
        `SELECT * FROM care_logs WHERE tankId=? AND ${column}>=? AND ${column}${comparison}? ORDER BY performedAt,createdAt,id`,
        tankId,
        from,
        to,
      );
      await this.db.exec("COMMIT");
      return { readings, values, logs };
    } catch (e) {
      await this.db.exec("ROLLBACK");
      throw e;
    }
  }
  async journalHistory(
    tankId: string,
    cursor?: Pick<
      import("../domain/models").JournalEntry,
      "performedAt" | "createdAt" | "id"
    >,
    limit = 31,
  ) {
    await this.queue;
    const args: SqlValue[] = [tankId];
    let where = "tankId=?";
    if (cursor) {
      where += " AND (performedAt,createdAt,id)<(?,?,?)";
      args.push(cursor.performedAt, cursor.createdAt, cursor.id);
    }
    return this.db.all<import("../domain/models").JournalEntry>(
      `SELECT * FROM journal_entries WHERE ${where} ORDER BY performedAt DESC,createdAt DESC,id DESC LIMIT ?`,
      ...args,
      Math.max(1, Math.min(100, Math.trunc(limit))),
    );
  }
  async getJournalEntry(id: string) {
    await this.queue;
    return (
      await this.db.all<import("../domain/models").JournalEntry>(
        "SELECT * FROM journal_entries WHERE id=?",
        id,
      )
    )[0];
  }
  async waterHistory(
    tankId: string,
    cursor?: Pick<
      import("../domain/models").WaterReading,
      "performedAt" | "createdAt" | "id"
    >,
    limit = 30,
  ) {
    await this.queue;
    return queryWaterHistory(this.db, tankId, cursor, limit);
  }
  async getWaterReading(id: string) {
    await this.queue;
    return queryWaterReading(this.db, id);
  }
  async latestWaterValues(tankId: string) {
    await this.queue;
    return queryLatestWaterValues(this.db, tankId);
  }
  async monthlyWaterUsage(
    month: string,
  ): Promise<import("../domain/water-usage").MonthlyWaterUsage> {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
      throw new Error("Invalid month");
    await this.queue;
    const rows = await this.db.all<
      import("../domain/water-usage").MonthlyWaterUsage
    >(
      `
SELECT COALESCE(SUM(capacity * percent / 100.0),0) AS litres, COUNT(*) AS changes,
 COALESCE(SUM(CASE WHEN capacity IS NULL THEN 1 ELSE 0 END),0) AS missing,
 COALESCE(SUM(CASE WHEN waterCapacityRecorded=0 THEN 1 ELSE 0 END),0) AS estimated
FROM (SELECT l.percent,l.waterCapacityRecorded,
 CASE WHEN l.waterCapacityRecorded=1 THEN l.waterCapacityLitres
 WHEN t.volumeLitres IS NULL OR (t.hasSump=1 AND t.sumpVolumeLitres IS NULL) THEN NULL
 ELSE t.volumeLitres + CASE WHEN t.hasSump=1 THEN t.sumpVolumeLitres ELSE 0 END END AS capacity
 FROM care_logs l JOIN tanks t ON t.id=l.tankId
 WHERE l.activityType='water_change' AND l.performedLocalDate>=? AND l.performedLocalDate<=?)`,
      month + "-01",
      month + "-31",
    );
    return rows[0]!;
  }
  async history(
    tankId: string,
    cursor?: Pick<CareLog, "performedAt" | "createdAt" | "id">,
    type = "",
    limit = 30,
  ): Promise<CareLog[]> {
    await this.queue;
    const args: SqlValue[] = [tankId];
    let where = "tankId=?";
    if (type) {
      where += " AND activityType=?";
      args.push(type);
    }
    if (cursor) {
      where += " AND (performedAt,createdAt,id)<(?,?,?)";
      args.push(cursor.performedAt, cursor.createdAt, cursor.id);
    }
    return this.db.all<CareLog>(
      `SELECT * FROM care_logs WHERE ${where} ORDER BY performedAt DESC,createdAt DESC,id DESC LIMIT ?`,
      ...args,
      Math.min(100, limit),
    );
  }
  async getLog(id: string): Promise<CareLog | undefined> {
    await this.queue;
    return (
      await this.db.all<CareLog>("SELECT * FROM care_logs WHERE id=?", id)
    )[0];
  }
  async logsOnDate(date: string): Promise<CareLog[]> {
    await this.queue;
    return this.db.all<CareLog>(
      "SELECT * FROM care_logs WHERE performedLocalDate=? ORDER BY performedAt DESC",
      date,
    );
  }
}
