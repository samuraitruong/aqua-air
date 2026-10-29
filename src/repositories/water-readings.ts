import type { SqlDriver, SqlValue } from "./store";
import type {
  WaterReading,
  WaterReadingWithValues,
  WaterValue,
  LatestWaterValue,
} from "../domain/models";
export async function queryWaterHistory(
  db: SqlDriver,
  tankId: string,
  cursor?: Pick<WaterReading, "performedAt" | "createdAt" | "id">,
  limit = 30,
): Promise<WaterReadingWithValues[]> {
  const params: SqlValue[] = [tankId];
  let where = "tankId=?";
  if (cursor) {
    where += " AND (performedAt,createdAt,id)<(?,?,?)";
    params.push(cursor.performedAt, cursor.createdAt, cursor.id);
  }
  const rows = await db.all<WaterReading>(
    `SELECT * FROM water_readings WHERE ${where} ORDER BY performedAt DESC,createdAt DESC,id DESC LIMIT ?`,
    ...params,
    Math.max(1, Math.min(100, Math.trunc(limit))),
  );
  if (!rows.length) return [];
  const values = await db.all<WaterValue>(
    `SELECT * FROM water_reading_values WHERE readingId IN (${rows.map(() => "?").join(",")}) ORDER BY parameterKey`,
    ...rows.map((r) => r.id),
  );
  return rows.map((r) => ({
    ...r,
    values: values.filter((v) => v.readingId === r.id),
  }));
}
export async function queryWaterReading(
  db: SqlDriver,
  id: string,
): Promise<WaterReadingWithValues | undefined> {
  const row = (
    await db.all<WaterReading>("SELECT * FROM water_readings WHERE id=?", id)
  )[0];
  if (!row) return;
  return {
    ...row,
    values: await db.all<WaterValue>(
      "SELECT * FROM water_reading_values WHERE readingId=? ORDER BY parameterKey",
      id,
    ),
  };
}
export async function queryLatestWaterValues(
  db: SqlDriver,
  tankId: string,
): Promise<LatestWaterValue[]> {
  return db.all<LatestWaterValue>(
    `SELECT id,readingId,parameterKey,nameSnapshot,unitSnapshot,value,performedAt,performedLocalDate FROM (
 SELECT v.*,r.performedAt,r.performedLocalDate,ROW_NUMBER() OVER(PARTITION BY v.parameterKey ORDER BY r.performedAt DESC,r.createdAt DESC,r.id DESC) AS rank
 FROM water_reading_values v JOIN water_readings r ON r.id=v.readingId WHERE r.tankId=?
 ) WHERE rank=1 ORDER BY parameterKey`,
    tankId,
  );
}
