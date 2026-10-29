import { UserFacingError } from "../../src/domain/error";
import { activityTitle, getLocale } from "../../src/i18n";
import { t as tr } from "../../src/i18n";
import React, { useState } from "react";
import { Linking, View } from "react-native";
import { Text } from "../../src/ui/text";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useApp } from "../../src/state/AppProvider";
import {
  Screen,
  Card,
  SwitchRow,
  DateField,
  Choices,
  SelectField,
  Button,
  Banner,
  Empty,
  TankPhoto,
  Icon,
  useFormGuard,
} from "../../src/ui/components";
import { s } from "../../src/ui/theme";
import { dueDate } from "../../src/domain/scheduling";
import {
  formatDate,
  localDate,
  localTime,
  atLocalTime,
  addDays,
} from "../../src/domain/dates";
import {
  requestNotificationPermission,
  notificationPermission,
  sendTestReminder,
} from "../../src/services/notifications";
export default function Reminders() {
  const { id, snooze } = useLocalSearchParams<{
      id: string;
      snooze?: string;
    }>(),
    app = useApp(),
    router = useRouter(),
    schedule = app.data.schedules.find((s) => s.id === id),
    old = app.data.reminders.find((r) => r.scheduleId === id);
  const [enabled, setEnabled] = useState(old?.enabled ?? false),
    [time, setTime] = useState(old?.localTime ?? app.data.settings.defaultTime),
    [lead, setLead] = useState(String(old?.leadDays ?? 0)),
    [late, setLate] = useState(old?.overdueOnce ?? false),
    [blocked, setBlocked] = useState(false),
    [date, setDate] = useState(addDays(localDate(), 1)),
    [snoozeTime, setSnoozeTime] = useState(
      old?.localTime ?? app.data.settings.defaultTime,
    ),
    [testing, setTesting] = useState(false);
  const [start] = useState(
    JSON.stringify([enabled, time, lead, late, date, snoozeTime]),
  );
  const allow = useFormGuard(
    JSON.stringify([enabled, time, lead, late, date, snoozeTime]) !== start,
  );
  const tank = app.data.tanks.find((t) => t.id === schedule?.tankId);
  if (!schedule || !old)
    return (
      <Screen title={tr("messages.reminderSettings")}>
        <Empty title={tr("messages.thisScheduleNoLongerExists")} />
      </Screen>
    );
  async function save() {
    const r = await app.run(
      async () => {
        if (snooze) {
          await app.care!.snooze(
            id,
            atLocalTime(date, snoozeTime).toISOString(),
          );
          return;
        }
        await app.care!.saveReminder(id, {
          enabled,
          localTime: time,
          leadDays: Number(lead) as 0 | 1 | 2,
          overdueOnce: late,
        });
        if (enabled && !(await notificationPermission())) {
          const granted = await requestNotificationPermission();
          setBlocked(!granted);
        }
      },
      snooze
        ? tr("messages.reminderSnoozedDueDateUnchanged")
        : tr("messages.reminderSettingsSaved"),
    );
    if (r.ok) {
      allow.current = true;
      router.back();
    }
  }
  return (
    <Screen
      title={
        snooze ? tr("messages.remindMeLater") : tr("messages.reminderSettings")
      }
      footer={
        <Button
          title={
            app.busy
              ? tr("messages.saving")
              : snooze
                ? tr("messages.snoozeReminder")
                : tr("messages.saveSettings")
          }
          disabled={app.busy}
          onPress={() => void save()}
        />
      }
    >
      <Card style={s.row}>
        <TankPhoto
          photo={app.data.photos.find((p) => p.id === tank?.coverPhotoId)}
        />
        <View style={s.grow}>
          <Text style={[s.label, { fontSize: 15 }]}>{tank?.name}</Text>
          <Text style={s.muted}>
            {activityTitle(schedule.activityType, schedule.title)}
          </Text>
        </View>
      </Card>
      {snooze ? (
        <>
          <Banner
            text={tr("messages.snoozingOnlyChangesTheReminderTheDueDate")}
          />
          <DateField
            label={tr("messages.snoozeDate")}
            value={date}
            onChange={setDate}
          />
          <DateField
            label={tr("messages.snoozeTime")}
            value={snoozeTime}
            onChange={setSnoozeTime}
            mode="time"
          />
        </>
      ) : (
        <>
          <Card>
            <SwitchRow
              label={tr("reminder.enableLabel")}
              value={enabled}
              onChange={setEnabled}
            />
            <DateField
              prominent
              label={tr("messages.reminderTimeOnThisPhone")}
              value={time}
              onChange={setTime}
              mode="time"
            />
            <SelectField
              label={tr("messages.remindInAdvance")}
              value={lead}
              onChange={setLead}
              options={[
                ["0", tr("common.none")],
                ["1", tr("reminder.oneDayBefore")],
                ["2", tr("reminder.twoDaysBefore")],
              ]}
            />
            <SwitchRow
              label={tr("messages.remindOnceIfOverdue")}
              hint={tr("messages.onceOnTheDayAfterTheDueDate")}
              value={late}
              onChange={setLate}
            />
          </Card>
          <Card aqua>
            <View style={s.row}>
              <Icon name="bell" />
              <Text style={s.label}>{tr("common.preview")}</Text>
            </View>
            <Card style={{ gap: 4 }}>
              <Text style={[s.label, { fontSize: 15 }]}>
                {tr("messages.timeFor")}
                {activityTitle(
                  schedule.activityType,
                  schedule.title,
                ).toLocaleLowerCase(getLocale())}
              </Text>
              <Text style={s.muted}>
                {tank?.name}
                {schedule.targetPercent ? ` · ${schedule.targetPercent}%` : ""}
              </Text>
              <Text style={s.muted}>
                {formatDate(dueDate(schedule, app.data.logs))}
                {tr("messages.at")}
                {time}
              </Text>
            </Card>
          </Card>
          <Button
            title={
              testing ? tr("messages.sending") : tr("messages.sendTestReminder")
            }
            variant="secondary"
            disabled={testing || app.busy}
            onPress={async () => {
              setTesting(true);
              try {
                await app.run(async () => {
                  if (
                    !(await notificationPermission()) &&
                    !(await requestNotificationPermission())
                  ) {
                    setBlocked(true);
                    throw new UserFacingError(
                      "messages.notificationsAreOffOpenYourPhoneSettingsTo",
                    );
                  }
                  await sendTestReminder(
                    tr("messages.aquaAirTestReminder"),
                    `${tank?.name} · ${activityTitle(schedule.activityType, schedule.title)}`,
                  );
                }, tr("messages.testReminderSent"));
              } finally {
                setTesting(false);
              }
            }}
          />
          {(blocked || app.data.settings.notificationError) && (
            <Banner
              text={tr(
                "messages.notificationsAreOffYourSchedulesStillAppearIn",
              )}
              action={tr("messages.openPhoneSettings")}
              onPress={() => void Linking.openSettings()}
            />
          )}
          <Text style={s.muted}>
            {tr("messages.deliveryDependsOnPermissionsFocusModesAndOperating")}
          </Text>
        </>
      )}
    </Screen>
  );
}
