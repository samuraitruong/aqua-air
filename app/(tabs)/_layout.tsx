import { t as tr } from "../../src/i18n";
import React from "react";
import { useApp } from "../../src/state/AppProvider";
import { Tabs } from "expo-router";
import { Icon } from "../../src/ui/icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { c } from "../../src/ui/theme";
import { copy } from "../../src/i18n";
export default function TabLayout() {
  const { data } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.navMuted,
        tabBarStyle: {
          backgroundColor: "white",
          borderTopColor: c.cardBorder,
          height: 59 + Math.max(insets.bottom, 12),
          paddingTop: 9,
          paddingBottom: Math.max(insets.bottom, 12),
          display: data.tanks.length ? "flex" : "none",
        },
        tabBarLabelStyle: {
          fontSize: 10,
          marginTop: 5,
        },
        tabBarItemStyle: {
          minHeight: 42,
        },
      }}
    >
      {(["index", "tanks", "calendar", "settings"] as const).map((name, i) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: copy.tabs[name],
            tabBarIcon: ({ color, size }) => (
              <Icon
                name={(["home", "grid", "calendar", "settings"] as const)[i]}
                size={22}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
