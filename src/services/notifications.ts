import { UserFacingError } from "../domain/error";
import { buildNotificationContent } from "./notification-content";
import { t as tr } from "../i18n";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { NotificationAdapter } from "./notification-worker";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
export async function notificationPermission() {
  if (Platform.OS === "web") return false;
  const p = await Notifications.getPermissionsAsync();
  return (
    p.granted ||
    p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}
export async function requestNotificationPermission() {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("care", {
      name: tr("messages.tankCare"),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return true;
  if (!p.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}
export const nativeNotifications: NotificationAdapter = {
  permission: notificationPermission,
  list: async () => {
    if (Platform.OS === "web") return [];
    return (await Notifications.getAllScheduledNotificationsAsync()).map(
      (n) => ({
        id: n.identifier,
        logicalKey: String(n.content.data?.logicalKey ?? ""),
        fireAt: String(n.content.data?.fireAt ?? ""),
        language: String(n.content.data?.language ?? "vi"),
      }),
    );
  },
  cancel: async (id) => {
    if (Platform.OS !== "web")
      await Notifications.cancelScheduledNotificationAsync(id);
  },
  schedule: async (job, data) => {
    const s = data.schedules.find((s) => s.id === job.scheduleId)!;
    const t = data.tanks.find((t) => t.id === s.tankId)!;
    return Notifications.scheduleNotificationAsync({
      content: {
        ...buildNotificationContent(job, data),
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(job.fireAt),
        channelId: "care",
      },
    });
  },
};
export async function sendTestReminder(title: string, body: string) {
  if (!(await notificationPermission()))
    throw new UserFacingError(
      "messages.allowNotificationsBeforeSendingATestReminder",
    );
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
    },
    trigger: null,
  });
}
