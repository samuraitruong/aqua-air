import React, { useState } from "react";
import { View, Switch, Pressable, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useApp } from "../../src/state/AppProvider";
import { useInsightsService } from "../../src/state/useTankInsights";
import {
  waterMetrics,
  waterParameterLabel,
} from "../../src/domain/water-readings";
import { parseNumberInput } from "../../src/domain/number-input";
import {
  Screen,
  Card,
  Button,
  Field,
  SelectField,
  Empty,
  Banner,
  useFormGuard,
} from "../../src/ui/components";
import { Text } from "../../src/ui/text";
import { c, s } from "../../src/ui/theme";
import { t } from "../../src/i18n";
export default function Preferences() {
  const { tankId } = useLocalSearchParams<{ tankId: string }>(),
    app = useApp(),
    service = useInsightsService(),
    tank = app.data.tanks.find((t) => t.id === tankId);
  const presets = app.data.readingPresets.filter((p) => p.tankId === tankId);
  const fields = [
    ...waterMetrics.map((m) => ({
      key: m.key,
      name: waterParameterLabel(m.key, m.key),
      unit: m.unit,
    })),
    ...app.data.waterParameters
      .filter((p) => p.tankId === tankId)
      .map((p) => ({ key: p.id, name: p.name, unit: p.unit })),
  ];
  const [presetId, setPresetId] = useState(""),
    [name, setName] = useState(""),
    [keys, setKeys] = useState<string[]>([]),
    [isDefault, setDefault] = useState(false),
    [dirtyPreset, setDirtyPreset] = useState(false),
    [dirtyTarget, setDirtyTarget] = useState(false),
    [dirtyStale, setDirtyStale] = useState(false);
  const [parameter, setParameter] = useState("ph"),
    [lower, setLower] = useState(
      String(
        app.data.waterTargets.find(
          (p) => p.tankId === tankId && p.parameterKey === "ph",
        )?.lower ?? "",
      ),
    ),
    [upper, setUpper] = useState(
      String(
        app.data.waterTargets.find(
          (p) => p.tankId === tankId && p.parameterKey === "ph",
        )?.upper ?? "",
      ),
    );
  const [stale, setStale] = useState(
    String(
      app.data.tankPreferences.find((p) => p.tankId === tankId)?.staleDays ?? 7,
    ),
  );
  useFormGuard(dirtyPreset || dirtyTarget || dirtyStale);
  const loadPreset = (id: string) => {
    const p = presets.find((p) => p.id === id);
    setPresetId(id);
    setName(p?.name ?? "");
    setKeys(p?.parameterKeys ?? []);
    setDefault(p?.isDefault ?? false);
    setDirtyPreset(false);
  };
  const changeParameter = (key: string) => {
    const r = app.data.waterTargets.find(
      (p) => p.tankId === tankId && p.parameterKey === key,
    );
    setParameter(key);
    setLower(String(r?.lower ?? ""));
    setUpper(String(r?.upper ?? ""));
    setDirtyTarget(false);
  };
  const discard = (dirty: boolean, fn: () => void) => {
    if (!dirty) {
      fn();
      return;
    }
    Alert.alert(
      t("common.discardChangesTitle"),
      t("common.unsavedChangesWarning"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("insights.edit"), onPress: fn },
      ],
    );
  };
  if (!tank)
    return (
      <Screen title={t("insights.preferences")}>
        <Empty title={t("error.notFound")} />
      </Screen>
    );
  if (tank.archivedAt)
    return (
      <Screen title={t("insights.preferences")}>
        <Banner text={t("messages.thisTankIsArchivedRestoreItToLog")} />
      </Screen>
    );
  return (
    <Screen title={t("insights.preferences")}>
      <Text style={s.heading}>{tank.name}</Text>
      <Card>
        <Text style={s.heading}>{t("insights.presets")}</Text>
        <Text style={s.tiny}>{t("insights.noValuesCopied")}</Text>
        <SelectField
          label={t("insights.presets")}
          value={presetId}
          options={[
            ["", t("insights.newPreset")],
            ...presets.map((p) => [p.id, p.name] as const),
          ]}
          onChange={(id) => discard(dirtyPreset, () => loadPreset(id))}
        />
        <Field
          label={t("insights.name")}
          value={name}
          maxLength={60}
          onChangeText={(v) => {
            setName(v);
            setDirtyPreset(true);
          }}
        />
        {fields.map((f) => (
          <Pressable
            key={f.key}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: keys.includes(f.key) }}
            onPress={() => {
              setKeys((k) =>
                k.includes(f.key)
                  ? k.filter((x) => x !== f.key)
                  : [...k, f.key],
              );
              setDirtyPreset(true);
            }}
            style={[s.between, { minHeight: 44 }]}
          >
            <Text style={s.body}>
              {f.name} {f.unit}
            </Text>
            <Text style={{ color: c.primary, fontSize: 20 }}>
              {keys.includes(f.key) ? "☑" : "☐"}
            </Text>
          </Pressable>
        ))}
        <View style={s.between}>
          <Text style={[s.body, s.grow]}>{t("insights.default")}</Text>
          <Switch
            accessibilityLabel={t("insights.default")}
            value={isDefault}
            onValueChange={(v) => {
              setDefault(v);
              setDirtyPreset(true);
            }}
            trackColor={{ true: c.primary }}
          />
        </View>
        <Button
          title={t("common.saveChanges")}
          disabled={app.busy || !name.trim() || !keys.length}
          onPress={() =>
            void app
              .run(
                () =>
                  service!.savePreset({
                    id: presetId || undefined,
                    tankId,
                    name,
                    parameterKeys: keys,
                    isDefault,
                  }),
                t("insights.saved"),
              )
              .then((r) => {
                if (r.ok) {
                  setPresetId(r.value);
                  setDirtyPreset(false);
                }
              })
          }
        />
        {presetId && (
          <Button
            title={t("insights.delete")}
            variant="danger"
            disabled={app.busy}
            onPress={() =>
              Alert.alert(t("insights.delete"), t("insights.deleteConfirm"), [
                { text: t("common.cancel"), style: "cancel" },
                {
                  text: t("insights.delete"),
                  style: "destructive",
                  onPress: () =>
                    void app
                      .run(() => service!.deletePreset(presetId))
                      .then((r) => {
                        if (r.ok) loadPreset("");
                      }),
                },
              ])
            }
          />
        )}
      </Card>
      <Card>
        <Text style={s.heading}>{t("insights.targets")}</Text>
        <Text style={s.tiny}>{t("insights.targetHint")}</Text>
        <SelectField
          label={t("insights.parameter")}
          value={parameter}
          options={fields.map(
            (f) => [f.key, f.name + (f.unit ? ` (${f.unit})` : "")] as const,
          )}
          onChange={(v) => discard(dirtyTarget, () => changeParameter(v))}
        />
        <Field
          label={t("insights.lower")}
          value={lower}
          keyboardType="numbers-and-punctuation"
          onChangeText={(v) => {
            setLower(v);
            setDirtyTarget(true);
          }}
        />
        <Field
          label={t("insights.upper")}
          value={upper}
          keyboardType="numbers-and-punctuation"
          onChangeText={(v) => {
            setUpper(v);
            setDirtyTarget(true);
          }}
        />
        <Button
          title={t("common.saveChanges")}
          disabled={app.busy}
          onPress={() =>
            void app
              .run(
                () =>
                  service!.saveTarget(
                    tankId,
                    parameter,
                    lower.trim() ? parseNumberInput(lower) : null,
                    upper.trim() ? parseNumberInput(upper) : null,
                  ),
                t("insights.saved"),
              )
              .then((r) => {
                if (r.ok) setDirtyTarget(false);
              })
          }
        />
      </Card>
      <Card>
        <Field
          label={t("insights.staleDays")}
          value={stale}
          keyboardType="number-pad"
          onChangeText={(v) => {
            setStale(v);
            setDirtyStale(true);
          }}
        />
        <Button
          title={t("common.saveChanges")}
          disabled={app.busy}
          onPress={() =>
            void app
              .run(
                () => service!.savePreference(tankId, parseNumberInput(stale)),
                t("insights.saved"),
              )
              .then((r) => {
                if (r.ok) setDirtyStale(false);
              })
          }
        />
      </Card>
    </Screen>
  );
}
