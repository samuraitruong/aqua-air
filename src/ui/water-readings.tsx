import { useApp } from "../state/AppProvider";
import { matchingTarget, targetStatus, isStale } from "../domain/tank-insights";
import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useWaterReadings } from "../state/useWaterReadings";
import type { LatestWaterValue, WaterValue } from "../domain/models";
import { waterParameterLabel, waterMetrics } from "../domain/water-readings";
import { getLocale, t } from "../i18n";
import { formatDate } from "../domain/dates";
import {
  Card,
  Button,
  SectionHeading,
  Empty,
  Banner,
  Icon,
} from "./components";
import { Text } from "./text";
import { c, s } from "./theme";
export const readingDate = (date: string) =>
  formatDate(date, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export const readingNumber = (value: number) =>
  new Intl.NumberFormat(getLocale(), { maximumSignificantDigits: 10 }).format(
    value,
  );
function ordered<T extends WaterValue>(values: T[]) {
  return [...values].sort((a, b) => {
    const order = (key: string) => {
      const i = waterMetrics.findIndex((m) => m.key === key);
      return i < 0 ? 100 : i;
    };
    return (
      order(a.parameterKey) - order(b.parameterKey) ||
      waterParameterLabel(a.parameterKey, a.nameSnapshot).localeCompare(
        waterParameterLabel(b.parameterKey, b.nameSnapshot),
        getLocale(),
      )
    );
  });
}
function LatestStatus({
  tankId,
  value,
}: {
  tankId: string;
  value: LatestWaterValue;
}) {
  const app = useApp();
  const status = targetStatus(
    value.value,
    matchingTarget(app.data, tankId, value.parameterKey, value.unitSnapshot),
  );
  const days =
    app.data.tankPreferences.find((p) => p.tankId === tankId)?.staleDays ?? 7;
  return (
    <>
      {status && (
        <Text
          style={[s.tiny, { color: status === "within" ? c.green : c.overdue }]}
        >
          {status === "within" ? "✓ " : status === "below" ? "↓ " : "↑ "}
          {t(`insights.${status}`)}
        </Text>
      )}
      {isStale(value.performedAt, days, new Date(app.clockTick)) && (
        <Text style={s.tiny}>{t("insights.stale")}</Text>
      )}
    </>
  );
}
export function TankWaterSummary({
  tankId,
  values,
  onPress,
}: {
  tankId: string;
  values: LatestWaterValue[];
  onPress: () => void;
}) {
  if (!values.length) return null;
  return (
    <Card aqua>
      <SectionHeading
        title={t("readings.latest")}
        action={t("common.viewAll")}
        onPress={onPress}
      />
      <View style={[s.row, { alignItems: "flex-start", flexWrap: "wrap" }]}>
        {ordered(values)
          .slice(0, 3)
          .map((v) => (
            <View
              key={v.parameterKey}
              style={{ flexGrow: 1, flexBasis: 85, gap: 3 }}
            >
              <Text style={s.tiny}>
                {waterParameterLabel(v.parameterKey, v.nameSnapshot)}
              </Text>
              <Text style={s.heading}>
                {readingNumber(v.value)}{" "}
                <Text style={s.tiny}>{v.unitSnapshot}</Text>
              </Text>
              <Text style={s.tiny}>{readingDate(v.performedAt)}</Text>
              <LatestStatus tankId={tankId} value={v} />
            </View>
          ))}
      </View>
    </Card>
  );
}
export function WaterReadingsPanel({
  tankId,
  archived,
  page,
}: {
  tankId: string;
  archived: boolean;
  page: ReturnType<typeof useWaterReadings>;
}) {
  const router = useRouter(),
    open = (id?: string) =>
      router.push({
        pathname: "/water/edit",
        params: { tankId, ...(id ? { id } : {}) },
      });
  return (
    <View style={{ gap: 16, paddingTop: 12 }}>
      {!archived && (
        <Button title={t("readings.log")} icon="plus" onPress={() => open()} />
      )}
      {page.error ? (
        <>
          <Banner text={t("readings.error")} />
          <Button
            title={t("common.tryAgain")}
            onPress={page.retry}
            variant="secondary"
          />
        </>
      ) : !page.result ? (
        <Text style={s.muted}>{t("readings.loading")}</Text>
      ) : (
        <>
          <SectionHeading title={t("readings.latest")} />
          {!page.result.latest.length ? (
            <Empty title={t("readings.none")} icon="activity" />
          ) : (
            <View style={[s.row, { flexWrap: "wrap", alignItems: "stretch" }]}>
              {ordered(page.result.latest).map((v) => (
                <View
                  key={v.parameterKey}
                  style={{ flexBasis: "45%", flexGrow: 1, minWidth: 120 }}
                >
                  <Card style={{ flex: 1, gap: 6 }}>
                    <Text style={s.label}>
                      {waterParameterLabel(v.parameterKey, v.nameSnapshot)}
                    </Text>
                    <Text style={[s.heading, { fontSize: 23, lineHeight: 30 }]}>
                      {readingNumber(v.value)}{" "}
                      <Text style={s.muted}>{v.unitSnapshot}</Text>
                    </Text>
                    <Text style={s.tiny}>{readingDate(v.performedAt)}</Text>
                    <LatestStatus tankId={tankId} value={v} />
                  </Card>
                </View>
              ))}
            </View>
          )}
          <SectionHeading title={t("readings.history")} />
          {page.result.history.map((r) => (
            <Card key={r.id}>
              <View style={s.row}>
                <Icon name="activity" size={20} />
                <Text style={[s.label, s.grow]}>
                  {readingDate(r.performedAt)}
                </Text>
              </View>
              <View style={{ gap: 7 }}>
                {ordered(r.values).map((v) => (
                  <View
                    key={v.id}
                    style={[s.row, { alignItems: "flex-start" }]}
                  >
                    <Text style={[s.body, s.grow]}>
                      {waterParameterLabel(v.parameterKey, v.nameSnapshot)}
                    </Text>
                    <Text
                      style={[s.label, { flexShrink: 1, color: c.primary }]}
                    >
                      {readingNumber(v.value)} {v.unitSnapshot}
                    </Text>
                  </View>
                ))}
              </View>
              {!!r.notes && <Text style={s.muted}>{r.notes}</Text>}
              {!archived && (
                <Button
                  title={t("readings.edit")}
                  variant="ghost"
                  onPress={() => open(r.id)}
                />
              )}
            </Card>
          ))}
          {(page.hasPrevious || page.result.more) && (
            <View style={s.row}>
              <View style={s.grow}>
                <Button
                  title={t("readings.newer")}
                  variant="secondary"
                  disabled={!page.hasPrevious}
                  onPress={page.newer}
                />
              </View>
              <View style={s.grow}>
                <Button
                  title={t("readings.older")}
                  variant="secondary"
                  disabled={!page.result.more}
                  onPress={page.older}
                />
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}
