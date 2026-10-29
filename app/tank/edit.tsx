import { parseNumberInput } from "../../src/domain/number-input";
import {
  calculateTankVolume,
  totalTankVolume,
} from "../../src/domain/tank-volume";
import { userMessage } from "../../src/services/errors";
import { getLocale } from "../../src/i18n";
import { t as tr } from "../../src/i18n";
import React, { useState, useRef, useEffect } from "react";
import { View, Alert, Pressable } from "react-native";
import { Text } from "../../src/ui/text";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useApp } from "../../src/state/AppProvider";
import {
  Screen,
  Field,
  Choices,
  SelectField,
  Card,
  SwitchRow,
  DateField,
  TankPhoto,
  Button,
  useFormGuard,
  Empty,
  Icon,
} from "../../src/ui/components";
import { s, c } from "../../src/ui/theme";
import {
  waterTypes,
  type WaterType,
  type Photo,
} from "../../src/domain/models";
import { localDate, addDays, formatDate } from "../../src/domain/dates";
import { copy } from "../../src/i18n";
import {
  pickTankPhoto,
  cleanUnusedPhotos,
  documentFile,
} from "../../src/services/media";
export default function TankForm() {
  const { id } = useLocalSearchParams<{
    id?: string;
  }>();
  const app = useApp(),
    router = useRouter(),
    original = app.data.tanks.find((t) => t.id === id);
  const [name, setName] = useState(original?.name ?? ""),
    [length, setLength] = useState(String(original?.lengthCm ?? "")),
    [width, setWidth] = useState(String(original?.widthCm ?? "")),
    [height, setHeight] = useState(String(original?.heightCm ?? "")),
    [hasSump, setHasSump] = useState(original?.hasSump ?? false),
    [sumpVolume, setSumpVolume] = useState(
      String(original?.sumpVolumeLitres ?? ""),
    ),
    [hasCanister, setHasCanister] = useState(original?.hasCanister ?? false),
    [water, setWater] = useState<WaterType>(
      original?.waterType ?? "unspecified",
    ),
    [group, setGroup] = useState(original?.groupName ?? ""),
    [description, setDescription] = useState(original?.description ?? ""),
    [photo, setPhoto] = useState<Photo | undefined>(
      app.data.photos.find((p) => p.id === original?.coverPhotoId),
    ),
    [initialDetails, setInitialDetails] = useState(false),
    [initial, setInitial] = useState(true),
    [interval, setInterval] = useState("7"),
    [percent, setPercent] = useState("30"),
    [due, setDue] = useState(addDays(localDate(), 7));
  const legacyVolume =
    original &&
    original.lengthCm == null &&
    original.widthCm == null &&
    original.heightCm == null
      ? original.volumeLitres
      : null;
  const parseNumber = (value: string) =>
    value.trim() === "" ? null : parseNumberInput(value);
  const litres = (value: number) =>
    new Intl.NumberFormat(getLocale(), {
      maximumSignificantDigits: 8,
    }).format(value) + " L";
  let previewVolume: number | null = legacyVolume,
    geometryError: string | null = null;
  try {
    previewVolume = calculateTankVolume(length, width, height) ?? legacyVolume;
  } catch (error) {
    previewVolume = null;
    geometryError = userMessage(error);
  }
  const sumpNumber = parseNumber(sumpVolume);
  const previewTotal =
    hasSump &&
    (sumpNumber === null || !Number.isFinite(sumpNumber) || sumpNumber <= 0)
      ? null
      : totalTankVolume({
          volumeLitres: previewVolume,
          hasSump,
          sumpVolumeLitres: sumpNumber,
        });
  const [start] = useState(
    JSON.stringify([
      name,
      length,
      width,
      height,
      hasSump,
      sumpVolume,
      hasCanister,
      water,
      group,
      description,
      photo,
      initial,
      interval,
      percent,
      due,
    ]),
  );
  const allow = useFormGuard(
    JSON.stringify([
      name,
      length,
      width,
      height,
      hasSump,
      sumpVolume,
      hasCanister,
      water,
      group,
      description,
      photo,
      initial,
      interval,
      percent,
      due,
    ]) !== start,
  );
  const staged = useRef<Photo[]>([]);
  useEffect(
    () => () => {
      void app.store!.read().then((d) => {
        const used = new Set(d.photos.map((p) => p.id));
        for (const p of staged.current)
          if (!used.has(p.id)) {
            try {
              const f = documentFile(p.relativePath);
              if (f.exists) f.delete();
            } catch {
              /* Startup retries cleanup. */
            }
          }
      });
    },
    [app.store],
  );
  async function choose(camera: boolean) {
    await app.run(async () => {
      const p = await pickTankPhoto(camera);
      if (p) {
        staged.current.push(p);
        setPhoto(p);
      }
    });
  }
  async function save() {
    const result = await app.run(
      async () => {
        const fields = {
          name,
          volumeLitres: legacyVolume,
          lengthCm: parseNumber(length),
          widthCm: parseNumber(width),
          heightCm: parseNumber(height),
          hasSump,
          sumpVolumeLitres: parseNumber(sumpVolume),
          hasCanister,
          waterType: water,
          groupName: group,
          description,
          coverPhotoId: photo?.id ?? null,
        };
        const newPhoto =
          photo && !app.data.photos.some((p) => p.id === photo.id)
            ? photo
            : undefined;
        const tankId = original
          ? (await app.care!.updateTank(original.id, fields, newPhoto),
            original.id)
          : await app.care!.createTank(
              fields,
              initial
                ? {
                    intervalDays: parseNumberInput(interval),
                    targetPercent:
                      percent === "" ? null : parseNumberInput(percent),
                    initialDueDate: due,
                  }
                : undefined,
              newPhoto,
            );
        return tankId;
      },
      original ? tr("messages.tankUpdated") : tr("messages.tankAdded"),
    );
    if (result.ok) {
      const next = await app.store!.view();
      const used = new Set(next.data.photos.map((p) => p.id));
      for (const oldPhoto of app.data.photos)
        if (!used.has(oldPhoto.id)) {
          try {
            const file = documentFile(oldPhoto.relativePath);
            if (file.exists) file.delete();
          } catch {
            /* Startup retries cleanup. */
          }
        }
      allow.current = true;
      if (original && router.canGoBack()) {
        router.back();
        return;
      }
      router.replace({
        pathname: "/tank/[id]",
        params: {
          id: result.value,
        },
      });
    }
  }
  if (id && !original)
    return (
      <Screen title={tr("messages.tankNoLongerExists")}>
        <Empty title={tr("messages.tankNotFound")} />
      </Screen>
    );
  return (
    <Screen
      title={original ? tr("tank.editTitle") : tr("tank.addTitle")}
      footer={
        <Button
          title={
            app.busy
              ? tr("messages.saving")
              : original
                ? tr("common.saveChanges")
                : tr("tank.create")
          }
          onPress={() => void save()}
          disabled={app.busy}
        />
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr("tank.addPhoto")}
        onPress={() => void choose(false)}
        style={{
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: c.border,
          borderRadius: 17,
          backgroundColor: c.aqua,
          paddingVertical: 23,
          paddingHorizontal: 12,
          alignItems: "center",
          gap: 7,
        }}
      >
        {photo ? (
          <View style={{ width: "100%", borderRadius: 12, overflow: "hidden" }}>
            <TankPhoto photo={photo} large height={110} />
          </View>
        ) : (
          <Icon name="image" size={36} color={c.iconMuted} />
        )}
        <Text style={s.muted}>{tr("tank.addPhoto")}</Text>
        <Text style={s.tiny}>{tr("tank.photoHint")}</Text>
      </Pressable>
      <View style={s.between}>
        <Button
          title={tr("messages.takePhoto")}
          variant="ghost"
          icon="camera"
          onPress={() => void choose(true)}
        />
        {photo && (
          <Button
            title={tr("messages.removePhoto")}
            variant="ghost"
            icon="trash-2"
            onPress={() => setPhoto(undefined)}
          />
        )}
      </View>
      <Field
        label={tr("tank.nameLabel")}
        placeholder={tr("messages.forExamplePlantedTank")}
        value={name}
        onChangeText={setName}
        maxLength={60}
      />
      <Text style={s.heading}>{tr("tank.dimensionsTitle")}</Text>
      <Text style={s.muted}>
        {tr("messages.enterLengthWidthHeightInCmToCalculate")}
      </Text>
      <View style={[s.row, { alignItems: "flex-start", gap: 10 }]}>
        <View style={s.grow}>
          <Field
            label={tr("tank.lengthLabel")}
            keyboardType="decimal-pad"
            value={length}
            onChangeText={setLength}
            placeholder="100"
          />
        </View>
        <View style={s.grow}>
          <Field
            label={tr("tank.widthLabel")}
            keyboardType="decimal-pad"
            value={width}
            onChangeText={setWidth}
            placeholder="40"
          />
        </View>
        <View style={s.grow}>
          <Field
            label={tr("tank.heightLabel")}
            keyboardType="decimal-pad"
            value={height}
            onChangeText={setHeight}
            placeholder="50"
          />
        </View>
      </View>
      <Card aqua>
        <Text style={s.label}>{tr("tank.calculatedVolumeLabel")}</Text>
        <Text style={s.heading}>
          {previewVolume === null
            ? tr("common.unknown")
            : litres(previewVolume)}
        </Text>
        {geometryError && (
          <Text style={[s.muted, s.danger]}>{geometryError}</Text>
        )}
        {legacyVolume !== null && !length && !width && !height && (
          <Text style={s.muted}>
            {tr("messages.keepingThePreviouslySavedVolumeEnterDimensionsTo")}
          </Text>
        )}
        <Text style={s.muted}>
          {tr("messages.lengthWidthHeight1000ThisIsGeometric")}
        </Text>
      </Card>
      <Text style={s.heading}>{tr("tank.filtersTitle")}</Text>
      <Card>
        <SwitchRow
          label={tr("tank.hasSumpLabel")}
          value={hasSump}
          onChange={setHasSump}
        />
        {hasSump && (
          <Field
            label={tr("tank.sumpVolumeLabel")}
            value={sumpVolume}
            onChangeText={setSumpVolume}
            keyboardType="decimal-pad"
            placeholder="60"
          />
        )}
        <SwitchRow
          label={tr("tank.hasCanisterLabel")}
          value={hasCanister}
          onChange={setHasCanister}
        />
        <Text style={s.muted}>
          {tr("validation.sumpAndCanisterFiltersCanBeUsedTogether")}
        </Text>
      </Card>
      {hasSump && (
        <Card aqua>
          <Text style={s.label}>{tr("tank.totalVolumeLabel")}</Text>
          <Text style={s.heading}>
            {previewTotal === null
              ? tr("common.unknown")
              : litres(previewTotal)}
          </Text>
        </Card>
      )}
      <SelectField
        label={tr("messages.waterType")}
        value={water}
        onChange={setWater}
        options={waterTypes.map((v) => [v, copy.water[v]] as const)}
      />
      <Field
        label={tr("messages.groupShelfOptional")}
        value={group}
        onChangeText={setGroup}
        maxLength={60}
      />
      <Field
        label={tr("messages.descriptionOptional")}
        multiline
        value={description}
        onChangeText={setDescription}
        maxLength={2000}
      />
      {!original && (
        <Card aqua>
          <SwitchRow
            label={tr("messages.createWaterChangeSchedule")}
            value={initial}
            onChange={setInitial}
          />
          {initial && (
            <>
              <Text style={s.muted}>
                {tr("schedule.everyDays", {
                  0: parseNumberInput(interval) || 0,
                })}{" "}
                · {percent}%
              </Text>
              <Text style={s.tiny}>
                {tr("messages.firstDueDate")}: {formatDate(due)}
              </Text>
              <Text style={s.tiny}>{tr("tank.firstScheduleHint")}</Text>
              <Button
                title={tr("tank.editInitialSchedule")}
                variant="ghost"
                onPress={() => setInitialDetails((v) => !v)}
              />
            </>
          )}
          {initial && initialDetails && (
            <>
              <Field
                label={tr("messages.intervalDays")}
                keyboardType="number-pad"
                value={interval}
                onChangeText={(v) => {
                  setInterval(v);
                  const n = parseNumberInput(v);
                  if (Number.isInteger(n) && n > 0 && n <= 365)
                    setDue(addDays(localDate(), n));
                }}
              />
              <Field
                label={tr("messages.targetPercentage")}
                keyboardType="number-pad"
                value={percent}
                onChangeText={setPercent}
              />
              <DateField
                label={tr("messages.firstDueDate")}
                value={due}
                onChange={setDue}
              />
              <Text style={s.muted}>
                {tr("messages.youCanChangeTheseSuggestedValuesCreatingA")}
              </Text>
            </>
          )}
        </Card>
      )}
    </Screen>
  );
}
