import { defaultLanguage } from "../i18n/locales";
export const activityTypes = [
  "water_change",
  "filter_clean",
  "substrate_clean",
  "plant_care",
  "other",
] as const;
export type ActivityType = (typeof activityTypes)[number];
export const waterTypes = [
  "freshwater",
  "saltwater",
  "brackish",
  "unspecified",
] as const;
export type WaterType = (typeof waterTypes)[number];
export interface Tank {
  id: string;
  name: string;
  description: string;
  volumeLitres: number | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  hasSump?: boolean;
  sumpVolumeLitres?: number | null;
  hasCanister?: boolean;
  waterType: WaterType;
  groupName: string;
  coverPhotoId: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface Photo {
  id: string;
  relativePath: string;
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
  createdAt: string;
}
export interface Schedule {
  id: string;
  tankId: string;
  activityType: ActivityType;
  title: string;
  intervalDays: number;
  targetPercent: number | null;
  initialDueDate: string;
  enabled: boolean;
  manualNextDueDate: string | null;
  manualBasisLogId: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}
export interface CareLog {
  id: string;
  tankId: string;
  scheduleId: string | null;
  activityType: ActivityType;
  titleSnapshot: string;
  performedAt: string;
  performedLocalDate: string;
  percent: number | null;
  waterCapacityLitres?: number | null;
  waterCapacityRecorded?: boolean;
  notes: string;
  nextDueOverrideDate: string | null;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}
export interface Reminder {
  scheduleId: string;
  enabled: boolean;
  localTime: string;
  leadDays: 0 | 1 | 2;
  overdueOnce: boolean;
  snoozedUntil: string | null;
  snoozeRevision: number | null;
}
export type JobKind = "lead" | "due" | "late" | "catchup" | "snooze";
export interface Job {
  logicalKey: string;
  scheduleId: string;
  revision: number;
  kind: JobKind;
  fireAt: string;
  osId: string | null;
  status: "desired" | "scheduled" | "error" | "consumed" | "cancelled";
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface Outbox {
  id: string;
  reason: string;
  scheduleId: string | null;
  createdAt: string;
  processedAt: string | null;
}
export interface WaterRate {
  amount: number;
  currency: string;
  perLitres: 1 | 1000;
}
export interface Settings {
  waterRate: WaterRate | null;
  language: import("../i18n").Language;
  defaultTime: string;
  lastBackup: string | null;
  mediaGeneration: string;
  notificationError: import("../i18n").MessageKey | null;
  budgetExceeded: boolean;
}
export interface AppData {
  tanks: Tank[];
  photos: Photo[];
  schedules: Schedule[];
  logs: CareLog[];
  reminders: Reminder[];
  jobs: Job[];
  outbox: Outbox[];
  settings: Settings;
}
export const emptyData = (): AppData => ({
  tanks: [],
  photos: [],
  schedules: [],
  logs: [],
  reminders: [],
  jobs: [],
  outbox: [],
  settings: {
    waterRate: null,
    language: defaultLanguage,
    defaultTime: "09:00",
    lastBackup: null,
    mediaGeneration: "photos",
    notificationError: null,
    budgetExceeded: false,
  },
});
export type Task = {
  tank: Tank;
  schedule: Schedule;
  due: string;
  status: ReturnType<typeof import("./scheduling").taskStatus>;
};
