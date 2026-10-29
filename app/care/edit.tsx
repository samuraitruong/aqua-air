import { parseNumberInput } from "../../src/domain/number-input";
import { activityTitle } from "../../src/i18n";
import { getLocale } from "../../src/i18n";
import { t as tr } from "../../src/i18n";
import { useStoredLog } from "../../src/state/useStoredLog";
import type { CareLog } from "../../src/domain/models";
import React, { useState, useRef } from "react";
import { View } from "react-native";
import { Text, TextInput } from "../../src/ui/text";
import { useLocalSearchParams, useRouter } from "expo-router";
import Slider from "@react-native-community/slider";
import { randomUUID } from "expo-crypto";
import { useApp } from "../../src/state/AppProvider";
import {
  Screen,
  Card,
  Field,
  Choices,
  SelectField,
  DateField,
  Button,
  TankPhoto,
  Banner,
  Empty,
  Icon,
  useFormGuard,
} from "../../src/ui/components";
import { c, s } from "../../src/ui/theme";
import { activityTypes, type ActivityType } from "../../src/domain/models";
import {
  localDate,
  localTime,
  addDays,
  atLocalTime,
} from "../../src/domain/dates";
import { copy } from "../../src/i18n";
import { dueDate } from "../../src/domain/scheduling";
export default function CareFormLoader() {
  const { id } = useLocalSearchParams<{
    id?: string;
  }>();
  const result = useStoredLog(id);
  if (result.loading)
    return (
      <Screen title={tr("care.logTitle")}>
        <Text style={s.body}>{tr("messages.loadingActivity")}</Text>
      </Screen>
    );
  if (id && !result.log)
    return (
      <Screen title={tr("care.logTitle")}>
        <Empty
          title={result.error ?? tr("messages.thisActivityNoLongerExists")}
        />
      </Screen>
    );
  return <CareForm original={result.log} />;
}
function CareForm({ original }: { original?: CareLog }) {
  const params = useLocalSearchParams<{
      id?: string;
      tankId?: string;
      scheduleId?: string;
    }>(),
    app = useApp(),
    router = useRouter();
  const tankId = original?.tankId ?? params.tankId,
    tank = app.data.tanks.find((t) => t.id === tankId),
    requested = app.data.schedules.find((s) => s.id === params.scheduleId);
  const firstType =
    original?.activityType ?? requested?.activityType ?? "water_change";
  const firstSchedule = original
    ? original.scheduleId
    : (requested?.id ??
      app.data.schedules.find(
        (s) => s.tankId === tankId && s.activityType === firstType && s.enabled,
      )?.id ??
      null);
  const [type, setType] = useState<ActivityType>(firstType),
    [scheduleId, setScheduleId] = useState<string | null>(firstSchedule),
    [date, setDate] = useState(original?.performedLocalDate ?? localDate()),
    [time, setTime] = useState(
      original ? localTime(new Date(original.performedAt)) : localTime(),
    ),
    [percent, setPercent] = useState(
      String(original?.percent ?? requested?.targetPercent ?? 30),
    ),
    [notes, setNotes] = useState(original?.notes ?? ""),
    [override, setOverride] = useState<string | null>(
      original?.nextDueOverrideDate ?? null,
    ),
    [changedType, setChangedType] = useState(false);
  const key = useRef(original?.idempotencyKey ?? randomUUID());
  const [start] = useState(
    JSON.stringify([type, scheduleId, date, time, percent, notes, override]),
  );
  const allow = useFormGuard(
    JSON.stringify([type, scheduleId, date, time, percent, notes, override]) !==
      start,
  );
  const options = app.data.schedules.filter(
      (s) => s.tankId === tankId && s.activityType === type && s.enabled,
    ),
    linked = app.data.schedules.find(
      (s) =>
        s.id === scheduleId && s.activityType === type && s.tankId === tankId,
    );
  const next = linked ? (override ?? addDays(date, linked.intervalDays)) : null;
  function changeType(v: ActivityType) {
    setType(v);
    setScheduleId(null);
    setOverride(null);
    setChangedType(true);
  }
  async function save() {
    const r = await app.run(async () => {
      const id = await app.care!.saveLog({
        id: original?.id,
        tankId: tankId!,
        scheduleId: linked?.id ?? null,
        activityType: type,
        performedAt:
          original &&
          date === original.performedLocalDate &&
          time === localTime(new Date(original.performedAt))
            ? original.performedAt
            : atLocalTime(date, time).toISOString(),
        performedLocalDate: date,
        percent: type === "water_change" ? parseNumberInput(percent) : null,
        notes,
        nextDueOverrideDate: linked ? override : null,
        idempotencyKey: key.current,
      });
      return id;
    });
    if (r.ok) {
      allow.current = true;
      const d = await app.store!.read();
      const sc = d.schedules.find((s) => s.id === linked?.id);
      app.notify(
        tr("messages.recordedCount", {
          0: sc
            ? tr("messages.nextDue") +
              new Intl.DateTimeFormat(getLocale(), {
                day: "2-digit",
                month: "2-digit",
              }).format(new Date(dueDate(sc, d.logs) + "T12:00:00"))
            : "",
        }),
      );
      if (router.canGoBack()) router.back();
      else
        router.replace({
          pathname: "/tank/[id]",
          params: {
            id: tankId!,
          },
        });
    }
  }
  if (!tank || (params.id && !original))
    return (
      <Screen title={tr("care.logTitle")}>
        <Empty title={tr("messages.noMatchingDataFound")} />
      </Screen>
    );
  return (
    <Screen
      title={original ? tr("messages.editActivity") : tr("care.logTitle")}
      footer={
        <Button
          title={
            app.busy
              ? tr("messages.saving")
              : original
                ? tr("common.saveChanges")
                : tr("messages.saveActivity")
          }
          disabled={app.busy || !!tank.archivedAt}
          onPress={() => void save()}
        />
      }
    >
      <Card>
        <View style={s.row}>
          <TankPhoto
            photo={app.data.photos.find((p) => p.id === tank.coverPhotoId)}
          />
          <View style={s.grow}>
            <Text style={[s.label, { fontSize: 15 }]}>{tank.name}</Text>
            <Text style={s.muted}>
              {tank.volumeLitres ? `${tank.volumeLitres} L · ` : ""}
              {copy.water[tank.waterType]}
            </Text>
          </View>
        </View>
      </Card>
      <SelectField
        label={tr("messages.activity")}
        value={type}
        onChange={changeType}
        options={activityTypes.map((t) => [t, copy.activity[t]] as const)}
      />
      <DateField
        label={tr("messages.datePerformed")}
        value={date}
        onChange={(v) => {
          setDate(v);
          setOverride(null);
        }}
        maximumDate={new Date()}
      />
      <DateField
        label={tr("messages.timePerformed")}
        value={time}
        onChange={setTime}
        mode="time"
      />
      {type === "water_change" && (
        <View style={{ gap: 12 }}>
          <View style={s.between}>
            <Text style={[s.body, s.grow]}>
              {tr("messages.waterChangePercentage")}
            </Text>
            <View style={[s.row, { gap: 3 }]}>
              <TextInput
                accessibilityLabel={tr("messages.waterChangePercentage")}
                value={percent}
                onChangeText={setPercent}
                keyboardType="number-pad"
                selectTextOnFocus
                style={{
                  fontSize: 35,
                  lineHeight: 43,
                  fontWeight: "700",
                  color: c.text,
                  textAlign: "right",
                  minWidth: 80,
                  minHeight: 48,
                }}
              />
              <Text style={s.body}>%</Text>
            </View>
          </View>
          <Slider
            accessibilityLabel={tr("messages.waterChangePercentage")}
            minimumValue={1}
            maximumValue={100}
            step={1}
            value={parseNumberInput(percent) || 1}
            onValueChange={(v) => setPercent(String(v))}
            minimumTrackTintColor={c.primary}
            thumbTintColor={c.primary}
          />
          <Choices
            value={percent}
            onChange={setPercent}
            options={[
              ["10", "10%"],
              ["20", "20%"],
              ["30", "30%"],
              ["50", "50%"],
            ]}
          />
        </View>
      )}
      <Field
        label={tr("common.notes")}
        placeholder={tr("messages.notesOptional")}
        multiline
        value={notes}
        onChangeText={setNotes}
        maxLength={2000}
      />
      {changedType && original?.scheduleId && (
        <Banner
          text={tr("messages.thePreviousScheduleWillBeRecalculatedSelectA")}
        />
      )}
      <SelectField
        label={tr("messages.scheduleToUpdate")}
        value={scheduleId ?? ""}
        onChange={(v) => {
          setScheduleId(v || null);
          setOverride(null);
        }}
        options={[
          ["", tr("messages.historyOnly")],
          ...options.map(
            (s) => [s.id, activityTitle(s.activityType, s.title)] as const,
          ),
        ]}
      />
      {linked && next ? (
        <Card aqua>
          <View style={s.row}>
            <Icon name="calendar" />
            <Text style={s.label}>{tr("messages.nextDueLabel")}</Text>
          </View>
          <DateField
            label={
              override
                ? tr("messages.customDate")
                : tr("messages.useScheduleInterval")
            }
            value={next}
            onChange={setOverride}
          />
          <Text style={s.muted}>
            {tr("schedule.everyDays", { 0: linked.intervalDays })} ·
            {activityTitle(linked.activityType, linked.title)}
          </Text>
          <Button
            title={tr("messages.useScheduleInterval")}
            variant="ghost"
            onPress={() => setOverride(null)}
          />
          <Text style={s.muted}>
            {tr("messages.thisCustomDateAppliesOnlyToThisActivity")}
          </Text>
        </Card>
      ) : (
        <Banner
          text={tr("messages.noLinkedReminderScheduleSaveToHistoryOnly")}
        />
      )}
    </Screen>
  );
}
