import { parseNumberInput } from "../../src/domain/number-input";
import { t as tr, activityKeys } from "../../src/i18n";
import React, { useState } from "react";
import { Alert, View } from "react-native";
import { Text } from "../../src/ui/text";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useApp } from "../../src/state/AppProvider";
import {
  Screen,
  Card,
  Field,
  Choices,
  SelectField,
  SwitchRow,
  DateField,
  Button,
  Banner,
  Empty,
  LinkRow,
  Icon,
  useFormGuard,
} from "../../src/ui/components";
import { s } from "../../src/ui/theme";
import { activityTypes, type ActivityType } from "../../src/domain/models";
import { localDate, addDays, formatDate } from "../../src/domain/dates";
import { dueDate } from "../../src/domain/scheduling";
import { copy } from "../../src/i18n";
export default function ScheduleForm() {
  const p = useLocalSearchParams<{
      id?: string;
      tankId?: string;
    }>(),
    app = useApp(),
    router = useRouter(),
    old = app.data.schedules.find((s) => s.id === p.id),
    tankId = old?.tankId ?? p.tankId,
    tank = app.data.tanks.find((t) => t.id === tankId);
  const [type, setType] = useState<ActivityType>(
      old?.activityType ?? "water_change",
    ),
    [title, setTitle] = useState(old?.title ?? tr("activity.waterChange")),
    [interval, setInterval] = useState(String(old?.intervalDays ?? 7)),
    [percent, setPercent] = useState(String(old?.targetPercent ?? "")),
    [initial, setInitial] = useState(
      old?.initialDueDate ?? addDays(localDate(), 7),
    ),
    [enabled, setEnabled] = useState(old?.enabled ?? true),
    [manual, setManual] = useState<string | null>(null),
    [changeManual, setChangeManual] = useState(false);
  const hasLog = app.data.logs.some((l) => l.scheduleId === old?.id);
  const [start] = useState(
    JSON.stringify([
      type,
      title,
      interval,
      percent,
      initial,
      enabled,
      manual,
      changeManual,
    ]),
  );
  const allow = useFormGuard(
    JSON.stringify([
      type,
      title,
      interval,
      percent,
      initial,
      enabled,
      manual,
      changeManual,
    ]) !== start,
  );
  async function save() {
    const r = await app.run(async () => {
      const id = await app.care!.upsertSchedule(
        {
          id: old?.id,
          tankId: tankId!,
          activityType: type,
          title: type === "other" ? title : activityKeys[type],
          intervalDays: parseNumberInput(interval),
          targetPercent:
            type === "water_change" && percent !== ""
              ? parseNumberInput(percent)
              : null,
          initialDueDate: initial,
          enabled,
        },
        undefined,
        changeManual
          ? {
              nextDueDate: manual,
            }
          : undefined,
      );
      return id;
    }, tr("messages.careScheduleSaved"));
    if (r.ok) {
      allow.current = true;
      router.back();
    }
  }
  const remove = () =>
    Alert.alert(
      tr("messages.deleteCareScheduleLabel"),
      tr("messages.activityHistoryWillBeKeptUnlinkedFromThis"),
      [
        {
          text: tr("messages.keep"),
          style: "cancel",
        },
        {
          text: tr("messages.deleteSchedule"),
          style: "destructive",
          onPress: async () => {
            const r = await app.run(
              () => app.care!.deleteSchedule(old!.id),
              tr("messages.careScheduleDeleted"),
            );
            if (r.ok) {
              allow.current = true;
              router.back();
            }
          },
        },
      ],
    );
  if (!tank || (p.id && !old))
    return (
      <Screen title={tr("schedule.title")}>
        <Empty title={tr("messages.tankOrScheduleNotFound")} />
      </Screen>
    );
  return (
    <Screen
      title={tr("schedule.title")}
      footer={
        <Button
          title={
            app.busy ? tr("messages.saving") : tr("messages.saveCareSchedule")
          }
          onPress={() => void save()}
          disabled={app.busy || !!tank.archivedAt}
        />
      }
    >
      <Text style={s.muted}>{tank.name}</Text>
      {hasLog ? (
        <View style={{ gap: 7 }}>
          <Text style={s.label}>{tr("messages.activity")}</Text>
          <View style={s.input}>
            <Text style={s.body}>{copy.activity[type]}</Text>
          </View>
        </View>
      ) : (
        <SelectField
          label={tr("messages.activity")}
          value={type}
          onChange={(v) => {
            setType(v);
            setTitle(copy.activity[v]);
          }}
          options={activityTypes.map((t) => [t, copy.activity[t]] as const)}
        />
      )}
      {type === "other" && (
        <Field
          label={tr("messages.taskName")}
          value={title}
          onChangeText={setTitle}
          maxLength={60}
        />
      )}
      <Field
        label={tr("messages.repeatEveryDays")}
        keyboardType="number-pad"
        value={interval}
        onChangeText={setInterval}
      />
      {type === "water_change" && (
        <Field
          label={tr("messages.targetPercentageOptional")}
          value={percent}
          onChangeText={setPercent}
          keyboardType="number-pad"
        />
      )}
      {!hasLog && (
        <DateField
          label={tr("messages.firstDueDateLabel")}
          value={initial}
          onChange={setInitial}
        />
      )}
      {old && (
        <>
          <Card aqua>
            <Text style={s.label}>
              {tr("messages.nextDueLabel2")}
              {formatDate(dueDate(old, app.data.logs))}
            </Text>
            <Text style={s.muted}>
              {old.manualNextDueDate ||
              app.data.logs.some(
                (l) => l.scheduleId === old.id && l.nextDueOverrideDate,
              )
                ? tr("messages.customDueDate")
                : tr("messages.basedOnTheIntervalAndLatestCareActivity")}
            </Text>
          </Card>
          <DateField
            label={tr("messages.changeNextDueDate")}
            value={
              manual ??
              (dueDate(old, app.data.logs) < localDate()
                ? localDate()
                : dueDate(old, app.data.logs))
            }
            placeholder={!changeManual ? tr("common.notSpecified") : undefined}
            onChange={(value) => {
              setChangeManual(true);
              setManual(value);
            }}
          />
          <Button
            title={tr("messages.useScheduleInterval")}
            variant="ghost"
            onPress={async () => {
              const r = await app.run(
                () => app.care!.followCycle(old.id),
                tr("messages.recalculatedUsingTheInterval"),
              );
              if (r.ok) {
                setChangeManual(false);
                setManual(null);
              }
            }}
          />

          <Card style={{ gap: 4 }}>
            <LinkRow
              title={tr("messages.reminderSettings")}
              icon="bell"
              trailing={
                app.data.reminders.find((r) => r.scheduleId === old.id)
                  ?.localTime
              }
              onPress={() =>
                router.push({
                  pathname: "/schedule/reminders",
                  params: { id: old.id },
                })
              }
            />
          </Card>
        </>
      )}
      <Card>
        <SwitchRow
          label={tr("schedule.pause")}
          hint={tr("messages.pausingKeepsHistoryRemovesTheTaskFromThe")}
          value={!enabled}
          onChange={(paused) => setEnabled(!paused)}
        />
      </Card>
      {!old && (
        <Banner
          text={tr("messages.afterSavingTheScheduleYouCanEnableReminders")}
        />
      )}
      {old && (
        <Button
          title={tr("messages.deleteCareSchedule")}
          variant="danger"
          onPress={remove}
          disabled={app.busy}
        />
      )}
    </Screen>
  );
}
