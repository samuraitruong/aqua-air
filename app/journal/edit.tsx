import React, { useEffect, useState } from "react";
import { Image, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useApp } from "../../src/state/AppProvider";
import { useInsightsService } from "../../src/state/useTankInsights";
import type { JournalEntry, Photo } from "../../src/domain/models";
import { pickTankPhoto, photoUri } from "../../src/services/media";
import { localDate, localTime, atLocalTime } from "../../src/domain/dates";
import {
  Screen,
  Card,
  Button,
  Field,
  DateField,
  Empty,
  Banner,
  useFormGuard,
} from "../../src/ui/components";
import { Text } from "../../src/ui/text";
import { s } from "../../src/ui/theme";
import { t } from "../../src/i18n";
export default function JournalLoader() {
  const { id } = useLocalSearchParams<{ id?: string }>(),
    app = useApp(),
    [loaded, setLoaded] = useState<{ id: string; entry?: JournalEntry } | null>(
      null,
    ),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setError(false);
    if (id && app.store)
      void app.store
        .getJournalEntry(id)
        .then((entry) => {
          if (alive) setLoaded({ id, entry });
        })
        .catch(() => {
          if (alive) setError(true);
        });
    return () => {
      alive = false;
    };
  }, [id, app.store, attempt]);
  if (error)
    return (
      <Screen title={t("insights.journal")}>
        <Banner text={t("readings.error")} />
        <Button
          title={t("common.tryAgain")}
          onPress={() => setAttempt((n) => n + 1)}
        />
      </Screen>
    );
  if (id && loaded?.id !== id)
    return (
      <Screen title={t("insights.journal")}>
        <Text>{t("readings.loading")}</Text>
      </Screen>
    );
  if (id && !loaded?.entry)
    return (
      <Screen title={t("insights.journal")}>
        <Empty title={t("error.notFound")} />
      </Screen>
    );
  return <JournalForm key={id ?? "new"} original={loaded?.entry} />;
}
function JournalForm({ original }: { original?: JournalEntry }) {
  const { tankId: requested } = useLocalSearchParams<{ tankId: string }>(),
    tankId = original?.tankId ?? requested,
    app = useApp(),
    router = useRouter(),
    service = useInsightsService();
  const tank = app.data.tanks.find((t) => t.id === tankId);
  const [date, setDate] = useState(original?.performedLocalDate ?? localDate()),
    [time, setTime] = useState(
      original ? localTime(new Date(original.performedAt)) : localTime(),
    ),
    [notes, setNotes] = useState(original?.notes ?? ""),
    [photo, setPhoto] = useState<Photo | undefined>(undefined);
  const [initial] = useState(JSON.stringify([date, time, notes]));
  const allow = useFormGuard(
    !!photo || JSON.stringify([date, time, notes]) !== initial,
  );
  const back = () => {
    allow.current = true;
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: "/tank/journal", params: { tankId } });
  };
  const pick = (camera = false) =>
    void app.run(async () => {
      const next = await pickTankPhoto(camera);
      if (next) setPhoto(next);
    });
  if (!tank)
    return (
      <Screen title={t("insights.journal")}>
        <Empty title={t("error.notFound")} />
      </Screen>
    );
  if (tank.archivedAt)
    return (
      <Screen title={t("insights.journal")}>
        <Banner text={t("messages.thisTankIsArchivedRestoreItToLog")} />
      </Screen>
    );
  const image =
      photo ?? app.data.photos.find((p) => p.id === original?.photoId),
    uri = photoUri(image);
  return (
    <Screen
      title={t(original ? "insights.edit" : "insights.addPhoto")}
      footer={
        <Button
          title={t("common.saveChanges")}
          disabled={app.busy || !image}
          onPress={() =>
            void app
              .run(
                () =>
                  service!.saveJournal(
                    {
                      id: original?.id,
                      tankId,
                      photoId: original?.photoId,
                      performedLocalDate: date,
                      performedAt:
                        original &&
                        date === original.performedLocalDate &&
                        time === localTime(new Date(original.performedAt))
                          ? original.performedAt
                          : atLocalTime(date, time).toISOString(),
                      notes,
                    },
                    photo,
                  ),
                t("insights.saved"),
              )
              .then((r) => {
                if (r.ok) back();
              })
          }
        />
      }
    >
      <Text style={s.heading}>{tank.name}</Text>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: "100%", height: 250, borderRadius: 20 }}
          resizeMode="contain"
        />
      ) : (
        <Empty title={t("insights.photoRequired")} />
      )}
      <Button
        title={t("insights.choosePhoto")}
        variant="secondary"
        disabled={app.busy}
        onPress={() => pick()}
      />
      <Button
        title={t("insights.camera")}
        variant="secondary"
        disabled={app.busy}
        onPress={() => pick(true)}
      />
      <Card>
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
        <Field
          label={t("insights.notes")}
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={2000}
        />
      </Card>
      {original && (
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
                    .run(() => service!.deleteJournal(original.id))
                    .then((r) => {
                      if (r.ok) back();
                    }),
              },
            ])
          }
        />
      )}
    </Screen>
  );
}
