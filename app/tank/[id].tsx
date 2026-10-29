import { getLocale } from "../../src/i18n";
import { totalTankVolume } from "../../src/domain/tank-volume";
import { activityTitle } from "../../src/i18n";
import { t as tr } from "../../src/i18n";
import { useHistory } from "../../src/state/useHistory";
import React, { useState, useRef, useEffect } from "react";
import { View, Alert, FlatList, Pressable } from "react-native";
import { Text } from "../../src/ui/text";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useApp } from "../../src/state/AppProvider";
import {
  Screen,
  Button,
  Card,
  TankPhoto,
  Choices,
  Empty,
  IconButton,
  Pill,
  LinkRow,
  UnderlineTabs,
  SelectField,
  Icon,
} from "../../src/ui/components";
import { s, c } from "../../src/ui/theme";
import {
  dueDate,
  latestLog,
  compareLogs,
  taskStatus,
} from "../../src/domain/scheduling";
import { localDate, formatDate } from "../../src/domain/dates";
import { lastWaterChange } from "../../src/domain/selectors";
import { copy } from "../../src/i18n";
import { shortDate } from "../../src/ui/date-labels";
import { useWaterReadings } from "../../src/state/useWaterReadings";
import {
  TankWaterSummary,
  WaterReadingsPanel,
} from "../../src/ui/water-readings";
export default function Detail() {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();
  const app = useApp(),
    router = useRouter(),
    tank = app.data.tanks.find((t) => t.id === id);
  const [tab, setTab] = useState("history"),
    [filter, setFilter] = useState("all"),
    [showFilter, setShowFilter] = useState(false);
  const listRef = useRef<FlatList>(null),
    headerHeight = useRef(0),
    jumpToWater = useRef(false);
  const measurements = useWaterReadings(id, tab === "water");
  const scrollToWater = () =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        listRef.current?.scrollToOffset({
          offset: Math.max(0, headerHeight.current - 56),
          animated: true,
        }),
      ),
    );
  const showWater = () => {
    jumpToWater.current = true;
    setTab("water");
    if (tab === "water" && measurements.result) {
      jumpToWater.current = false;
      scrollToWater();
    }
  };
  useEffect(() => {
    if (tab === "water" && measurements.result && jumpToWater.current) {
      jumpToWater.current = false;
      scrollToWater();
    }
  }, [tab, measurements.result]);
  const page = useHistory(id, filter);
  const history = page.logs;
  if (!tank)
    return (
      <Screen title={tr("tank.detailsTitle")}>
        <Empty title={tr("messages.thisTankNoLongerExists")} />
      </Screen>
    );
  const schedules = app.data.schedules.filter((s) => s.tankId === id),
    water = schedules.find(
      (s) => s.activityType === "water_change" && s.enabled,
    ),
    last = lastWaterChange(app.data, id);
  const litres = (value: number) =>
    new Intl.NumberFormat(getLocale(), {
      maximumSignificantDigits: 8,
    }).format(value) + " L";
  const systemVolume = totalTankVolume(tank);
  const filterLabel =
    [
      tank.hasSump ? "Sump" : null,
      tank.hasCanister ? tr("tank.canisterLabel") : null,
    ]
      .filter(Boolean)
      .join(" + ") || tr("common.notSpecified");
  const edit = () =>
    router.push({
      pathname: "/tank/edit",
      params: {
        id,
      },
    });
  const archive = () =>
    Alert.alert(
      tank.archivedAt
        ? tr("messages.restoreTankLabel")
        : tr("messages.archiveTankLabel"),
      tank.archivedAt
        ? tr("messages.schedulesWillBeRecalculatedFromHistoryAndMay")
        : tr("messages.allHistoryWillBeKeptAndRemindersFor"),
      [
        {
          text: tr("common.cancel"),
          style: "cancel",
        },
        {
          text: tank.archivedAt
            ? tr("messages.restoreTank")
            : tr("messages.archiveTank"),
          onPress: () =>
            void app.run(
              () => app.care!.archiveTank(id, !tank.archivedAt),
              tr("messages.tankUpdated"),
            ),
        },
      ],
    );
  const menu = () =>
    Alert.alert(tank.name, tr("messages.manageTank"), [
      {
        text: tr("common.close"),
        style: "cancel",
      },
      {
        text: tr("messages.activityType"),
        onPress: () => {
          setTab("history");
          setShowFilter((v) => !v);
        },
      },
      {
        text: tr("messages.editTank"),
        onPress: edit,
      },
      {
        text: tank.archivedAt
          ? tr("messages.restoreTank")
          : tr("messages.archiveTank"),
        onPress: archive,
      },
    ]);
  const remove = () =>
    Alert.alert(
      tr("messages.permanentlyDeleteTankLabel"),
      tr("messages.allHistoryCareSchedulesAndPhotosForThis"),
      [
        {
          text: tr("messages.keep"),
          style: "cancel",
        },
        {
          text: tr("messages.deletePermanently"),
          style: "destructive",
          onPress: async () => {
            const r = await app.run(
              () => app.care!.deleteTank(id),
              tr("messages.tankDeleted"),
            );
            if (r.ok) router.replace("/tanks");
          },
        },
      ],
    );
  const header = (
    <View
      onLayout={(event) => {
        headerHeight.current = event.nativeEvent.layout.height;
      }}
      style={{
        gap: 16,
        marginBottom: 18,
      }}
    >
      <View style={{ marginHorizontal: -20, marginTop: -4 }}>
        <TankPhoto
          photo={app.data.photos.find((p) => p.id === tank.coverPhotoId)}
          large
          height={220}
        />
      </View>
      <View style={{ gap: 3 }}>
        <Text style={[s.title, { fontSize: 23, lineHeight: 29 }]}>
          {tank.name}
        </Text>
        <Text style={s.muted}>
          {tank.volumeLitres ? `${litres(tank.volumeLitres)} · ` : ""}
          {copy.water[tank.waterType]}
          {tank.groupName ? ` · ${tank.groupName}` : ""}
        </Text>
      </View>
      {tank.archivedAt && (
        <Card aqua>
          <Text style={s.body}>
            {tr("messages.tankArchivedRemindersStopped")}
          </Text>
          <Button title={tr("messages.restoreTank")} onPress={archive} />
        </Card>
      )}
      <View style={[s.row, { alignItems: "stretch", gap: 10 }]}>
        <View style={s.grow}>
          <Card
            style={{
              flex: 1,
              paddingVertical: 13,
              paddingHorizontal: 12,
              gap: 7,
            }}
          >
            <Text style={s.tiny}>{tr("messages.lastWaterChange")}</Text>
            <Text style={[s.label, { fontSize: 16, lineHeight: 22 }]}>
              {last
                ? `${shortDate(last.performedLocalDate)} · ${last.percent}%`
                : tr("messages.noWaterChangesRecorded")}
            </Text>
          </Card>
        </View>
        <View style={s.grow}>
          <Card
            style={{
              flex: 1,
              paddingVertical: 13,
              paddingHorizontal: 12,
              gap: 7,
            }}
          >
            <Text style={s.tiny}>{tr("messages.nextWaterChangeDue")}</Text>
            <Text style={[s.label, { fontSize: 16, lineHeight: 22 }]}>
              {water
                ? shortDate(dueDate(water, app.data.logs))
                : tr("messages.noScheduleYet")}
            </Text>
            {water && (
              <Pill
                label={
                  taskStatus(dueDate(water, app.data.logs), localDate()).label
                }
                kind={
                  taskStatus(dueDate(water, app.data.logs), localDate()).kind
                }
              />
            )}
          </Card>
        </View>
      </View>
      {measurements.latest.length > 0 && (
        <TankWaterSummary values={measurements.latest} onPress={showWater} />
      )}
      {!tank.archivedAt && (
        <Button
          title={tr("care.logTitle")}
          onPress={() =>
            router.push({
              pathname: "/care/edit",
              params: {
                tankId: id,
              },
            })
          }
        />
      )}
      {!tank.archivedAt && tab !== "water" && (
        <Button
          title={tr("readings.log")}
          variant="secondary"
          onPress={() =>
            router.push({ pathname: "/water/edit", params: { tankId: id } })
          }
        />
      )}
      <UnderlineTabs
        value={tab}
        onChange={setTab}
        options={[
          ["history", tr("messages.history")],
          ["water", tr("readings.title")],
          ["schedule", tr("schedule.title")],
          ["info", tr("messages.information")],
        ]}
      />
      {tab === "history" && (showFilter || filter !== "all") && (
        <SelectField
          label={tr("messages.activityType")}
          value={filter}
          onChange={(v) => {
            setFilter(v);
          }}
          options={[
            ["all", tr("common.all")],
            ...Object.entries(copy.activity),
          ]}
        />
      )}
    </View>
  );
  return (
    <Screen
      title={tank.name}
      right={
        <IconButton
          name="more-horizontal"
          label={tr("messages.tankOptions")}
          onPress={menu}
        />
      }
      scroll={false}
    >
      <FlatList
        ref={listRef}
        data={tab === "history" ? history : []}
        keyExtractor={(l) => l.id}
        initialNumToRender={10}
        windowSize={5}
        contentContainerStyle={[s.content, { gap: 0 }]}
        ListHeaderComponent={header}
        onEndReached={() => {
          if (tab === "history") void page.loadMore();
        }}
        ItemSeparatorComponent={() => (
          <View
            style={{
              height: 0,
            }}
          />
        )}
        renderItem={({ item: l }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr("messages.countOnCount", {
              0: activityTitle(l.activityType, l.titleSnapshot),
              1: formatDate(l.performedLocalDate),
            })}
            onPress={() =>
              router.push({
                pathname: "/care/[id]",
                params: {
                  id: l.id,
                },
              })
            }
          >
            <View
              style={{
                borderStartWidth: 2,
                borderColor: c.timeline,
                marginStart: 7,
                paddingStart: 18,
                paddingBottom: 14,
              }}
            >
              <View
                style={{
                  position: "absolute",
                  start: -6,
                  top: 20,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: c.primary,
                  borderWidth: 2,
                  borderColor: c.background,
                }}
              />
              <View
                style={{
                  backgroundColor: c.surface,
                  paddingVertical: 13,
                  paddingHorizontal: 14,
                  borderRadius: 15,
                  gap: 5,
                }}
              >
                <Text style={s.tiny}>
                  {formatDate(l.performedAt, {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                <Text style={[s.label, { fontSize: 14 }]}>
                  {activityTitle(l.activityType, l.titleSnapshot)}
                  {l.percent ? ` · ${l.percent}%` : ""}
                </Text>
                {!!l.notes && <Text style={s.muted}>{l.notes}</Text>}
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          tab === "history" ? (
            <Empty
              title={
                page.error ??
                (page.loading
                  ? tr("messages.loadingHistory")
                  : tr("messages.noMatchingActivitiesYet"))
              }
            />
          ) : tab === "water" ? (
            <WaterReadingsPanel
              tankId={id}
              archived={!!tank.archivedAt}
              page={measurements}
            />
          ) : tab === "schedule" ? (
            <View
              style={{
                gap: 12,
              }}
            >
              {schedules.map((sc) => {
                const status = taskStatus(
                  dueDate(sc, app.data.logs),
                  localDate(),
                );
                return (
                  <Pressable
                    key={sc.id}
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({
                        pathname: "/schedule/edit",
                        params: {
                          id: sc.id,
                          tankId: id,
                        },
                      })
                    }
                  >
                    <Card style={s.row}>
                      <Icon
                        name={
                          sc.activityType === "water_change"
                            ? "droplet"
                            : "filter"
                        }
                      />
                      <View style={s.grow}>
                        <Text style={s.label}>
                          {activityTitle(sc.activityType, sc.title)}
                        </Text>
                        <Text style={s.muted}>
                          {tr("schedule.everyDays", { 0: sc.intervalDays })} ·
                          {formatDate(dueDate(sc, app.data.logs))}
                        </Text>
                      </View>
                      <Pill
                        label={
                          !sc.enabled
                            ? tr("status.paused")
                            : tank.archivedAt
                              ? tr("messages.archivedTank")
                              : status.label
                        }
                        kind={
                          sc.enabled && !tank.archivedAt
                            ? status.kind
                            : "normal"
                        }
                      />
                    </Card>
                  </Pressable>
                );
              })}
              {!schedules.length && (
                <Empty title={tr("messages.noCareSchedulesYet")} />
              )}
              {!tank.archivedAt && (
                <Button
                  variant="secondary"
                  title={tr("messages.addCareSchedule")}
                  icon="plus"
                  onPress={() =>
                    router.push({
                      pathname: "/schedule/edit",
                      params: {
                        tankId: id,
                      },
                    })
                  }
                />
              )}
            </View>
          ) : (
            <Card>
              <Text style={s.body}>
                {tank.description || tr("messages.noDescriptionYet")}
              </Text>
              <Text style={s.muted}>
                {tr("messages.volume")}{" "}
                {tank.volumeLitres
                  ? litres(tank.volumeLitres)
                  : tr("common.notEntered")}
              </Text>
              <Text style={s.muted}>
                {tr("tank.dimensionsLabel")}:{" "}
                {tank.lengthCm != null &&
                tank.widthCm != null &&
                tank.heightCm != null
                  ? `${tank.lengthCm.toLocaleString(getLocale())} × ${tank.widthCm.toLocaleString(getLocale())} × ${tank.heightCm.toLocaleString(getLocale())} cm`
                  : tr("common.notEntered")}
              </Text>
              <Text style={s.muted}>
                {tr("tank.filtersTitle")}: {filterLabel}
              </Text>
              <Text style={s.muted}>
                {tr("tank.sumpVolume")}:{" "}
                {tank.hasSump && tank.sumpVolumeLitres != null
                  ? litres(tank.sumpVolumeLitres)
                  : tr("tank.noSump")}
              </Text>
              {tank.hasSump && (
                <Text style={s.muted}>
                  {tr("tank.totalVolumeLabel")}:{" "}
                  {systemVolume === null
                    ? tr("common.unknown")
                    : litres(systemVolume)}
                </Text>
              )}
              {tank.lengthCm != null && (
                <Text style={s.muted}>
                  {tr("messages.geometricCapacityActualWaterVolumeMayBeLower")}
                </Text>
              )}
              <Text style={s.muted}>
                {tr("messages.waterTypeLabel")}
                {copy.water[tank.waterType]}
              </Text>
              <Text style={s.muted}>
                {tr("messages.groupShelf")}
                {tank.groupName || tr("common.notEntered")}
              </Text>
              <Text style={s.muted}>
                {tr("messages.created")}
                {formatDate(tank.createdAt)}
              </Text>
              <Button
                title={tr("messages.editTank")}
                variant="secondary"
                onPress={edit}
              />
              <Button
                title={
                  tank.archivedAt
                    ? tr("messages.restoreTank")
                    : tr("messages.archiveTank")
                }
                variant="secondary"
                onPress={archive}
              />
              {tank.archivedAt && (
                <Button
                  title={tr("messages.permanentlyDeleteTank")}
                  variant="danger"
                  onPress={remove}
                />
              )}
            </Card>
          )
        }
      />
    </Screen>
  );
}
