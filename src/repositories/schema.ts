export const migration1 = `
CREATE TABLE photos (id TEXT PRIMARY KEY, relativePath TEXT NOT NULL UNIQUE, mimeType TEXT NOT NULL, width INTEGER NOT NULL CHECK(width>0), height INTEGER NOT NULL CHECK(height>0), byteSize INTEGER NOT NULL CHECK(byteSize>0), createdAt TEXT NOT NULL);
CREATE TABLE tanks (id TEXT PRIMARY KEY, name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 60), description TEXT NOT NULL, volumeLitres REAL CHECK(volumeLitres>0 AND volumeLitres<=100000), waterType TEXT NOT NULL CHECK(waterType IN ('freshwater','saltwater','brackish','unspecified')), groupName TEXT NOT NULL, coverPhotoId TEXT REFERENCES photos(id) ON DELETE SET NULL, archivedAt TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
CREATE TABLE care_schedules (id TEXT PRIMARY KEY, tankId TEXT NOT NULL REFERENCES tanks(id) ON DELETE CASCADE, activityType TEXT NOT NULL CHECK(activityType IN ('water_change','filter_clean','substrate_clean','plant_care','other')), title TEXT NOT NULL, intervalDays INTEGER NOT NULL CHECK(intervalDays BETWEEN 1 AND 365 AND intervalDays=CAST(intervalDays AS INTEGER)), targetPercent INTEGER CHECK(targetPercent BETWEEN 1 AND 100 AND targetPercent=CAST(targetPercent AS INTEGER)), initialDueDate TEXT NOT NULL, enabled INTEGER NOT NULL CHECK(enabled IN (0,1)), manualNextDueDate TEXT, manualBasisLogId TEXT, revision INTEGER NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
CREATE TABLE care_logs (id TEXT PRIMARY KEY, tankId TEXT NOT NULL REFERENCES tanks(id) ON DELETE CASCADE, scheduleId TEXT REFERENCES care_schedules(id) ON DELETE SET NULL, activityType TEXT NOT NULL CHECK(activityType IN ('water_change','filter_clean','substrate_clean','plant_care','other')), titleSnapshot TEXT NOT NULL, performedAt TEXT NOT NULL, performedLocalDate TEXT NOT NULL, percent INTEGER, notes TEXT NOT NULL, nextDueOverrideDate TEXT, idempotencyKey TEXT NOT NULL UNIQUE, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, CHECK((activityType='water_change' AND percent BETWEEN 1 AND 100 AND percent=CAST(percent AS INTEGER)) OR (activityType<>'water_change' AND percent IS NULL)), CHECK(scheduleId IS NOT NULL OR nextDueOverrideDate IS NULL));
CREATE TABLE reminder_settings (scheduleId TEXT PRIMARY KEY REFERENCES care_schedules(id) ON DELETE CASCADE, enabled INTEGER NOT NULL, localTime TEXT NOT NULL, leadDays INTEGER NOT NULL CHECK(leadDays IN(0,1,2)), overdueOnce INTEGER NOT NULL, snoozedUntil TEXT, snoozeRevision INTEGER);
CREATE TABLE notification_jobs (logicalKey TEXT PRIMARY KEY, scheduleId TEXT NOT NULL REFERENCES care_schedules(id) ON DELETE CASCADE, revision INTEGER NOT NULL, kind TEXT NOT NULL, fireAt TEXT NOT NULL, osId TEXT, status TEXT NOT NULL, lastError TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
CREATE TABLE notification_outbox (id TEXT PRIMARY KEY, reason TEXT NOT NULL, scheduleId TEXT, createdAt TEXT NOT NULL, processedAt TEXT);
CREATE TABLE app_settings (key TEXT PRIMARY KEY, valueJson TEXT NOT NULL);
CREATE INDEX idx_logs_tank ON care_logs(tankId,performedAt DESC,createdAt DESC,id DESC);
CREATE INDEX idx_logs_schedule ON care_logs(scheduleId,performedAt DESC);
CREATE INDEX idx_schedules_tank ON care_schedules(tankId,enabled);
CREATE INDEX idx_tanks_archived ON tanks(archivedAt);
CREATE INDEX idx_jobs_schedule ON notification_jobs(scheduleId,revision);
CREATE TRIGGER log_relation_insert BEFORE INSERT ON care_logs WHEN NEW.scheduleId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM care_schedules WHERE id=NEW.scheduleId AND tankId=NEW.tankId AND activityType=NEW.activityType) BEGIN SELECT RAISE(ABORT,'SCHEDULE_TYPE_MISMATCH'); END;
CREATE TRIGGER log_relation_update BEFORE UPDATE ON care_logs WHEN NEW.scheduleId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM care_schedules WHERE id=NEW.scheduleId AND tankId=NEW.tankId AND activityType=NEW.activityType) BEGIN SELECT RAISE(ABORT,'SCHEDULE_TYPE_MISMATCH'); END;
PRAGMA user_version = 1;
`;
export const migration2 = `CREATE INDEX IF NOT EXISTS idx_logs_local_date ON care_logs(performedLocalDate,performedAt DESC); PRAGMA user_version=2;`;

export const migration3 = `
ALTER TABLE tanks ADD COLUMN lengthCm REAL CHECK(lengthCm IS NULL OR (lengthCm>0 AND lengthCm<=10000));
ALTER TABLE tanks ADD COLUMN widthCm REAL CHECK(widthCm IS NULL OR (widthCm>0 AND widthCm<=10000));
ALTER TABLE tanks ADD COLUMN heightCm REAL CHECK(
 (lengthCm IS NULL AND widthCm IS NULL AND heightCm IS NULL) OR
 (lengthCm IS NOT NULL AND widthCm IS NOT NULL AND heightCm IS NOT NULL AND heightCm>0 AND heightCm<=10000 AND volumeLitres IS NOT NULL AND abs(volumeLitres-lengthCm*widthCm*heightCm/1000.0)<=max(1.0,volumeLitres)*0.000000001)
);
ALTER TABLE tanks ADD COLUMN hasSump INTEGER NOT NULL DEFAULT 0 CHECK(hasSump IN(0,1));
ALTER TABLE tanks ADD COLUMN hasCanister INTEGER NOT NULL DEFAULT 0 CHECK(hasCanister IN(0,1));
ALTER TABLE tanks ADD COLUMN sumpVolumeLitres REAL CHECK((hasSump=0 AND sumpVolumeLitres IS NULL) OR (hasSump=1 AND sumpVolumeLitres IS NOT NULL AND sumpVolumeLitres>0 AND sumpVolumeLitres<=100000));
PRAGMA user_version=3;
`;

export const migration4 = `
ALTER TABLE care_logs ADD COLUMN waterCapacityLitres REAL CHECK(waterCapacityLitres IS NULL OR (waterCapacityLitres>0 AND waterCapacityLitres<=200000));
ALTER TABLE care_logs ADD COLUMN waterCapacityRecorded INTEGER NOT NULL DEFAULT 0 CHECK(waterCapacityRecorded IN (0,1));
PRAGMA user_version=4;
`;

export const migration5 = `
CREATE TABLE water_parameters (id TEXT PRIMARY KEY, tankId TEXT NOT NULL REFERENCES tanks(id) ON DELETE CASCADE, name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 60), unit TEXT NOT NULL CHECK(length(unit)<=24), createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
CREATE TABLE water_readings (id TEXT PRIMARY KEY, tankId TEXT NOT NULL REFERENCES tanks(id) ON DELETE CASCADE, performedAt TEXT NOT NULL, performedLocalDate TEXT NOT NULL, notes TEXT NOT NULL CHECK(length(notes)<=2000), idempotencyKey TEXT NOT NULL UNIQUE, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
CREATE TABLE water_reading_values (id TEXT PRIMARY KEY, readingId TEXT NOT NULL REFERENCES water_readings(id) ON DELETE CASCADE, parameterKey TEXT NOT NULL, nameSnapshot TEXT NOT NULL, unitSnapshot TEXT NOT NULL, value REAL NOT NULL CHECK(value BETWEEN -1000000000 AND 1000000000), UNIQUE(readingId,parameterKey), CHECK(parameterKey<>'ph' OR value BETWEEN 0 AND 14));
CREATE INDEX idx_water_readings_tank ON water_readings(tankId,performedAt DESC,createdAt DESC,id DESC);
CREATE INDEX idx_water_parameters_tank ON water_parameters(tankId);
CREATE INDEX idx_water_values_reading ON water_reading_values(readingId);
PRAGMA user_version=5;
`;

export const migration6 = `
CREATE TABLE reading_presets (id TEXT PRIMARY KEY, tankId TEXT NOT NULL REFERENCES tanks(id) ON DELETE CASCADE, name TEXT NOT NULL, parameterKeys TEXT NOT NULL, isDefault INTEGER NOT NULL CHECK(isDefault IN (0,1)), createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
CREATE INDEX idx_presets_tank ON reading_presets(tankId);
CREATE UNIQUE INDEX idx_default_preset ON reading_presets(tankId) WHERE isDefault=1;
CREATE TABLE water_targets (id TEXT PRIMARY KEY, tankId TEXT NOT NULL REFERENCES tanks(id) ON DELETE CASCADE, parameterKey TEXT NOT NULL, lower REAL, upper REAL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, UNIQUE(tankId,parameterKey), CHECK(lower IS NOT NULL OR upper IS NOT NULL), CHECK(lower IS NULL OR upper IS NULL OR lower<=upper));
CREATE TABLE tank_preferences (id TEXT PRIMARY KEY, tankId TEXT NOT NULL UNIQUE REFERENCES tanks(id) ON DELETE CASCADE, staleDays INTEGER NOT NULL CHECK(staleDays BETWEEN 1 AND 365 AND staleDays=CAST(staleDays AS INTEGER)), createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
CREATE TABLE journal_entries (id TEXT PRIMARY KEY, tankId TEXT NOT NULL REFERENCES tanks(id) ON DELETE CASCADE, photoId TEXT REFERENCES photos(id) ON DELETE SET NULL, performedAt TEXT NOT NULL, performedLocalDate TEXT NOT NULL, notes TEXT NOT NULL CHECK(length(notes)<=2000), createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
CREATE INDEX idx_journal_tank ON journal_entries(tankId,performedAt DESC,createdAt DESC,id DESC);
CREATE INDEX idx_readings_tank_local_date ON water_readings(tankId,performedLocalDate);
CREATE INDEX idx_care_tank_local_date ON care_logs(tankId,performedLocalDate);
PRAGMA user_version=6;
`;
