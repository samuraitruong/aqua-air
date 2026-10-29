import type { Store } from "../repositories/store";
import type { AppData, WaterReading } from "../domain/models";
import {
  parameterDefinition,
  validateWaterValue,
  waterMetrics,
} from "../domain/water-readings";
import { requireValue } from "../domain/error";
import { isDate, isTimestamp, localDate, normalize } from "../domain/dates";
import { t } from "../i18n";
export interface WaterReadingInput {
  id?: string;
  tankId: string;
  performedAt: string;
  performedLocalDate: string;
  notes: string;
  idempotencyKey: string;
  values: { parameterKey: string; value: number }[];
}
export class WaterReadingService {
  constructor(
    private store: Store,
    private uuid: () => string,
    private clock = () => new Date().toISOString(),
  ) {}
  private activeTank(d: AppData, id: string) {
    const tank = d.tanks.find((t) => t.id === id);
    requireValue(tank, t("error.notFound"));
    requireValue(
      !tank.archivedAt,
      t("messages.thisTankIsArchivedRestoreItToLog"),
    );
    return tank;
  }
  async addParameter(tankId: string, name: string, unit: string) {
    requireValue(
      typeof name === "string" &&
        name.trim().length > 0 &&
        name.trim().length <= 60 &&
        typeof unit === "string" &&
        unit.trim().length <= 24,
      t("readings.invalidParameter"),
    );
    return this.store.write((d) => {
      this.activeTank(d, tankId);
      const custom = d.waterParameters.filter((p) => p.tankId === tankId);
      requireValue(
        custom.length < 30 &&
          !custom.some((p) => normalize(p.name) === normalize(name)),
        t("readings.duplicateParameter"),
      );
      requireValue(
        !waterMetrics.some(
          (m) =>
            normalize(m.key) === normalize(name) ||
            normalize(m.label) === normalize(name),
        ),
        t("readings.duplicateParameter"),
      );
      const id = this.uuid(),
        now = new Date(this.clock()).toISOString();
      d.waterParameters.push({
        id,
        tankId,
        name: name.trim(),
        unit: unit.trim(),
        createdAt: now,
        updatedAt: now,
      });
      return id;
    });
  }
  async saveReading(input: WaterReadingInput) {
    return this.store.write((d) => {
      this.activeTank(d, input.tankId);
      const duplicate = d.waterReadings.find(
        (r) => r.idempotencyKey === input.idempotencyKey,
      );
      if (!input.id && duplicate) {
        requireValue(duplicate.tankId === input.tankId, t("readings.invalid"));
        return duplicate.id;
      }
      const old = input.id
        ? d.waterReadings.find((r) => r.id === input.id)
        : undefined;
      requireValue(!input.id || old, t("error.notFound"));
      requireValue(!old || old.tankId === input.tankId, t("readings.invalid"));
      const now = new Date(this.clock()).toISOString();
      requireValue(
        isTimestamp(input.performedAt) &&
          Date.parse(input.performedAt) <= Date.parse(now) &&
          isDate(input.performedLocalDate) &&
          (input.performedLocalDate <= localDate(new Date(now)) ||
            (old?.performedLocalDate === input.performedLocalDate &&
              Date.parse(old.performedAt) === Date.parse(input.performedAt))),
        t("readings.invalidDate"),
      );
      requireValue(
        typeof input.notes === "string" &&
          input.notes.length <= 2000 &&
          typeof input.idempotencyKey === "string" &&
          input.idempotencyKey.length > 0 &&
          input.idempotencyKey.length <= 200,
        t("readings.invalid"),
      );
      requireValue(
        Array.isArray(input.values) &&
          input.values.length > 0 &&
          input.values.length <= 50,
        t("readings.atLeastOne"),
      );
      const seen = new Set<string>();
      const id = old?.id ?? this.uuid();
      const values = input.values.map((v) => {
        requireValue(
          v && typeof v.parameterKey === "string" && !seen.has(v.parameterKey),
          t("readings.invalid"),
        );
        seen.add(v.parameterKey);
        const definition = parameterDefinition(
          v.parameterKey,
          d.waterParameters,
          input.tankId,
        );
        validateWaterValue(v.value, definition);
        return {
          id: this.uuid(),
          readingId: id,
          parameterKey: v.parameterKey,
          nameSnapshot: definition.name,
          unitSnapshot: definition.unit,
          value: v.value,
        };
      });
      const row: WaterReading = {
        id,
        tankId: input.tankId,
        performedAt: new Date(input.performedAt).toISOString(),
        performedLocalDate: input.performedLocalDate,
        notes: input.notes.trim(),
        idempotencyKey: old?.idempotencyKey ?? input.idempotencyKey,
        createdAt: old?.createdAt ?? now,
        updatedAt: now,
      };
      if (old) d.waterReadings[d.waterReadings.indexOf(old)] = row;
      else d.waterReadings.push(row);
      d.waterValues = d.waterValues.filter((v) => v.readingId !== id);
      d.waterValues.push(...values);
      return id;
    });
  }
  async deleteReading(id: string) {
    return this.store.write((d) => {
      requireValue(
        d.waterReadings.some((r) => r.id === id),
        t("error.notFound"),
      );
      d.waterValues = d.waterValues.filter((v) => v.readingId !== id);
      d.waterReadings = d.waterReadings.filter((r) => r.id !== id);
    });
  }
}
