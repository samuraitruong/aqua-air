import { LocaleDirContext } from "@react-navigation/native";
import { getDirection } from "../src/i18n";
import { t as tr } from "../src/i18n";
import React, { useEffect, useRef, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { AppProvider, useApp } from "../src/state/AppProvider";
import { Loading, Button } from "../src/ui/components";
import { View, AccessibilityInfo } from "react-native";
import { Text } from "../src/ui/text";
import { s, c } from "../src/ui/theme";
function Navigation() {
  const app = useApp();
  const router = useRouter();
  const direction = getDirection(app.data.settings.language);
  const handled = useRef<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (app.loading || !app.store) return;
    const handle = (r: Notifications.NotificationResponse | null) => {
      if (!r || handled.current === r.notification.request.identifier) return;
      handled.current = r.notification.request.identifier;
      const p = r.notification.request.content.data ?? {};
      const tank = app.data.tanks.find((t) => t.id === p.tankId),
        schedule = app.data.schedules.find((s) => s.id === p.scheduleId);
      if (
        tank &&
        !tank.archivedAt &&
        schedule?.enabled &&
        schedule.revision === p.scheduleRevision
      )
        router.push({
          pathname: "/care/edit",
          params: {
            tankId: tank.id,
            scheduleId: schedule.id,
          },
        });
      else {
        app.notify(tr("messages.thisReminderIsNoLongerAvailable"));
        if (tank)
          router.push({
            pathname: "/tank/[id]",
            params: {
              id: tank.id,
            },
          });
        else router.replace("/");
      }
    };
    void Notifications.getLastNotificationResponseAsync()
      .then(handle)
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [app.loading, app.store, app.data]);
  if (app.loading) return <Loading />;
  if (!app.store)
    return (
      <View
        style={[
          s.screen,
          {
            padding: 24,
            justifyContent: "center",
            gap: 16,
          },
        ]}
      >
        <Text style={s.heading}>{tr("messages.couldNotOpenYourData")}</Text>
        <Text style={s.body}>{app.error}</Text>
        <Button title={tr("common.tryAgain")} onPress={app.retry} />
      </View>
    );
  return (
    <LocaleDirContext.Provider value={direction}>
      <View style={{ flex: 1, direction }}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            headerBackButtonMenuEnabled: false,
            contentStyle: {
              backgroundColor: c.background,
              direction,
            },
            animation: reduceMotion ? "none" : "default",
          }}
        />
      </View>
    </LocaleDirContext.Provider>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Navigation />
      </AppProvider>
    </SafeAreaProvider>
  );
}
