import { activityTitle } from "../../src/i18n";
import { t as tr, languageOptions } from "../../src/i18n";
import React, { useState, useEffect } from "react";
import { View, Linking, Alert } from "react-native";
import { Text } from "../../src/ui/text";
import { useRouter } from "expo-router";
import { useApp } from "../../src/state/AppProvider";
import {
  Screen,
  Card,
  LinkRow,
  DateField,
  Button,
  Field,
  Banner,
  Icon,
  Choices,
  SelectField,
  CenterIcon,
  SectionHeading,
} from "../../src/ui/components";
import { s } from "../../src/ui/theme";
import {
  notificationPermission,
  requestNotificationPermission,
} from "../../src/services/notifications";
import { cleanUnusedPhotos } from "../../src/services/media";
import { formatDate } from "../../src/domain/dates";
import { copy } from "../../src/i18n";
import { File, Paths } from "expo-file-system";
import { WaterRateSettings } from "../../src/ui/water-usage";
import {
  appVersion,
  openPublisherLink,
  publisher,
} from "../../src/services/publisher";
export default function Settings() {
  const app = useApp(),
    router = useRouter();
  const [permission, setPermission] = useState(false),
    [time, setTime] = useState(app.data.settings.defaultTime),
    [archives, setArchives] = useState(false),
    [showTime, setShowTime] = useState(false),
    [showSchedules, setShowSchedules] = useState(false),
    [deleteMode, setDeleteMode] = useState(false),
    [confirmation, setConfirmation] = useState("");
  useEffect(() => {
    void notificationPermission().then(setPermission);
  }, [app.data]);
  async function wipe() {
    if (confirmation !== tr("settings.deleteConfirmationWord")) return;
    Alert.alert(
      tr("messages.deleteAllDataLabel"),
      tr("messages.allTanksCareHistorySchedulesAndPhotosWill"),
      [
        {
          text: tr("messages.keep"),
          style: "cancel",
        },
        {
          text: tr("messages.deleteAll"),
          style: "destructive",
          onPress: async () => {
            const r = await app.run(async () => {
              await app.care!.reset();
              cleanUnusedPhotos([]);
              const recovery = new File(
                Paths.document,
                "recovery-before-restore.aquaair",
              );
              if (recovery.exists) recovery.delete();
            }, tr("messages.allDataDeleted"));
            if (r.ok) {
              setDeleteMode(false);
              setConfirmation("");
              router.replace("/");
            }
          },
        },
      ],
    );
  }
  return (
    <Screen title={tr("nav.settings")} back={false}>
      <View style={{ alignItems: "center", gap: 4, marginBottom: 2 }}>
        <CenterIcon name="droplet" />
        <Text style={[s.title, { fontSize: 26, lineHeight: 33 }]}>
          Aqua Air
        </Text>
        <Text style={s.tiny}>{tr("settings.appTagline")}</Text>
      </View>
      <WaterRateSettings />
      <SectionHeading title={tr("messages.notifications")} />
      <Card style={{ gap: 0 }}>
        <LinkRow
          title={tr("settings.notificationPermission")}
          subtitle={
            permission
              ? tr("messages.notificationsAreAllowed")
              : tr("messages.notificationsAreOff")
          }
          icon="bell"
          onPress={() =>
            void app.run(async () => {
              const granted = await requestNotificationPermission();
              setPermission(granted);
              if (!granted) await Linking.openSettings();
            })
          }
        />
        <View style={s.divider} />
        <LinkRow
          title={tr("messages.defaultReminderTime")}
          icon="clock"
          trailing={time}
          onPress={() => setShowTime((v) => !v)}
        />
        {showTime && (
          <View style={{ gap: 12, paddingVertical: 12 }}>
            <DateField
              label={tr("messages.defaultReminderTime")}
              value={time}
              onChange={setTime}
              mode="time"
            />
            <Text style={s.tiny}>
              {tr("messages.appliesToNewSchedulesOnly")}
            </Text>
            <Button
              title={tr("messages.saveDefaultTime")}
              variant="secondary"
              disabled={app.busy || time === app.data.settings.defaultTime}
              onPress={() =>
                void app
                  .run(
                    () => app.care!.setDefaultTime(time),
                    tr("messages.defaultReminderTimeSaved"),
                  )
                  .then((r) => {
                    if (r.ok) setShowTime(false);
                  })
              }
            />
          </View>
        )}
        {!!app.data.schedules.length && (
          <>
            <View style={s.divider} />
            <LinkRow
              title={tr("messages.reminderSettings")}
              icon="calendar"
              onPress={() => setShowSchedules((v) => !v)}
            />
          </>
        )}
        {showSchedules &&
          app.data.schedules.map((sc) => (
            <LinkRow
              key={sc.id}
              title={activityTitle(sc.activityType, sc.title)}
              subtitle={app.data.tanks.find((t) => t.id === sc.tankId)?.name}
              onPress={() =>
                router.push({
                  pathname: "/schedule/reminders",
                  params: {
                    id: sc.id,
                  },
                })
              }
            />
          ))}
      </Card>
      <SectionHeading title={tr("settings.language")} />
      <Card>
        <SelectField
          label={tr("settings.language")}
          value={app.data.settings.language}
          options={languageOptions}
          onChange={(language) => {
            setConfirmation("");
            void app
              .run(() => app.care!.setLanguage(language))
              .then((result) => {
                if (result.ok) app.notify(tr("settings.languageChanged"));
              });
          }}
        />
        <Text style={s.tiny}>{tr("settings.languageHint")}</Text>
      </Card>
      <SectionHeading title={tr("messages.data")} />
      <Card style={{ gap: 0 }}>
        <LinkRow
          title={tr("backup.title")}
          subtitle={
            app.data.settings.lastBackup
              ? tr("messages.lastExportedCount", {
                  0: formatDate(app.data.settings.lastBackup),
                })
              : tr("messages.noBackupsYet")
          }
          icon="archive"
          onPress={() => router.push("/backup")}
        />
        <View style={s.divider} />
        <LinkRow
          title={tr("messages.restoreBackup")}
          icon="archive"
          onPress={() => router.push("/backup")}
        />
        <View style={s.divider} />
        <LinkRow
          title={tr("messages.archivedTank")}
          subtitle={tr("counts.tankCount", {
            0: app.data.tanks.filter((t) => t.archivedAt).length,
          })}
          icon="grid"
          onPress={() => setArchives((v) => !v)}
        />
        {archives &&
          app.data.tanks
            .filter((t) => t.archivedAt)
            .map((t) => (
              <LinkRow
                key={t.id}
                title={t.name}
                subtitle={tr(
                  "messages.openDetailsToRestoreOrPermanentlyDelete",
                )}
                onPress={() =>
                  router.push({
                    pathname: "/tank/[id]",
                    params: {
                      id: t.id,
                    },
                  })
                }
              />
            ))}
      </Card>
      <Banner text={copy.localData} />
      <Card style={{ gap: 0 }}>
        <LinkRow
          title={tr("legal.privacy")}
          icon="shield"
          onPress={() => router.push("/privacy")}
        />
        <View style={s.divider} />
        <LinkRow
          title={tr("legal.support")}
          icon="help-circle"
          onPress={() =>
            void openPublisherLink(publisher.supportUrl, app.notify)
          }
        />
        <View style={s.divider} />
        <LinkRow
          title={tr("messages.aboutAquaAir")}
          subtitle={tr("legal.version", { 0: appVersion })}
          icon="info"
          onPress={() =>
            Alert.alert(
              "Aqua Air",
              tr("messages.keepTankCareHistoryAndRemindersDataIs"),
            )
          }
        />
        <View style={s.divider} />
        <LinkRow
          title={tr("messages.deleteAllData")}
          danger
          icon="trash-2"
          onPress={() => setDeleteMode((v) => !v)}
        />
        {deleteMode && (
          <>
            <Banner text={tr("messages.exportABackupIfYouWantToKeep")} />
            <Button
              title={tr("messages.backUpFirst")}
              variant="secondary"
              onPress={() => router.push("/backup")}
            />
            <Field
              label={tr("settings.deleteConfirmationLabel")}
              value={confirmation}
              onChangeText={setConfirmation}
              autoCapitalize="characters"
            />
            <Button
              title={tr("messages.deleteAllData")}
              variant="danger"
              disabled={
                confirmation !== tr("settings.deleteConfirmationWord") ||
                app.busy
              }
              onPress={() => void wipe()}
            />
          </>
        )}
      </Card>
    </Screen>
  );
}
