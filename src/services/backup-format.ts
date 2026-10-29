import { t as tr, isLanguage, defaultLanguage } from "../i18n";
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import {
  emptyData,
  activityTypes,
  waterTypes,
  type AppData,
} from "../domain/models";
import {
  validateTank,
  validateSchedule,
  validateLog,
  requireValue,
} from "../domain/validation";
import { isDate, normalize, isTimestamp } from "../domain/dates";
import { validateWaterRate } from "../domain/water-usage";
import { validateWaterData } from "./water-reading-validation";
const MB = 1024 * 1024,
  uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const safePath = (p: string) =>
  /^(data\.json|photos\/[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp))$/.test(p) &&
  !p.includes("..");
const stamp = isTimestamp;
const hash = (b: Uint8Array) => bytesToHex(sha256(b));
export interface Manifest {
  formatVersion: number;
  appVersion: string;
  exportedAt: string;
  counts: {
    tanks: number;
    logs: number;
    schedules: number;
    photos: number;
    waterReadings?: number;
    waterParameters?: number;
    waterValues?: number;
  };
  files: {
    path: string;
    size: number;
    sha256: string;
  }[];
}
export interface BackupPreview {
  manifest: Manifest;
  data: AppData;
  files: Record<string, Uint8Array>;
}
export function validateData(input: unknown): asserts input is AppData {
  const d = input as AppData;
  requireValue(d && typeof d === "object", tr("validation.invalidBackupData"));
  for (const key of [
    "tanks",
    "photos",
    "schedules",
    "logs",
    "reminders",
  ] as const)
    requireValue(Array.isArray(d[key]), tr("validation.missingData") + key);
  const ids = (
    rows: {
      id: string;
    }[],
  ) => {
    const set = new Set<string>();
    for (const r of rows) {
      requireValue(
        uuid.test(r.id) && !set.has(r.id),
        tr("validation.anIdIsInvalidOrDuplicated"),
      );
      set.add(r.id);
      requireValue(
        stamp(r["createdAt" as keyof typeof r]),
        tr("validation.invalidCreationTime"),
      );
    }
    return set;
  };
  validateWaterData(d);
  const tanks = ids(d.tanks),
    photos = ids(d.photos),
    schedules = ids(d.schedules);
  ids(d.logs);
  const keys = new Set<string>(),
    active = new Set<string>();
  for (const p of d.photos) {
    requireValue(
      typeof p.relativePath === "string" &&
        /^(photos|generation-[a-zA-Z0-9-]+)\/[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp)$/.test(
          p.relativePath,
        ) &&
        !p.relativePath.includes(".."),
      tr("validation.invalidPhotoPath"),
    );
    requireValue(
      ["image/jpeg", "image/png", "image/webp"].includes(p.mimeType) &&
        Number.isInteger(p.width) &&
        p.width > 0 &&
        Number.isInteger(p.height) &&
        p.height > 0 &&
        Number.isInteger(p.byteSize) &&
        p.byteSize > 0 &&
        p.byteSize <= 10 * MB,
      tr("validation.invalidPhotoDetails"),
    );
  }
  for (const t of d.tanks) {
    requireValue(
      typeof t.name === "string" &&
        typeof t.description === "string" &&
        typeof t.groupName === "string" &&
        waterTypes.includes(t.waterType),
      tr("validation.invalidTankDetails"),
    );
    requireValue(
      t.volumeLitres === null || typeof t.volumeLitres === "number",
      tr("validation.invalidVolumeFormat"),
    );
    for (const field of [
      "lengthCm",
      "widthCm",
      "heightCm",
      "sumpVolumeLitres",
    ] as const)
      requireValue(
        t[field] === undefined ||
          t[field] === null ||
          typeof t[field] === "number",
        tr("validation.invalidDimensionsOrSumpInformation"),
      );
    const normalized = validateTank(t);
    requireValue(
      t.volumeLitres === normalized.volumeLitres ||
        (t.volumeLitres !== null &&
          normalized.volumeLitres !== null &&
          Math.abs(t.volumeLitres - normalized.volumeLitres) <=
            Math.max(1, normalized.volumeLitres) * 1e-9),
      tr("validation.tankVolumeDoesNotMatchItsDimensions"),
    );
    requireValue(
      t.hasSump || t.sumpVolumeLitres == null,
      tr("validation.aTankWithoutASumpCannotHaveA"),
    );
    requireValue(
      t.coverPhotoId === null || photos.has(t.coverPhotoId),
      tr("messages.theTankPhotoDoesNotExist"),
    );
    requireValue(
      stamp(t.updatedAt) && (t.archivedAt === null || stamp(t.archivedAt)),
      tr("validation.invalidTankDate"),
    );
  }
  for (const s of d.schedules) {
    requireValue(
      tanks.has(s.tankId) &&
        typeof s.title === "string" &&
        activityTypes.includes(s.activityType) &&
        typeof s.enabled === "boolean" &&
        Number.isInteger(s.revision) &&
        s.revision >= 1,
      tr("validation.invalidScheduleDetails"),
    );
    validateSchedule(s);
    requireValue(
      stamp(s.updatedAt),
      tr("validation.invalidScheduleUpdateDate"),
    );
    if (s.enabled) {
      const key = `${s.tankId}:${s.activityType}:${s.activityType === "other" ? normalize(s.title) : ""}`;
      requireValue(!active.has(key), tr("validation.duplicateActiveSchedule"));
      active.add(key);
    }
    requireValue(
      s.manualNextDueDate === null || isDate(s.manualNextDueDate),
      tr("validation.invalidCustomDueDate"),
    );
  }
  for (const l of d.logs) {
    requireValue(
      tanks.has(l.tankId) &&
        typeof l.notes === "string" &&
        typeof l.titleSnapshot === "string" &&
        typeof l.idempotencyKey === "string" &&
        l.idempotencyKey.length > 0 &&
        !keys.has(l.idempotencyKey),
      tr("validation.invalidActivityOrDuplicateSaveKey"),
    );
    keys.add(l.idempotencyKey);
    requireValue(
      stamp(l.performedAt) && stamp(l.updatedAt),
      tr("validation.invalidActivityDate"),
    );
    validateLog(l, new Date().toISOString());
    requireValue(
      l.waterCapacityRecorded === undefined ||
        typeof l.waterCapacityRecorded === "boolean",
      tr("water.invalidSnapshot"),
    );
    requireValue(
      l.waterCapacityLitres === undefined ||
        l.waterCapacityLitres === null ||
        (typeof l.waterCapacityLitres === "number" &&
          Number.isFinite(l.waterCapacityLitres) &&
          l.waterCapacityLitres > 0 &&
          l.waterCapacityLitres <= 200000),
      tr("water.invalidSnapshot"),
    );
    requireValue(
      l.activityType === "water_change" ||
        (!l.waterCapacityRecorded && l.waterCapacityLitres == null),
      tr("water.invalidSnapshot"),
    );
    requireValue(
      l.activityType === "water_change" || l.percent === null,
      tr("messages.thisActivityTypeCannotStoreAWaterPercentage"),
    );
    if (l.scheduleId !== null) {
      const s = d.schedules.find((s) => s.id === l.scheduleId);
      requireValue(
        s && s.tankId === l.tankId && s.activityType === l.activityType,
        tr("messages.theActivityIsLinkedToTheWrongSchedule"),
      );
    } else
      requireValue(
        l.nextDueOverrideDate === null,
        tr("messages.anUnlinkedActivityCannotHaveANextDue"),
      );
  }
  for (const s of d.schedules)
    if (s.manualBasisLogId !== null)
      requireValue(
        d.logs.some(
          (l) => l.id === s.manualBasisLogId && l.scheduleId === s.id,
        ),
        tr("messages.theLogUsedForTheCustomDueDate"),
      );
  const rs = new Set<string>();
  for (const r of d.reminders) {
    requireValue(
      schedules.has(r.scheduleId) &&
        !rs.has(r.scheduleId) &&
        typeof r.enabled === "boolean" &&
        typeof r.overdueOnce === "boolean" &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test(r.localTime) &&
        [0, 1, 2].includes(r.leadDays),
      tr("validation.invalidReminderSettings"),
    );
    requireValue(
      r.snoozedUntil === null || stamp(r.snoozedUntil),
      tr("validation.invalidSnoozeTime"),
    );
    requireValue(
      r.snoozeRevision === null ||
        (Number.isInteger(r.snoozeRevision) && r.snoozeRevision > 0),
      tr("validation.invalidSnoozeRevision"),
    );
    rs.add(r.scheduleId);
  }
  requireValue(
    rs.size === schedules.size,
    tr("validation.aScheduleIsMissingItsReminderSettings"),
  );
  if (d.settings?.waterRate != null) validateWaterRate(d.settings.waterRate);
  requireValue(
    d.settings &&
      (d.settings.language === undefined || isLanguage(d.settings.language)),
    tr("validation.unsupportedLanguage"),
  );
  requireValue(
    d.settings && /^([01]\d|2[0-3]):[0-5]\d$/.test(d.settings.defaultTime),
    tr("validation.reminderTimeSettingsAreMissing"),
  );
}
export function encodeBackup(
  source: AppData,
  photoFiles: Record<string, Uint8Array>,
  exportedAt: string,
): Uint8Array {
  const data = JSON.parse(JSON.stringify(source)) as AppData;
  data.jobs = [];
  data.outbox = [];
  data.settings.notificationError = null;
  data.settings.budgetExceeded = false;
  const files: Record<string, Uint8Array> = {};
  for (const p of data.photos) {
    const bytes = photoFiles[p.relativePath];
    requireValue(
      bytes && bytes.length === p.byteSize,
      tr("validation.aPhotoIsMissingOrDamagedSelectIt"),
    );
    const ext =
      p.mimeType === "image/png"
        ? "png"
        : p.mimeType === "image/webp"
          ? "webp"
          : "jpg";
    p.relativePath = `photos/${p.id}.${ext}`;
    files[p.relativePath] = bytes;
  }
  validateData(data);
  data.tanks = data.tanks.map((tank) => validateTank(tank));
  files["data.json"] = strToU8(JSON.stringify(data));
  const manifest: Manifest = {
    formatVersion: 3,
    appVersion: "1.0.0",
    exportedAt,
    counts: {
      tanks: data.tanks.length,
      logs: data.logs.length,
      schedules: data.schedules.length,
      photos: data.photos.length,
      waterReadings: data.waterReadings.length,
      waterParameters: data.waterParameters.length,
      waterValues: data.waterValues.length,
    },
    files: Object.entries(files).map(([path, b]) => ({
      path,
      size: b.length,
      sha256: hash(b),
    })),
  };
  requireValue(
    Object.keys(files).length + 1 <= 5000 &&
      Object.values(files).every((b) => b.length <= 10 * MB) &&
      Object.values(files).reduce((sum, b) => sum + b.length, 0) <=
        250 * MB - 1024 * 1024,
    tr("validation.theDataExceedsTheBackupLimitsReduceThe"),
  );
  files["manifest.json"] = strToU8(JSON.stringify(manifest));
  return zipSync(files, {
    level: 0,
  });
}
export function decodeBackup(bytes: Uint8Array): BackupPreview {
  requireValue(
    bytes.length <= 250 * MB,
    tr("validation.theBackupFileExceedsThe250MbLimit"),
  );
  let size = 0,
    count = 0;
  const seen = new Set<string>();
  // fflate calls the filter on central-directory metadata before allocating/decompressing.
  unzipSync(bytes, {
    filter: (entry) => {
      requireValue(
        (entry.name === "manifest.json" || safePath(entry.name)) &&
          !seen.has(entry.name),
        tr("messages.anArchivePathIsUnsafeOrDuplicated"),
      );
      seen.add(entry.name);
      count++;
      size += entry.originalSize;
      requireValue(
        count <= 5000 &&
          size <= 500 * MB &&
          entry.originalSize <= 10 * MB &&
          entry.size <= 10 * MB &&
          (entry.compression !== 0 || entry.size === entry.originalSize),
        tr("validation.theBackupExceedsTheExtractionLimits"),
      );
      requireValue(
        entry.compression === 0 || entry.compression === 8,
        tr("messages.unsupportedCompressionMethod"),
      );
      return false;
    },
  });
  const files = unzipSync(bytes);
  requireValue(
    files["manifest.json"] && files["data.json"],
    tr("validation.theManifestOrDataFileIsMissing"),
  );
  const manifest = JSON.parse(strFromU8(files["manifest.json"])) as Manifest;
  requireValue(
    [1, 2, 3].includes(manifest.formatVersion),
    tr("messages.thisBackupVersionIsNotSupported"),
  );
  requireValue(
    stamp(manifest.exportedAt) && Array.isArray(manifest.files),
    tr("validation.invalidManifest"),
  );
  const listed = new Set<string>();
  for (const item of manifest.files) {
    requireValue(
      safePath(item.path) && !listed.has(item.path),
      tr("validation.invalidFileList"),
    );
    listed.add(item.path);
    const file = files[item.path];
    requireValue(
      file && file.length === item.size && hash(file) === item.sha256,
      tr("messages.aFileIsMissingOrItsChecksumDoes"),
    );
  }
  requireValue(
    Object.keys(files).length === listed.size + 1 && listed.has("data.json"),
    tr("messages.theArchiveContainsFilesNotListedInThe"),
  );
  const data: unknown = JSON.parse(strFromU8(files["data.json"]));
  validateData(data);
  if (manifest.formatVersion === 3)
    requireValue(
      Array.isArray(data.waterReadings) &&
        Array.isArray(data.waterParameters) &&
        Array.isArray(data.waterValues) &&
        manifest.counts?.waterReadings === data.waterReadings.length &&
        manifest.counts?.waterParameters === data.waterParameters.length &&
        manifest.counts?.waterValues === data.waterValues.length,
      tr("validation.theRecordCountsDoNotMatch"),
    );
  else
    requireValue(
      !(
        data.waterReadings?.length ||
        data.waterParameters?.length ||
        data.waterValues?.length
      ),
      tr("readings.invalid"),
    );
  data.waterParameters ??= [];
  data.waterReadings ??= [];
  data.waterValues ??= [];
  if (manifest.formatVersion >= 2)
    for (const tank of data.tanks)
      for (const field of [
        "lengthCm",
        "widthCm",
        "heightCm",
        "hasSump",
        "sumpVolumeLitres",
        "hasCanister",
      ])
        requireValue(
          Object.prototype.hasOwnProperty.call(tank, field),
          tr("validation.theBackupIsMissingDimensionOrFilterInformation"),
        );
  data.tanks = data.tanks.map((tank) => validateTank(tank));
  for (const p of data.photos) {
    const file = files[p.relativePath];
    requireValue(
      file && file.length === p.byteSize,
      tr("validation.aPhotoIsMissingFromTheBackup"),
    );
    const valid =
      p.mimeType === "image/jpeg"
        ? file[0] === 255 && file[1] === 216 && file[2] === 255
        : p.mimeType === "image/png"
          ? file[0] === 137 &&
            file[1] === 80 &&
            file[2] === 78 &&
            file[3] === 71
          : strFromU8(file.subarray(0, 4)) === "RIFF" &&
            strFromU8(file.subarray(8, 12)) === "WEBP";
    requireValue(valid, tr("validation.invalidPhotoContent"));
  }
  requireValue(
    manifest.counts?.tanks === data.tanks.length &&
      manifest.counts.logs === data.logs.length &&
      manifest.counts.schedules === data.schedules.length &&
      manifest.counts.photos === data.photos.length,
    tr("validation.theRecordCountsDoNotMatch"),
  );
  for (const t of data.tanks) {
    t.createdAt = new Date(t.createdAt).toISOString();
    t.updatedAt = new Date(t.updatedAt).toISOString();
    if (t.archivedAt) t.archivedAt = new Date(t.archivedAt).toISOString();
  }
  for (const l of data.logs) {
    l.performedAt = new Date(l.performedAt).toISOString();
    l.createdAt = new Date(l.createdAt).toISOString();
    l.updatedAt = new Date(l.updatedAt).toISOString();
  }
  for (const p of data.waterParameters) {
    p.createdAt = new Date(p.createdAt).toISOString();
    p.updatedAt = new Date(p.updatedAt).toISOString();
  }
  for (const r of data.waterReadings) {
    r.performedAt = new Date(r.performedAt).toISOString();
    r.createdAt = new Date(r.createdAt).toISOString();
    r.updatedAt = new Date(r.updatedAt).toISOString();
  }
  data.jobs = [];
  data.outbox = [];
  data.settings = {
    ...emptyData().settings,
    language: data.settings.language ?? defaultLanguage,
    defaultTime: data.settings.defaultTime,
    waterRate: data.settings.waterRate ?? null,
    lastBackup: manifest.exportedAt,
  };
  return {
    manifest,
    data,
    files,
  };
}
