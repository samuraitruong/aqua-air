import { activityTitle } from "../../src/i18n";
import { getLocale } from "../../src/i18n";
import { t as tr } from "../../src/i18n";
import React, { useState, useEffect } from "react";
import { View, Pressable } from "react-native";
import { Text } from "../../src/ui/text";
import { useRouter } from "expo-router";
import { useApp } from "../../src/state/AppProvider";
import {
  Screen,
  Choices,
  Card,
  TaskCard,
  Empty,
  Pill,
  Button,
  IconButton,
  DateField,
  SelectField,
  SectionHeading,
  Icon,
} from "../../src/ui/components";
import { s, c } from "../../src/ui/theme";
import { calendarItems } from "../../src/domain/selectors";
import {
  localDate,
  addDays,
  formatDate,
  isDate,
  differenceDays,
} from "../../src/domain/dates";
import { activityTypes } from "../../src/domain/models";
import { getTasks } from "../../src/domain/scheduling";
import { copy } from "../../src/i18n";
import { shortDate } from "../../src/ui/date-labels";
const weekdayKeys = [
  "calendar.weekday.sun",
  "calendar.weekday.mon",
  "calendar.weekday.tue",
  "calendar.weekday.wed",
  "calendar.weekday.thu",
  "calendar.weekday.fri",
  "calendar.weekday.sat",
] as const;
export default function Calendar() {
  const app = useApp(),
    router = useRouter();
  const today = localDate();
  const [selected, setSelected] = useState(today),
    [tank, setTank] = useState(""),
    [type, setType] = useState(""),
    [month, setMonth] = useState(false),
    [showFilters, setShowFilters] = useState(false);
  const date = isDate(selected) ? selected : today;
  const [dayLogs, setDayLogs] = useState<
    import("../../src/domain/models").CareLog[]
  >([]);
  useEffect(() => {
    let alive = true;
    app
      .store!.logsOnDate(date)
      .then((rows) => {
        if (alive) setDayLogs(rows);
      })
      .catch(() => {
        if (alive) setDayLogs([]);
      });
    return () => {
      alive = false;
    };
  }, [app.store, date, app.data]);
  const mergedLogs = [
    ...new Map([...app.data.logs, ...dayLogs].map((l) => [l.id, l])).values(),
  ];
  const items = calendarItems(
    {
      ...app.data,
      logs: mergedLogs,
    },
    date,
    today,
    tank,
    type,
  );
  const monthFirst = date.slice(0, 7) + "-01";
  const offset = (new Date(monthFirst + "T12:00:00").getDay() + 6) % 7;
  const days = Array.from(
    {
      length: 42,
    },
    (_, i) => addDays(monthFirst, i - offset),
  );
  function choose(value: string) {
    if (!isDate(value)) return;
    const diff = differenceDays(value, today);
    if (diff > 90) {
      app.notify(tr("validation.youCanViewProjectionsUpTo90Days"));
      return;
    }
    setSelected(value);
  }
  return (
    <Screen
      title={tr("schedule.title")}
      back={false}
      right={
        <View style={[s.row, { gap: 2 }]}>
          <IconButton
            name="sliders"
            label={tr("common.filters")}
            onPress={() => setShowFilters((v) => !v)}
          />
          <IconButton
            name="calendar"
            label={tr("messages.showOrHideMonthView")}
            onPress={() => setMonth((v) => !v)}
          />
        </View>
      }
    >
      <View style={s.between}>
        <IconButton
          name="chevron-left"
          label={
            month ? tr("messages.previousMonth") : tr("messages.previousWeek")
          }
          onPress={() =>
            choose(
              month
                ? localDate(
                    new Date(
                      Number(date.slice(0, 4)),
                      Number(date.slice(5, 7)) - 2,
                      1,
                      12,
                    ),
                  )
                : addDays(date, -7),
            )
          }
        />
        <View style={s.grow}>
          <DateField
            label={new Intl.DateTimeFormat(getLocale(), {
              month: "long",
              year: "numeric",
            }).format(new Date(date + "T12:00:00"))}
            value={date}
            onChange={choose}
          />
        </View>
        <IconButton
          name="chevron-right"
          label={month ? tr("messages.nextMonth") : tr("messages.nextWeek")}
          onPress={() =>
            choose(
              month
                ? localDate(
                    new Date(
                      Number(date.slice(0, 4)),
                      Number(date.slice(5, 7)),
                      1,
                      12,
                    ),
                  )
                : addDays(date, 7),
            )
          }
        />
      </View>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
        }}
      >
        {(month
          ? days
          : Array.from(
              {
                length: 7,
              },
              (_, i) => addDays(date, i - 2),
            )
        ).map((day) => (
          <Pressable
            key={day}
            accessibilityRole="button"
            accessibilityState={{
              selected: day === date,
            }}
            accessibilityLabel={formatDate(day)}
            onPress={() => choose(day)}
            style={{
              width: "14.28%",
              minHeight: 64,
              padding: 6,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              backgroundColor: day === date ? c.primary : "transparent",
              opacity: month && day.slice(0, 7) !== date.slice(0, 7) ? 0.4 : 1,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                color: day === date ? "white" : c.muted,
              }}
            >
              {tr(weekdayKeys[new Date(day + "T12:00:00").getDay()]!)}
            </Text>
            <Text
              style={{
                fontSize: 15,
                marginTop: 5,
                fontWeight: "600",
                color: day === date ? "white" : c.text,
              }}
            >
              {Number(day.slice(8))}
            </Text>
          </Pressable>
        ))}
      </View>
      {showFilters && (
        <>
          <SelectField
            label={tr("nav.tanks")}
            value={tank}
            onChange={setTank}
            options={[
              ["", tr("messages.allTanks")],
              ...app.data.tanks
                .filter((t) => !t.archivedAt)
                .map((t) => [t.id, t.name] as const),
            ]}
          />
          <SelectField
            label={tr("messages.activityType")}
            value={type}
            onChange={setType}
            options={[
              ["", tr("common.all")],
              ...activityTypes.map((t) => [t, copy.activity[t]] as const),
            ]}
          />
        </>
      )}
      <SectionHeading
        action={date !== today ? tr("status.today") : undefined}
        onPress={() => choose(today)}
        title={`${date === today ? tr("status.today") : tr("schedule.title")} · ${shortDate(date)}`}
      />
      {!items.length && (
        <Empty
          title={tr("messages.noCareScheduledForThisDay")}
          icon="calendar"
        />
      )}
      {items.map((item) =>
        item.kind === "log" ? (
          <Pressable
            key={"log-" + item.log.id}
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: "/care/[id]",
                params: {
                  id: item.log.id,
                },
              })
            }
          >
            <Card style={s.row}>
              <Icon name="check" />
              <View style={s.grow}>
                <Text style={[s.label, { fontSize: 14 }]}>
                  {app.data.tanks.find((t) => t.id === item.log.tankId)?.name}
                </Text>
                <Text style={s.muted}>
                  {activityTitle(item.log.activityType, item.log.titleSnapshot)}
                  {item.log.percent ? ` · ${item.log.percent}%` : ""}
                </Text>
              </View>
              <Pill label={tr("status.recorded")} kind="success" />
            </Card>
          </Pressable>
        ) : item.kind === "due" ? (
          <TaskCard key={"due-" + item.task.schedule.id} task={item.task} />
        ) : (
          <Card key={"projected-" + item.task.schedule.id}>
            <Pill label={tr("status.projected")} kind="projected" />
            <Text style={s.label}>{item.task.tank.name}</Text>
            <Text style={s.body}>
              {activityTitle(
                item.task.schedule.activityType,
                item.task.schedule.title,
              )}{" "}
              · {formatDate(item.date)}
            </Text>
            <Text style={s.muted}>
              {tr("messages.projectedDatesWillBeRecalculatedAfterCareIs")}
            </Text>
          </Card>
        ),
      )}
      <SectionHeading title={tr("status.upcoming")} />
      {getTasks(app.data.tanks, app.data.schedules, app.data.logs, today)
        .filter(
          (task) =>
            task.due > date &&
            (!tank || task.tank.id === tank) &&
            (!type || task.schedule.activityType === type),
        )
        .slice(0, 3)
        .map((task) => (
          <TaskCard
            key={`upcoming-${task.schedule.id}`}
            task={task}
            compact
            dateBadge
          />
        ))}
    </Screen>
  );
}
