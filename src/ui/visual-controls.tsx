import React, { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "./text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "./icons";
import { c, s } from "./theme";
import { getDirection, t } from "../i18n";

/** Native equivalent of the reference's single-line select fields. */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const current = options.find(([key]) => key === value)?.[1] ?? value;
  return (
    <View style={{ gap: 7 }}>
      <Text style={s.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={[s.input, s.between]}
      >
        <Text style={[s.body, s.grow]}>{current}</Text>
        <Icon name="chevron-down" size={16} color={c.text} />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            direction: getDirection(),
            justifyContent: "flex-end",
            backgroundColor: c.scrim,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
            onPress={() => setOpen(false)}
            style={{ flex: 1 }}
          />
          <View
            accessibilityViewIsModal
            style={{
              backgroundColor: c.background,
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              padding: 20,
              paddingBottom: Math.max(insets.bottom, 20),
              maxHeight: "75%",
              gap: 12,
            }}
          >
            <Text accessibilityRole="header" style={s.heading}>
              {label}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {options.map(([key, text]) => (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: key === value }}
                  onPress={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  style={[
                    s.row,
                    {
                      minHeight: 52,
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: c.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.body,
                      s.grow,
                      key === value && { color: c.primary, fontWeight: "600" },
                    ]}
                  >
                    {text}
                  </Text>
                  {key === value && <Icon name="check" size={18} />}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              onPress={() => setOpen(false)}
              style={[
                s.input,
                { borderColor: c.primary, alignItems: "center" },
              ]}
            >
              <Text style={[s.label, { color: c.primary }]}>
                {t("common.close")}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
export function UnderlineTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
}) {
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: c.border,
        marginTop: 2,
      }}
    >
      {options.map(([key, label]) => (
        <Pressable
          key={key}
          accessibilityRole="tab"
          accessibilityState={{ selected: key === value }}
          onPress={() => onChange(key)}
          style={{
            flex: 1,
            minHeight: 44,
            paddingVertical: 12,
            paddingHorizontal: 4,
            justifyContent: "center",
            borderBottomWidth: 2,
            borderBottomColor: key === value ? c.primary : "transparent",
          }}
        >
          <Text
            style={{
              fontSize: 12,
              lineHeight: 18,
              textAlign: "center",
              color: key === value ? c.primary : c.muted,
              fontWeight: key === value ? "600" : "400",
            }}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function SectionHeading({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={[s.between, { marginTop: 6, marginBottom: -6 }]}>
      <Text accessibilityRole="header" style={[s.heading, s.grow]}>
        {title}
      </Text>
      {action && onPress && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          hitSlop={8}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={{ color: c.primary, fontSize: 12 }}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}
export function CenterIcon({
  name,
  large = false,
}: {
  name: IconName;
  large?: boolean;
}) {
  return (
    <View style={[s.centerIcon, large && { width: 93, height: 93 }]}>
      <Icon name={name} size={large ? 52 : 32} />
    </View>
  );
}
