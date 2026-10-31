import type {
  AppData,
  Photo,
  ReadingPreset,
  JournalEntry,
} from "../domain/models";
import type { Store } from "../repositories/store";
import { requireValue } from "../domain/error";
import { t } from "../i18n";
import { isDate, isTimestamp, normalize, localDate } from "../domain/dates";
import {
  parameterDefinition,
  validateWaterValue,
} from "../domain/water-readings";
import { collectReferencedPhotos } from "../domain/tank-insights";
export class TankInsightsService {
  constructor(
    private store: Store,
    private uuid: () => string,
    private clock = () => new Date().toISOString(),
  ) {}
  private tank(d: AppData, id: string) {
    const tank = d.tanks.find((t) => t.id === id);
    requireValue(tank, t("error.notFound"));
    requireValue(
      !tank.archivedAt,
      t("messages.thisTankIsArchivedRestoreItToLog"),
    );
    return tank;
  }
  async savePreset(
    input: Pick<
      ReadingPreset,
      "tankId" | "name" | "parameterKeys" | "isDefault"
    > & { id?: string },
  ) {
    return this.store.write((d) => {
      this.tank(d, input.tankId);
      const old = input.id
        ? d.readingPresets.find((p) => p.id === input.id)
        : undefined;
      requireValue(
        !input.id || old?.tankId === input.tankId,
        t("insights.invalid"),
      );
      requireValue(
        typeof input.name === "string" &&
          input.name.trim().length > 0 &&
          input.name.trim().length <= 60 &&
          typeof input.isDefault === "boolean",
        t("insights.invalid"),
      );
      const own = d.readingPresets.filter((p) => p.tankId === input.tankId);
      requireValue(
        (!!old || own.length < 10) &&
          !own.some(
            (p) =>
              p.id !== old?.id && normalize(p.name) === normalize(input.name),
          ),
        t("insights.invalid"),
      );
      requireValue(
        Array.isArray(input.parameterKeys) &&
          input.parameterKeys.length > 0 &&
          input.parameterKeys.length <= 41 &&
          new Set(input.parameterKeys).size === input.parameterKeys.length,
        t("insights.invalid"),
      );
      input.parameterKeys.forEach((k) =>
        parameterDefinition(k, d.waterParameters, input.tankId),
      );
      if (input.isDefault)
        own.forEach((p) => {
          p.isDefault = false;
        });
      const now = this.clock();
      const row: ReadingPreset = {
        ...input,
        id: old?.id ?? this.uuid(),
        name: input.name.trim(),
        parameterKeys: [...input.parameterKeys],
        createdAt: old?.createdAt ?? now,
        updatedAt: now,
      };
      if (old) Object.assign(old, row);
      else d.readingPresets.push(row);
      return row.id;
    });
  }
  async deletePreset(id: string) {
    return this.store.write((d) => {
      const p = d.readingPresets.find((p) => p.id === id);
      requireValue(p, t("error.notFound"));
      this.tank(d, p.tankId);
      d.readingPresets = d.readingPresets.filter((p) => p.id !== id);
    });
  }
  async saveTarget(
    tankId: string,
    parameterKey: string,
    lower: number | null,
    upper: number | null,
  ) {
    return this.store.write((d) => {
      this.tank(d, tankId);
      const definition = parameterDefinition(
        parameterKey,
        d.waterParameters,
        tankId,
      );
      if (lower !== null) validateWaterValue(lower, definition);
      if (upper !== null) validateWaterValue(upper, definition);
      requireValue(
        lower === null || upper === null || lower <= upper,
        t("insights.invalid"),
      );
      const old = d.waterTargets.find(
        (p) => p.tankId === tankId && p.parameterKey === parameterKey,
      );
      if (lower === null && upper === null) {
        d.waterTargets = d.waterTargets.filter((p) => p !== old);
        return;
      }
      const now = this.clock();
      const row = {
        id: old?.id ?? this.uuid(),
        tankId,
        parameterKey,
        lower,
        upper,
        createdAt: old?.createdAt ?? now,
        updatedAt: now,
      };
      if (old) Object.assign(old, row);
      else d.waterTargets.push(row);
    });
  }
  async savePreference(tankId: string, staleDays: number) {
    return this.store.write((d) => {
      this.tank(d, tankId);
      requireValue(
        Number.isInteger(staleDays) && staleDays >= 1 && staleDays <= 365,
        t("insights.invalid"),
      );
      const old = d.tankPreferences.find((p) => p.tankId === tankId),
        now = this.clock();
      const row = {
        id: old?.id ?? this.uuid(),
        tankId,
        staleDays,
        createdAt: old?.createdAt ?? now,
        updatedAt: now,
      };
      if (old) Object.assign(old, row);
      else d.tankPreferences.push(row);
    });
  }
  async saveJournal(
    input: Pick<
      JournalEntry,
      "tankId" | "performedAt" | "performedLocalDate" | "notes"
    > & { id?: string; photoId?: string | null },
    photo?: Photo,
  ) {
    return this.store.write((d) => {
      this.tank(d, input.tankId);
      const old = input.id
        ? d.journalEntries.find((j) => j.id === input.id)
        : undefined;
      requireValue(
        !input.id || old?.tankId === input.tankId,
        t("insights.invalid"),
      );
      const now = new Date(this.clock()).toISOString();
      requireValue(
        isTimestamp(input.performedAt) &&
          Date.parse(input.performedAt) <= Date.parse(now) &&
          isDate(input.performedLocalDate) &&
          (input.performedLocalDate <= localDate(new Date(now)) ||
            (old?.performedAt === new Date(input.performedAt).toISOString() &&
              old?.performedLocalDate === input.performedLocalDate)),
        t("readings.invalidDate"),
      );
      requireValue(
        typeof input.notes === "string" && input.notes.length <= 2000,
        t("insights.invalid"),
      );
      if (photo && !d.photos.some((p) => p.id === photo.id))
        d.photos.push(photo);
      const photoId = photo?.id ?? input.photoId ?? old?.photoId;
      requireValue(
        photoId && d.photos.some((p) => p.id === photoId),
        t("insights.photoRequired"),
      );
      const row: JournalEntry = {
        id: old?.id ?? this.uuid(),
        tankId: input.tankId,
        photoId,
        performedAt: new Date(input.performedAt).toISOString(),
        performedLocalDate: input.performedLocalDate,
        notes: input.notes.trim(),
        createdAt: old?.createdAt ?? now,
        updatedAt: now,
      };
      if (old) Object.assign(old, row);
      else d.journalEntries.push(row);
      collectReferencedPhotos(d);
      return row.id;
    });
  }
  async deleteJournal(id: string) {
    return this.store.write((d) => {
      const row = d.journalEntries.find((j) => j.id === id);
      requireValue(row, t("error.notFound"));
      this.tank(d, row.tankId);
      d.journalEntries = d.journalEntries.filter((j) => j.id !== id);
      collectReferencedPhotos(d);
    });
  }
}
