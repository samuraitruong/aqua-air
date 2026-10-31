import { presetFields } from "../../src/domain/tank-insights";
import React, { useEffect, useRef, useState } from "react";
import { View, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { randomUUID } from "expo-crypto";
import { useApp } from "../../src/state/AppProvider";
import type { WaterReadingWithValues } from "../../src/domain/models";
import {
  waterMetrics,
  waterParameterLabel,
} from "../../src/domain/water-readings";
import { parseNumberInput } from "../../src/domain/number-input";
import { localDate, localTime, atLocalTime } from "../../src/domain/dates";
import { t } from "../../src/i18n";
import {
  Screen,
  Card,
  Field,
  DateField,
  Button,
  Empty,
  Banner,
  SectionHeading,
  SelectField,
  useFormGuard,
} from "../../src/ui/components";
import { Text } from "../../src/ui/text";
import { s } from "../../src/ui/theme";
export default function WaterFormLoader() {
  const { id } = useLocalSearchParams<{ id?: string }>(),
    app = useApp();
  const [result, setResult] = useState<{
    id?: string;
    reading?: WaterReadingWithValues;
    error?: boolean;
  }>({ id: undefined });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    if (!id) {
      setResult({ id });
      return;
    }
    if (app.store)
      void app.store
        .getWaterReading(id)
        .then((reading) => {
          if (alive) setResult({ id, reading });
        })
        .catch(() => {
          if (alive) setResult({ id, error: true });
        });
    return () => {
      alive = false;
    };
  }, [id, app.store, retry]);
  if (id && result.id !== id)
    return (
      <Screen title={t("readings.edit")}>
        <Text style={s.muted}>{t("readings.loading")}</Text>
      </Screen>
    );
  if (id && !result.reading)
    return (
      <Screen title={t("readings.edit")}>
        <Empty title={t(result.error ? "readings.error" : "error.notFound")} />
        {result.error && (
          <Button
            title={t("common.tryAgain")}
            onPress={() => setRetry((n) => n + 1)}
          />
        )}
      </Screen>
    );
  return <WaterForm key={id ?? "new"} original={result.reading} />;
}
function WaterForm({ original }: { original?: WaterReadingWithValues }) {
  const { tankId: requestedTank } = useLocalSearchParams<{ tankId?: string }>(),
    app = useApp(),
    router = useRouter(),
    tankId = original?.tankId ?? requestedTank,
    tank = app.data.tanks.find((t) => t.id === tankId);
  const [date, setDate] = useState(original?.performedLocalDate ?? localDate()),
    [time, setTime] = useState(
      original ? localTime(new Date(original.performedAt)) : localTime(),
    ),
    [notes, setNotes] = useState(original?.notes ?? "");
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      original?.values.map((v) => [v.parameterKey, String(v.value)]) ?? [],
    ),
  );
  const [customOpen, setCustomOpen] = useState(false),
    [name, setName] = useState(""),
    [unit, setUnit] = useState("");
  const idempotency = useRef(original?.idempotencyKey ?? randomUUID());
  const [initial] = useState(JSON.stringify([date, time, notes, values]));
  const allow = useFormGuard(
    JSON.stringify([date, time, notes, values]) !== initial || !!name || !!unit,
  );
  const custom = app.data.waterParameters.filter((p) => p.tankId === tankId);
  const fields = [
    ...waterMetrics.map((m) => ({
      key: m.key,
      name: waterParameterLabel(m.key, m.key),
      unit: m.unit,
    })),
    ...custom.map((p) => ({ key: p.id, name: p.name, unit: p.unit })),
  ];
  const presets = app.data.readingPresets.filter((p) => p.tankId === tankId);
  const [presetId, setPresetId] = useState(
    original ? "" : (presets.find((p) => p.isDefault)?.id ?? ""),
  );
  const selectedPreset = presets.find((p) => p.id === presetId);
  const visible = presetFields(
    selectedPreset?.parameterKeys ?? fields.map((f) => f.key),
    values,
    fields.map((f) => f.key),
  );
  function back() {
    allow.current = true;
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: "/tank/[id]", params: { id: tankId! } });
  }
  async function save() {
    const r = await app.run(
      () =>
        app.water!.saveReading({
          id: original?.id,
          tankId: tankId!,
          performedLocalDate: date,
          performedAt:
            original &&
            date === original.performedLocalDate &&
            time === localTime(new Date(original.performedAt))
              ? original.performedAt
              : atLocalTime(date, time).toISOString(),
          notes,
          idempotencyKey: idempotency.current,
          values: fields
            .filter((f) => (values[f.key] ?? "").trim())
            .map((f) => ({
              parameterKey: f.key,
              value: parseNumberInput(values[f.key]!),
            })),
        }),
      t("readings.saved"),
    );
    if (r.ok) back();
  }
  if (!tank)
    return (
      <Screen title={t("readings.log")}>
        <Empty title={t("error.notFound")} />
      </Screen>
    );
  if (tank.archivedAt)
    return (
      <Screen title={t("readings.edit")}>
        <Banner text={t("messages.thisTankIsArchivedRestoreItToLog")} />
      </Screen>
    );
  return (
    <Screen
      title={t(original ? "readings.edit" : "readings.log")}
      footer={
        <Button
          title={t("common.saveChanges")}
          disabled={app.busy}
          onPress={() => void save()}
        />
      }
    >
      <Text style={s.heading}>{tank.name}</Text>
      <Text style={s.tiny}>{t("readings.hint")}</Text>
      <Card>
        <SectionHeading title={t("readings.measuredAt")} />
        <DateField
          label={t("messages.datePerformed")}
          value={date}
          onChange={setDate}
          maximumDate={new Date()}
        />
        <DateField
          label={t("messages.timePerformed")}
          value={time}
          onChange={setTime}
          mode="time"
        />
      </Card>
      <Card>
        {!original && presets.length > 0 && (
          <>
            <SelectField
              label={t("insights.presets")}
              value={presetId}
              options={[
                ["", t("insights.all")],
                ...presets.map((p) => [p.id, p.name] as const),
              ]}
              onChange={setPresetId}
            />
            <Text style={s.tiny}>{t("insights.noValuesCopied")}</Text>
          </>
        )}
        {visible
          .map((key) => fields.find((f) => f.key === key)!)
          .map((field) => (
            <Field
              key={field.key}
              label={field.name + (field.unit ? ` (${field.unit})` : "")}
              value={values[field.key] ?? ""}
              onChangeText={(v) =>
                setValues((old) => ({ ...old, [field.key]: v }))
              }
              keyboardType="numbers-and-punctuation"
              placeholder="—"
            />
          ))}
      </Card>
      <Button
        title={t("readings.addParameter")}
        variant="secondary"
        disabled={app.busy}
        onPress={() => setCustomOpen((v) => !v)}
      />
      {customOpen && (
        <Card>
          <Field
            label={t("readings.name")}
            value={name}
            onChangeText={setName}
            maxLength={60}
          />
          <Field
            label={t("readings.unit")}
            value={unit}
            onChangeText={setUnit}
            maxLength={24}
          />
          <Button
            title={t("readings.addParameter")}
            disabled={app.busy || !name.trim()}
            onPress={() =>
              void app
                .run(() => app.water!.addParameter(tankId!, name, unit))
                .then((result) => {
                  if (result.ok) {
                    setName("");
                    setUnit("");
                    setCustomOpen(false);
                  }
                })
            }
          />
        </Card>
      )}
      <Card>
        <Field
          label={t("messages.notesOptional")}
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={2000}
        />
      </Card>
      {original && (
        <Button
          title={t("readings.delete")}
          variant="danger"
          disabled={app.busy}
          onPress={() =>
            Alert.alert(t("readings.delete"), t("readings.deleteConfirm"), [
              { text: t("common.cancel"), style: "cancel" },
              {
                text: t("readings.delete"),
                style: "destructive",
                onPress: () =>
                  void app
                    .run(
                      () => app.water!.deleteReading(original.id),
                      t("readings.deleted"),
                    )
                    .then((result) => {
                      if (result.ok) back();
                    }),
              },
            ])
          }
        />
      )}
    </Screen>
  );
}
