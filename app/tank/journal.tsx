import React, { useEffect, useState } from "react";
import {
  View,
  Image,
  Modal,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useApp } from "../../src/state/AppProvider";
import type { JournalEntry } from "../../src/domain/models";
import { Screen, Card, Button, Empty, Banner } from "../../src/ui/components";
import { Text } from "../../src/ui/text";
import { s, c } from "../../src/ui/theme";
import { photoUri } from "../../src/services/media";
import { readingDate } from "../../src/ui/water-readings";
import { t } from "../../src/i18n";
export default function Journal() {
  const { tankId } = useLocalSearchParams<{ tankId: string }>(),
    app = useApp(),
    router = useRouter(),
    { width } = useWindowDimensions();
  const tank = app.data.tanks.find((t) => t.id === tankId);
  const [rows, setRows] = useState<JournalEntry[]>([]),
    [cursors, setCursors] = useState<JournalEntry[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0),
    [selected, setSelected] = useState<JournalEntry[]>([]),
    [view, setView] = useState<JournalEntry[] | null>(null);
  const cursor = cursors.at(-1);
  useEffect(() => {
    setCursors([]);
    setSelected([]);
  }, [tankId, app.historyVersion]);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    if (app.store)
      void app.store
        .journalHistory(tankId, cursor, 31)
        .then((r) => {
          if (alive) {
            setRows(r);
            setLoading(false);
          }
        })
        .catch(() => {
          if (alive) {
            setError(true);
            setLoading(false);
          }
        });
    return () => {
      alive = false;
    };
  }, [tankId, cursor, app.store, app.historyVersion, retry]);
  const photo = (j: JournalEntry) =>
    photoUri(app.data.photos.find((p) => p.id === j.photoId));
  if (!tank)
    return (
      <Screen title={t("insights.journal")}>
        <Empty title={t("error.notFound")} />
      </Screen>
    );
  return (
    <Screen title={t("insights.journal")}>
      <Text style={s.heading}>{tank.name}</Text>
      {!tank.archivedAt && (
        <Button
          title={t("insights.addPhoto")}
          onPress={() =>
            router.push({ pathname: "/journal/edit", params: { tankId } })
          }
        />
      )}
      <Button
        title={t("insights.compare") + ` (${selected.length}/2)`}
        variant="secondary"
        disabled={selected.length !== 2}
        onPress={() => setView(selected)}
      />
      {loading ? (
        <Text style={s.muted}>{t("readings.loading")}</Text>
      ) : error ? (
        <>
          <Banner text={t("readings.error")} />
          <Button
            title={t("common.tryAgain")}
            onPress={() => setRetry((n) => n + 1)}
          />
        </>
      ) : !rows.length ? (
        <Empty title={t("insights.empty")} />
      ) : (
        rows.slice(0, 30).map((j) => (
          <Card key={j.id}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={readingDate(j.performedAt)}
              onPress={() => setView([j])}
            >
              {photo(j) ? (
                <Image
                  accessibilityLabel={j.notes || t("insights.journal")}
                  source={{ uri: photo(j) }}
                  style={{ width: "100%", height: 220, borderRadius: 16 }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={s.muted}>{t("insights.photoUnavailable")}</Text>
              )}
            </Pressable>
            <Text style={s.label}>{readingDate(j.performedAt)}</Text>
            {!!j.notes && <Text style={s.body}>{j.notes}</Text>}
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{
                checked: selected.some((x) => x.id === j.id),
              }}
              onPress={() =>
                setSelected((old) =>
                  old.some((x) => x.id === j.id)
                    ? old.filter((x) => x.id !== j.id)
                    : old.length < 2
                      ? [...old, j]
                      : [old[1]!, j],
                )
              }
              style={[s.row, { minHeight: 44 }]}
            >
              <Text style={{ color: c.primary }}>
                {selected.some((x) => x.id === j.id) ? "☑" : "☐"}
              </Text>
              <Text style={s.body}>{t("insights.selectCompare")}</Text>
            </Pressable>
            {!tank.archivedAt && (
              <Button
                title={t("insights.edit")}
                variant="secondary"
                onPress={() =>
                  router.push({
                    pathname: "/journal/edit",
                    params: { tankId, id: j.id },
                  })
                }
              />
            )}
          </Card>
        ))
      )}
      {!loading && (
        <View style={s.row}>
          {cursors.length > 0 && (
            <Button
              title={t("readings.newer")}
              variant="secondary"
              onPress={() => setCursors((c) => c.slice(0, -1))}
            />
          )}
          {rows.length > 30 && (
            <Button
              title={t("readings.older")}
              variant="secondary"
              onPress={() => setCursors((c) => [...c, rows[29]!])}
            />
          )}
        </View>
      )}
      <Modal
        visible={!!view}
        onRequestClose={() => setView(null)}
        animationType="fade"
      >
        <Screen
          title={t(
            view?.length === 2 ? "insights.compare" : "insights.journal",
          )}
          back={false}
          right={
            <Button
              title={t("insights.close")}
              variant="secondary"
              onPress={() => setView(null)}
            />
          }
        >
          <View
            style={{ flexDirection: width >= 650 ? "row" : "column", gap: 20 }}
          >
            {view?.map((j) => (
              <View
                key={j.id}
                style={{ gap: 10, ...(width >= 650 ? { flex: 1 } : {}) }}
              >
                {photo(j) ? (
                  <Image
                    source={{ uri: photo(j) }}
                    accessibilityLabel={j.notes || t("insights.journal")}
                    style={{ width: "100%", aspectRatio: 1 }}
                    resizeMode="contain"
                  />
                ) : (
                  <Text>{t("insights.photoUnavailable")}</Text>
                )}
                <Text style={s.label}>{readingDate(j.performedAt)}</Text>
                <Text style={s.body}>{j.notes}</Text>
              </View>
            ))}
          </View>
        </Screen>
      </Modal>
    </Screen>
  );
}
