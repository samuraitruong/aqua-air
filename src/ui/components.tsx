import { getDirection } from "../i18n";
import { activityTitle } from "../i18n";
import { getLocale } from "../i18n";
import { t as tr } from "../i18n";
import { usePreventRemove } from "@react-navigation/native";
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
  type StyleProp,
  Modal,
} from "react-native";
import { Text, TextInput } from "./text";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { SvgXml } from "react-native-svg";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation, useRouter } from "expo-router";
import { useApp } from "../state/AppProvider";
import { c, s } from "./theme";
import type { Tank, Task, Photo } from "../domain/models";
import {
  formatDate,
  localDate,
  localTime,
  differenceDays,
  atLocalTime,
} from "../domain/dates";
import { photoUri } from "../services/media";
import { lastWaterChange } from "../domain/selectors";
import { getTasks } from "../domain/scheduling";
import { shortDate } from "./date-labels";
import { copy } from "../i18n";
export { Icon } from "./icons";
import { Icon } from "./icons";
export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  icon,
  accessibilityLabel,
  compact = false,
}: {
  title: string;
  compact?: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Feather>["name"];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{
        disabled,
      }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: variant === "ghost" || compact ? 48 : 51,
        borderRadius: 14,
        paddingVertical: variant === "ghost" ? 8 : 12,
        paddingHorizontal: variant === "ghost" ? 0 : 16,
        borderWidth: variant === "secondary" ? 1 : 0,
        borderColor: c.primary,
        backgroundColor:
          variant === "primary"
            ? pressed
              ? c.pressed
              : c.primary
            : variant === "danger"
              ? c.overdueBg
              : "transparent",
        opacity: disabled ? 0.5 : 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      })}
    >
      {icon && (
        <Icon name={icon} color={variant === "primary" ? "white" : c.primary} />
      )}
      <Text
        style={{
          fontSize: variant === "ghost" ? 12 : compact ? 13 : 15,
          fontWeight: variant === "ghost" ? "400" : "600",
          color:
            variant === "primary"
              ? "white"
              : variant === "danger"
                ? c.overdue
                : c.primary,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function IconButton({
  name,
  onPress,
  label,
  filled = false,
}: {
  filled?: boolean;
  name: React.ComponentProps<typeof Feather>["name"];
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: filled ? c.primary : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={name} color={filled ? c.white : c.text} />
    </Pressable>
  );
}
export function Header({
  title,
  back = true,
  right,
}: {
  title: string;
  back?: boolean;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <View
      style={[
        s.between,
        {
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: 12,
          gap: 10,
        },
      ]}
    >
      {back && (
        <IconButton
          name="chevron-left"
          label={tr("common.back")}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
        />
      )}
      <Text
        accessibilityRole="header"
        style={[
          back ? s.heading : s.pageTitle,
          s.grow,
          back && { textAlign: "center" },
        ]}
      >
        {title}
      </Text>
      {right ?? (back ? <View style={{ width: 44 }} /> : null)}
    </View>
  );
}
export function Screen({
  title,
  children,
  footer,
  right,
  back = true,
  scroll = true,
  header = true,
}: {
  title: string;
  header?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  right?: React.ReactNode;
  back?: boolean;
  scroll?: boolean;
}) {
  const { error, clearError, toast } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView
      style={[s.screen, { direction: getDirection() }]}
      edges={["top", "left", "right"]}
    >
      <SvgXml
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        width="100%"
        height={400}
        xml={`<svg xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="glow" cx="95%" cy="0%" r="95%"><stop offset="0" stop-color="${c.glow}" stop-opacity=".36"/><stop offset="1" stop-color="${c.glow}" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#glow)"/></svg>`}
      />
      {header && <Header title={title} back={back} right={right} />}
      <KeyboardAvoidingView
        style={{
          flex: 1,
        }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {error && (
          <View
            style={{
              paddingHorizontal: 20,
            }}
          >
            <Banner
              text={error}
              action={tr("common.close")}
              onPress={clearError}
              danger
            />
          </View>
        )}
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.content}
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
        {footer && (
          <View
            style={[
              s.footer,
              {
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            {footer}
          </View>
        )}
      </KeyboardAvoidingView>
      {toast && (
        <View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={{
            position: "absolute",
            bottom: footer ? 100 : 24,
            left: 20,
            right: 20,
            padding: 16,
            borderRadius: 16,
            backgroundColor: c.text,
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 14,
              lineHeight: 21,
            }}
          >
            {toast}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
export function Card({
  children,
  aqua = false,
  style,
}: {
  children: React.ReactNode;
  aqua?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.card, aqua && s.aqua, style]}>{children}</View>;
}
export function Banner({
  text,
  action,
  onPress,
  danger = false,
}: {
  text: string;
  action?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        s.row,
        {
          backgroundColor: danger ? c.overdueBg : c.aqua,
          borderRadius: 15,
          padding: 14,
          alignItems: "center",
        },
      ]}
    >
      <Icon
        name={danger ? "alert-circle" : "info"}
        size={18}
        color={danger ? c.overdue : c.primary}
      />
      <Text
        style={[
          s.muted,
          s.grow,
          { fontSize: 12, lineHeight: 18 },
          danger && s.danger,
        ]}
      >
        {text}
      </Text>
      {action && onPress && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action}
          onPress={onPress}
          style={{
            minWidth: 44,
            minHeight: 44,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 12, color: danger ? c.overdue : c.primary }}>
            {action}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export function Empty({
  title,
  description,
  action,
  onPress,
  icon = "droplet",
}: {
  title: string;
  description?: string;
  action?: string;
  onPress?: () => void;
  icon?: React.ComponentProps<typeof Feather>["name"];
}) {
  return (
    <View style={s.empty}>
      <Icon name={icon} size={28} color={c.iconMuted} />
      <Text
        style={[
          s.muted,
          {
            textAlign: "center",
          },
        ]}
      >
        {title}
      </Text>
      {description && (
        <Text
          style={[
            s.muted,
            {
              textAlign: "center",
            },
          ]}
        >
          {description}
        </Text>
      )}
      {action && onPress && <Button title={action} onPress={onPress} />}
    </View>
  );
}
export function Field({
  label,
  hint,
  ...props
}: TextInputProps & {
  label: string;
  hint?: string;
}) {
  return (
    <View
      style={{
        gap: 7,
      }}
    >
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.placeholder}
        {...props}
        style={[
          s.input,
          props.multiline && {
            minHeight: 87,
            textAlignVertical: "top",
          },
          props.style,
        ]}
      />
      {hint && <Text style={s.tiny}>{hint}</Text>}
    </View>
  );
}
export function Choices<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
}) {
  return (
    <View
      style={{
        gap: 8,
      }}
    >
      {label && <Text style={s.label}>{label}</Text>}
      <View style={s.wrap}>
        {options.map(([key, text]) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{
              selected: value === key,
            }}
            onPress={() => onChange(key)}
            style={{
              minHeight: 44,
              paddingVertical: 9,
              paddingHorizontal: 13,
              borderRadius: 24,
              backgroundColor: value === key ? c.primary : c.chip,
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: value === key ? "white" : c.text,
                fontWeight: "500",
              }}
            >
              {text}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function SwitchRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={s.between}>
      <View style={s.grow}>
        <Text style={s.label}>{label}</Text>
        {hint && <Text style={s.tiny}>{hint}</Text>}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{
          true: c.primary,
          false: "#BBCDD3",
        }}
      />
    </View>
  );
}
export function DateField({
  label,
  value,
  onChange,
  mode = "date",
  maximumDate,
  prominent = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mode?: "date" | "time";
  maximumDate?: Date;
  prominent?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View
      style={{
        gap: 7,
      }}
    >
      <Text style={s.label}>{label}</Text>
      {Platform.OS === "web" ? (
        <TextInput
          accessibilityLabel={label}
          style={s.input}
          value={value}
          onChangeText={onChange}
          placeholder={mode === "date" ? "YYYY-MM-DD" : "HH:mm"}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${placeholder ?? (mode === "date" ? formatDate(value) : value)}`}
          onPress={() => setOpen(true)}
          style={[s.input, s.between]}
        >
          <Text
            style={[
              s.body,
              prominent && { fontSize: 28, lineHeight: 36, fontWeight: "700" },
            ]}
          >
            {placeholder ?? (mode === "date" ? formatDate(value) : value)}
          </Text>
          <Icon name={mode === "date" ? "calendar" : "clock"} />
        </Pressable>
      )}
      {open && (
        <>
          <DateTimePicker
            value={
              mode === "date"
                ? new Date(value + "T12:00:00")
                : atLocalTime(localDate(), value)
            }
            mode={mode}
            maximumDate={maximumDate}
            locale={getLocale()}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, date) => {
              if (Platform.OS === "android") setOpen(false);
              if (event.type !== "dismissed" && date)
                onChange(mode === "date" ? localDate(date) : localTime(date));
            }}
          />
          {Platform.OS === "ios" && (
            <Button
              title={tr("common.done")}
              variant="ghost"
              onPress={() => setOpen(false)}
            />
          )}
        </>
      )}
    </View>
  );
}
export function Pill({
  label,
  kind = "normal",
}: {
  label: string;
  kind?: string;
}) {
  const colors =
    kind === "overdue"
      ? [c.overdue, c.overdueBg]
      : kind === "upcoming" || kind === "projected"
        ? [c.blue, c.blueBg]
        : kind === "success"
          ? [c.green, c.greenBg]
          : [c.primary, c.aqua];
  return (
    <View
      style={[
        s.pill,
        {
          backgroundColor: colors[1],
        },
      ]}
    >
      <Text
        style={[
          s.pillText,
          {
            color: colors[0],
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}
export function TankPhoto({
  photo,
  large = false,
  height = 177,
}: {
  photo?: Photo;
  large?: boolean;
  height?: number;
}) {
  const uri = photoUri(photo);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return uri && !failed ? (
    <Image
      source={{
        uri,
      }}
      resizeMode="cover"
      accessibilityLabel={tr("messages.tankPhoto")}
      onError={() => setFailed(true)}
      style={
        large
          ? {
              width: "100%",
              height,
              borderRadius: 0,
            }
          : {
              width: 65,
              height: 65,
              borderRadius: 13,
            }
      }
    />
  ) : (
    <View
      style={[
        large
          ? {
              width: "100%" as const,
              height,
              borderRadius: 0,
            }
          : {
              width: 65,
              height: 65,
              borderRadius: 13,
            },
        {
          backgroundColor: c.aqua,
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      <Icon name="droplet" size={large ? 48 : 26} />
      {large && (
        <Text
          style={[
            s.muted,
            {
              marginTop: 8,
            },
          ]}
        >
          {tr("messages.addAPhotoOfYourTank")}
        </Text>
      )}
    </View>
  );
}
export function TankCard({ tank }: { tank: Tank }) {
  const { data } = useApp();
  const router = useRouter();
  const last = lastWaterChange(data, tank.id),
    task = getTasks(data.tanks, data.schedules, data.logs, localDate()).find(
      (t) => t.tank.id === tank.id,
    );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tr("messages.openCount", {
        0: tank.name,
      })}
      onPress={() =>
        router.push({
          pathname: "/tank/[id]",
          params: {
            id: tank.id,
          },
        })
      }
      style={[
        s.card,
        {
          padding: 0,
          overflow: "hidden",
        },
      ]}
    >
      <TankPhoto
        photo={data.photos.find((p) => p.id === tank.coverPhotoId)}
        large
      />
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 17,
          gap: 3,
        }}
      >
        <Text style={[s.heading, { fontSize: 19 }]}>{tank.name}</Text>
        <Text style={s.muted}>
          {tank.volumeLitres
            ? `${tank.volumeLitres.toLocaleString(getLocale())} L · `
            : ""}
          {copy.water[tank.waterType]}
          {tank.groupName ? ` · ${tank.groupName}` : ""}
        </Text>
        <View style={[s.between, { marginTop: 9, gap: 6, flexWrap: "wrap" }]}>
          <Text style={[s.tiny, { flexShrink: 1 }]}>
            {last
              ? tr("tank.daysSinceWaterChange", {
                  0: differenceDays(localDate(), last.performedLocalDate),
                })
              : tr("messages.noWaterChangesRecorded")}
          </Text>
          <Pill
            label={task ? task.status.label : tr("messages.noActiveSchedule")}
            kind={task?.status.kind}
          />
        </View>
      </View>
    </Pressable>
  );
}
export function TaskCard({
  task,
  compact = false,
  dateBadge = false,
}: {
  task: Task;
  compact?: boolean;
  dateBadge?: boolean;
}) {
  const { data, care, run } = useApp();
  const router = useRouter();
  const snooze = () =>
    Alert.alert(
      tr("messages.remindMeLater"),
      tr("messages.snoozingDoesNotChangeTheDueDateOr"),
      [
        {
          text: tr("messages.in1Hour"),
          onPress: () =>
            void run(
              () =>
                care!.snooze(
                  task.schedule.id,
                  new Date(Date.now() + 3600000).toISOString(),
                ),
              tr("messages.reminderSnoozed"),
            ),
        },
        {
          text: tr("messages.tomorrow"),
          onPress: () => {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            const time =
              data.reminders.find((r) => r.scheduleId === task.schedule.id)
                ?.localTime ?? data.settings.defaultTime;
            void run(
              () =>
                care!.snooze(
                  task.schedule.id,
                  atLocalTime(localDate(d), time).toISOString(),
                ),
              tr("messages.reminderSnoozed"),
            );
          },
        },
        {
          text: tr("messages.chooseATime"),
          onPress: () =>
            router.push({
              pathname: "/schedule/reminders",
              params: {
                id: task.schedule.id,
                snooze: "1",
              },
            }),
        },
      ],
      {
        cancelable: true,
      },
    );
  if (compact)
    return (
      <Card style={s.row}>
        <Icon name="calendar" />
        <View style={s.grow}>
          <Text style={[s.label, { fontSize: 14 }]}>{task.tank.name}</Text>
          <Text style={s.muted}>
            {activityTitle(task.schedule.activityType, task.schedule.title)}
            {!dateBadge && ` · ${shortDate(task.due)}`}
          </Text>
        </View>
        <Pill
          label={dateBadge ? shortDate(task.due) : task.status.label}
          kind={task.status.kind}
        />
      </Card>
    );
  return (
    <Card>
      <View style={s.row}>
        <TankPhoto
          photo={data.photos.find((p) => p.id === task.tank.coverPhotoId)}
        />
        <View
          style={[
            s.grow,
            {
              gap: 4,
            },
          ]}
        >
          <Text style={[s.label, { fontSize: 15 }]}>{task.tank.name}</Text>
          <Text style={s.muted}>
            {activityTitle(task.schedule.activityType, task.schedule.title)}
            {task.schedule.targetPercent
              ? ` · ${task.schedule.targetPercent}%`
              : ""}
          </Text>
          <Pill label={task.status.label} kind={task.status.kind} />
        </View>
        {!compact && (
          <IconButton
            name="clock"
            label={tr("messages.snoozeCountForCount", {
              0: activityTitle(task.schedule.activityType, task.schedule.title),
              1: task.tank.name,
            })}
            onPress={snooze}
          />
        )}
      </View>
      {!compact && (
        <Button
          compact
          title={tr("messages.logCare")}
          accessibilityLabel={tr("messages.logCountForCount", {
            0: activityTitle(task.schedule.activityType, task.schedule.title),
            1: task.tank.name,
          })}
          onPress={() =>
            router.push({
              pathname: "/care/edit",
              params: {
                tankId: task.tank.id,
                scheduleId: task.schedule.id,
              },
            })
          }
        />
      )}
    </Card>
  );
}
export function LinkRow({
  title,
  subtitle,
  icon = "chevron-right",
  onPress,
  danger = false,
  trailing,
}: {
  trailing?: string;
  title: string;
  subtitle?: string;
  icon?: React.ComponentProps<typeof Feather>["name"];
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, trailing]
        .filter(Boolean)
        .join(", ")}
      onPress={onPress}
      style={[
        s.row,
        {
          minHeight: 54,
          paddingVertical: 16,
        },
      ]}
    >
      <Icon name={icon} color={danger ? c.overdue : c.primary} />
      <View style={s.grow}>
        <Text style={[s.body, { fontSize: 14 }, danger && s.danger]}>
          {title}
        </Text>
        {subtitle && <Text style={s.tiny}>{subtitle}</Text>}
      </View>
      {trailing && <Text style={s.muted}>{trailing}</Text>}
      <Icon name="chevron-right" size={16} color={c.text} />
    </Pressable>
  );
}
export function useFormGuard(dirty: boolean) {
  const nav = useNavigation();
  const [allowed, setAllowed] = useState(false);
  const flag = useRef(false);
  const allow = useMemo(
    () => ({
      get current() {
        return flag.current;
      },
      set current(value: boolean) {
        flag.current = value;
        setAllowed(value);
      },
    }),
    [],
  );
  usePreventRemove(dirty && !allowed, ({ data }) => {
    if (flag.current) {
      setTimeout(() => nav.dispatch(data.action), 0);
      return;
    }
    Alert.alert(
      tr("common.discardChangesTitle"),
      tr("common.unsavedChangesWarning"),
      [
        {
          text: tr("common.stay"),
          style: "cancel",
        },
        {
          text: tr("common.discardChanges"),
          style: "destructive",
          onPress: () => {
            allow.current = true;
            setTimeout(() => nav.dispatch(data.action), 0);
          },
        },
      ],
    );
  });
  return allow;
}
export function Loading() {
  return (
    <SafeAreaView
      style={[
        s.screen,
        {
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        },
      ]}
    >
      <ActivityIndicator color={c.primary} />
      <Text style={s.muted}>{copy.loading}</Text>
    </SafeAreaView>
  );
}

export {
  SelectField,
  UnderlineTabs,
  SectionHeading,
  CenterIcon,
} from "./visual-controls";
