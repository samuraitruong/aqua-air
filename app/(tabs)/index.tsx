import { quantityLabel } from "../../src/i18n";
import { getLocale } from "../../src/i18n";
import { t as tr } from "../../src/i18n";
import { SvgXml } from "react-native-svg";
import { welcomeArt } from "../../src/ui/welcome-art";
import React, { useState } from "react";
import { View, Image, Linking } from "react-native";
import { Text } from "../../src/ui/text";
import { useRouter } from "expo-router";
import { useApp } from "../../src/state/AppProvider";
import {
  Screen,
  Button,
  Card,
  Empty,
  TaskCard,
  TankCard,
  Banner,
  Icon,
  LinkRow,
  SectionHeading,
  IconButton,
} from "../../src/ui/components";
import { s, c } from "../../src/ui/theme";
import { dashboard } from "../../src/domain/selectors";
import { localDate } from "../../src/domain/dates";
import { MonthlyWaterCard } from "../../src/ui/water-usage";
export default function Dashboard() {
  const app = useApp(),
    router = useRouter();
  const d = dashboard(app.data, localDate());
  const [all, setAll] = useState(false),
    [dismiss, setDismiss] = useState(false);
  if (!app.data.tanks.length)
    return (
      <Screen title="Aqua Air" back={false} header={false}>
        <View style={{ alignItems: "center", paddingTop: 15 }}>
          <View style={[s.row, { justifyContent: "center" }]}>
            <Icon size={35} />
            <Text style={[s.title, { fontSize: 34, lineHeight: 43 }]}>
              Aqua Air
            </Text>
          </View>
          <View
            style={{
              width: "100%",
              height: 240,
              borderRadius: 23,
              overflow: "hidden",
              marginVertical: 24,
            }}
          >
            <SvgXml
              xml={welcomeArt}
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid slice"
            />
          </View>
          <Text
            style={[
              s.title,
              {
                textAlign: "center",
                fontSize: 29,
                lineHeight: 37,
                marginTop: 0,
                marginBottom: 14,
              },
            ]}
          >
            {tr("messages.makeTankCareEasier")}
            {`\n`}
            {tr("messages.everyDay")}
          </Text>
          <Text
            style={[
              s.body,
              { textAlign: "center", color: c.muted, marginBottom: 12 },
            ]}
          >
            {tr("messages.keepCareHistoryAndRemindersRightOnYour")}
          </Text>
        </View>
        <Button
          title={tr("messages.addYourFirstTank")}
          onPress={() => router.push("/tank/edit")}
        />
        <Button
          title={tr("messages.restoreBackup")}
          variant="secondary"
          onPress={() => router.push("/backup")}
        />
        <Text style={[s.tiny, { textAlign: "center", marginTop: 12 }]}>
          {tr("messages.noAccountNeededDataStaysOnYourDevice")}
        </Text>
      </Screen>
    );
  return (
    <Screen
      title="Aqua Air"
      back={false}
      right={
        <IconButton
          name="bell"
          label={tr("messages.reminderSettings")}
          onPress={() => router.push("/settings")}
        />
      }
    >
      <Text style={s.muted}>
        {new Intl.DateTimeFormat(getLocale(), {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(new Date())}
      </Text>
      <Text
        style={[s.title, { marginTop: -7, marginBottom: 8, lineHeight: 34 }]}
      >
        {tr("messages.aFreshStartToday")}
      </Text>
      <View style={s.row}>
        {(
          [
            [d.tanks.length, "counts.tanks", "grid"],
            [d.need.length, "counts.tasks", "calendar"],
          ] as const
        ).map(([n, label, icon]) => (
          <View key={String(label)} style={s.grow}>
            <Card style={[s.row, { padding: 15 }]}>
              <Icon name={icon} size={26} />
              <View style={s.grow}>
                <Text style={[s.title, { fontSize: 25, lineHeight: 28 }]}>
                  {n}
                </Text>
                <Text style={s.tiny}>{quantityLabel(label, Number(n))}</Text>
              </View>
            </Card>
          </View>
        ))}
      </View>
      <MonthlyWaterCard />
      {app.data.settings.notificationError && !dismiss && (
        <Card aqua>
          <Banner
            text={tr(app.data.settings.notificationError)}
            action={tr("messages.openPhoneSettings")}
            onPress={() => void Linking.openSettings()}
          />
          <Button
            title={tr("common.maybeLater")}
            variant="ghost"
            onPress={() => setDismiss(true)}
          />
        </Card>
      )}
      {app.data.settings.budgetExceeded && (
        <Banner
          text={tr("messages.someRemindersHaveNotBeenScheduledOpenThe")}
        />
      )}
      <SectionHeading
        title={tr("messages.needsCare")}
        action={tr("messages.viewCalendar")}
        onPress={() => router.push("/calendar")}
      />
      {d.need.length ? (
        (all ? d.need : d.need.slice(0, 3)).map((t) => (
          <TaskCard key={t.schedule.id} task={t} />
        ))
      ) : (
        <Empty
          title={tr("messages.allCaughtUpToday")}
          description={tr("messages.noTasksAreOverdueOrDueToday")}
          icon="check-circle"
        />
      )}
      {d.need.length > 3 && !all && (
        <Button
          title={tr("dashboard.viewAllTasks", {
            0: d.need.length,
          })}
          variant="secondary"
          onPress={() => setAll(true)}
        />
      )}
      <SectionHeading
        title={tr("status.upcoming")}
        action={tr("common.viewAll")}
        onPress={() => router.push("/calendar")}
      />
      {d.upcoming.slice(0, 2).map((t) => (
        <TaskCard key={t.schedule.id} task={t} compact />
      ))}
      {!d.upcoming.length && (
        <Text style={s.muted}>{tr("messages.noTasksDueInTheNext7Days")}</Text>
      )}
      {!d.tasks.length && d.tanks[0] && (
        <Button
          title={tr("messages.createCareSchedule")}
          onPress={() =>
            router.push({
              pathname: "/schedule/edit",
              params: {
                tankId: d.tanks[0]!.id,
              },
            })
          }
        />
      )}
      <SectionHeading
        title={tr("messages.yourTanks")}
        action={tr("common.viewAll")}
        onPress={() => router.push("/tanks")}
      />
      {d.tanks.slice(0, 2).map((t) => (
        <TankCard key={t.id} tank={t} />
      ))}
      {!d.tanks.length && (
        <Empty
          title={tr("messages.allTanksAreArchived")}
          action={tr("tank.addTitle")}
          onPress={() => router.push("/tank/edit")}
        />
      )}
    </Screen>
  );
}
