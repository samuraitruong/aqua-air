import { quantityLabel } from "../src/i18n";
import { t as tr } from "../src/i18n";
import React, { useState } from "react";
import { View, ActivityIndicator, Alert } from "react-native";
import { Text } from "../src/ui/text";
import { useRouter } from "expo-router";
import { useApp } from "../src/state/AppProvider";
import {
  Screen,
  Card,
  Button,
  Banner,
  Icon,
  CenterIcon,
} from "../src/ui/components";
import { s, c } from "../src/ui/theme";
import {
  exportBackup,
  pickBackup,
  restoreBackup,
} from "../src/services/backup";
import type { BackupPreview } from "../src/services/backup-format";
import { formatDate } from "../src/domain/dates";
export default function Backup() {
  const app = useApp(),
    router = useRouter();
  const [preview, setPreview] = useState<BackupPreview | null>(null),
    [stage, setStage] = useState("");
  async function create(withoutPhotos = false) {
    setStage(tr("messages.checkingDataAndCreatingYourBackup"));
    try {
      await app.run(
        () => exportBackup(app.store!, withoutPhotos),
        tr("messages.backupSharingOpened"),
      );
    } finally {
      setStage("");
    }
  }
  async function inspect() {
    setStage(tr("messages.checkingTheBackupFile"));
    try {
      await app.run(async () => {
        const file = await pickBackup();
        if (file) setPreview(file);
      });
    } finally {
      setStage("");
    }
  }
  function restore() {
    if (!preview) return;
    Alert.alert(
      tr("messages.replaceCurrentData"),
      tr("messages.thisBackupWillReplaceAllCurrentTanksHistory"),
      [
        {
          text: tr("common.cancel"),
          style: "cancel",
        },
        {
          text: tr("messages.replaceAndRestore"),
          style: "destructive",
          onPress: async () => {
            setStage(tr("messages.restoringData"));
            try {
              const r = await app.run(
                () => restoreBackup(app.store!, preview),
                tr("messages.dataRestored"),
              );
              if (r.ok) {
                setPreview(null);
                router.replace("/");
              }
            } finally {
              setStage("");
            }
          },
        },
      ],
    );
  }
  return (
    <Screen title={tr("backup.title")}>
      <View
        style={{
          alignItems: "center",
          gap: 12,
          paddingVertical: 20,
        }}
      >
        <CenterIcon name="folder" large />
        <Text
          style={[
            s.title,
            {
              textAlign: "center",
              fontSize: 26,
              lineHeight: 33,
            },
          ]}
        >
          {tr("messages.keepYourTankCareJourney")}
        </Text>
        <Text
          style={[
            s.muted,
            {
              textAlign: "center",
            },
          ]}
        >
          {tr("messages.exportDataAndPhotosAsAnAquaairFile")}
        </Text>
      </View>
      <Card style={{ gap: 0 }}>
        {(
          [
            [app.data.tanks.length, "counts.tanks", "grid"],
            [app.totalLogs, "counts.activities", "file-text"],
            [app.totalReadings, "readings.count", "activity"],
            [app.data.schedules.length, "counts.schedules", "calendar"],
            [app.data.photos.length, "counts.photos", "image"],
          ] as const
        ).map(([n, label, icon], i) => (
          <View
            key={label}
            style={[
              s.row,
              {
                paddingVertical: 16,
                borderTopWidth: i ? 1 : 0,
                borderColor: c.cardBorder,
              },
            ]}
          >
            <Icon name={icon} />
            <Text style={s.body}>
              {label === "readings.count"
                ? tr(label, { 0: n })
                : `${n} ${quantityLabel(label, Number(n))}`}
            </Text>
          </View>
        ))}
      </Card>
      <Card aqua>
        <Text style={s.muted}>{tr("messages.lastBackup")}</Text>
        <Text style={s.label}>
          {app.data.settings.lastBackup
            ? formatDate(app.data.settings.lastBackup, {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : tr("messages.noBackupsYet")}
        </Text>
      </Card>
      {stage && (
        <Card>
          <ActivityIndicator color={c.primary} />
          <Text accessibilityLiveRegion="polite" style={s.body}>
            {stage}
          </Text>
        </Card>
      )}
      <Button
        title={tr("messages.createBackup")}
        onPress={() => void create()}
        disabled={app.busy}
      />
      <Button
        title={tr("messages.restoreFromAquaairFile")}
        variant="secondary"
        onPress={() => void inspect()}
        disabled={app.busy}
      />
      <Button
        title={tr("messages.exportDataWithoutPhotos")}
        variant="ghost"
        disabled={app.busy}
        onPress={() =>
          Alert.alert(
            tr("messages.exportWithoutPhotos"),
            tr("messages.thisBackupWillContainTanksHistoryAndSchedules"),
            [
              {
                text: tr("common.cancel"),
                style: "cancel",
              },
              {
                text: tr("messages.exportWithoutPhotosLabel"),
                onPress: () => void create(true),
              },
            ],
          )
        }
      />
      {preview && (
        <Card>
          <Text style={s.heading}>{tr("messages.backupVerified")}</Text>
          <Text style={s.body}>{formatDate(preview.manifest.exportedAt)}</Text>
          <Text style={s.body}>
            {preview.manifest.counts.tanks}
            {tr("messages.tanks")}
            {preview.manifest.counts.logs} {tr("messages.activities")}
            {preview.manifest.counts.schedules}
            {tr("messages.schedules")} {preview.manifest.counts.photos}
            {tr("messages.photos")}
          </Text>
          <Text style={s.body}>
            {tr("readings.count", {
              0: preview.manifest.counts.waterReadings ?? 0,
            })}
          </Text>
          <Banner text={tr("messages.yourCurrentDataWillBeReplacedYouCan")} />
          <Button
            title={tr("messages.backUpCurrentData")}
            variant="secondary"
            onPress={() => void create()}
            disabled={app.busy}
          />
          <Button
            title={tr("messages.replaceAndRestore")}
            variant="danger"
            onPress={restore}
            disabled={app.busy}
          />
          <Button
            title={tr("messages.cancelRestore")}
            variant="ghost"
            onPress={() => setPreview(null)}
            disabled={app.busy}
          />
        </Card>
      )}
      <Text style={s.muted}>
        {tr("validation.theAppDoesNotEncryptBackupFilesYou")}
      </Text>
    </Screen>
  );
}
