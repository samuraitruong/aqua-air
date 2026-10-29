import { activityTitle } from "../../src/i18n";
import { t as tr } from "../../src/i18n";
import { useStoredLog } from "../../src/state/useStoredLog";
import React from "react";
import { Alert, View } from "react-native";
import { Text } from "../../src/ui/text";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useApp } from "../../src/state/AppProvider";
import {
  Screen,
  Card,
  Button,
  Empty,
  Icon,
  Pill,
  CenterIcon,
} from "../../src/ui/components";
import { s } from "../../src/ui/theme";
import { formatDate } from "../../src/domain/dates";
import { dueDate } from "../../src/domain/scheduling";
import { activityIcon } from "../../src/ui/icons";
export default function ActivityDetail() {
  const { id } = useLocalSearchParams<{
      id: string;
    }>(),
    app = useApp(),
    router = useRouter();
  const result = useStoredLog(id),
    log = result.log;
  if (result.loading)
    return (
      <Screen title={tr("care.detailsTitle")}>
        <Text style={s.body}>{tr("messages.loadingActivity")}</Text>
      </Screen>
    );
  if (!log)
    return (
      <Screen title={tr("care.detailsTitle")}>
        <Empty title={tr("messages.thisActivityNoLongerExists")} />
      </Screen>
    );
  const tank = app.data.tanks.find((t) => t.id === log.tankId),
    schedule = app.data.schedules.find((s) => s.id === log.scheduleId);
  const remove = () =>
    Alert.alert(
      tr("messages.deleteActivityLabel"),
      tr("messages.theCareScheduleWillBeRecalculatedFromThe"),
      [
        {
          text: tr("messages.keep"),
          style: "cancel",
        },
        {
          text: tr("messages.deleteActivity"),
          style: "destructive",
          onPress: async () => {
            const r = await app.run(
              () => app.care!.deleteLog(id),
              tr("messages.activityDeletedAndScheduleRecalculated"),
            );
            if (r.ok) router.back();
          },
        },
      ],
    );
  return (
    <Screen
      title={tr("care.detailsTitle")}
      footer={
        <>
          <Button
            title={tr("messages.editActivity")}
            onPress={() =>
              router.push({ pathname: "/care/edit", params: { id } })
            }
            disabled={!!tank?.archivedAt}
          />
          <Button
            title={tr("messages.deleteActivity")}
            variant="danger"
            onPress={remove}
            disabled={app.busy}
          />
        </>
      }
    >
      <CenterIcon name={activityIcon(log.activityType)} />
      <View style={{ alignItems: "center", gap: 4, marginBottom: 2 }}>
        <Text style={s.heading}>
          {activityTitle(log.activityType, log.titleSnapshot)}
        </Text>
        <Text style={s.muted}>{tank?.name ?? tr("nav.tanks")}</Text>
      </View>
      {log.percent !== null && (
        <Card
          aqua
          style={{ alignItems: "center", paddingVertical: 20, gap: 10 }}
        >
          <Text style={[s.title, { fontSize: 52, lineHeight: 63 }]}>
            {log.percent}%
          </Text>
          <Text style={s.muted}>{tr("care.waterChanged")}</Text>
        </Card>
      )}
      <Card style={{ gap: 0 }}>
        <View style={[s.row, { paddingVertical: 16 }]}>
          <Icon name="clock" />
          <View style={s.grow}>
            <Text style={s.tiny}>{tr("care.performedOn")}</Text>
            <Text style={[s.label, { fontSize: 15 }]}>
              {formatDate(log.performedAt, {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>
        <View style={[s.row, { paddingVertical: 16 }]}>
          <Icon name="calendar" />
          <View style={s.grow}>
            <Text style={s.tiny}>{tr("messages.linkedSchedule")}</Text>
            <Text style={[s.label, { fontSize: 15 }]}>
              {schedule
                ? `${activityTitle(schedule.activityType, schedule.title)} · ${tr("schedule.everyDays", { 0: schedule.intervalDays })}`
                : tr("messages.noLinkedReminderSchedule")}
            </Text>
          </View>
        </View>
        {log.nextDueOverrideDate && (
          <Text style={s.muted}>
            {tr("messages.customDateLabel")}
            {formatDate(log.nextDueOverrideDate)}
          </Text>
        )}
      </Card>
      <Card>
        <Text style={s.label}>{tr("common.notes")}</Text>
        <Text style={s.muted}>{log.notes || tr("messages.noNotes")}</Text>
      </Card>
      {schedule && (
        <Card aqua>
          <Text style={s.tiny}>{tr("care.currentLinkedDue")}</Text>
          <Text style={[s.heading, { fontSize: 23, lineHeight: 29 }]}>
            {formatDate(dueDate(schedule, app.data.logs))}
          </Text>
        </Card>
      )}
    </Screen>
  );
}
