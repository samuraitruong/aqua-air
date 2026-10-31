import React, { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useApp } from "../../src/state/AppProvider";
import { useInsightRange } from "../../src/state/useTankInsights";
import {
  chartRange,
  targetStatus,
  matchingTarget,
  isStale,
} from "../../src/domain/tank-insights";
import { waterParameterLabel } from "../../src/domain/water-readings";
import {
  Screen,
  Card,
  Button,
  Choices,
  Empty,
  Banner,
  SelectField,
} from "../../src/ui/components";
import { Text } from "../../src/ui/text";
import { c, s } from "../../src/ui/theme";
import { t } from "../../src/i18n";
import { readingDate, readingNumber } from "../../src/ui/water-readings";
import { ParameterChart } from "../../src/ui/parameter-chart";
export default function Insights() {
  const { tankId } = useLocalSearchParams<{ tankId: string }>(),
    app = useApp(),
    router = useRouter();
  const tank = app.data.tanks.find((t) => t.id === tankId);
  const [days, setDays] = useState("30"),
    [series, setSeries] = useState(""),
    [page, setPage] = useState(0);
  const range = chartRange(Number(days), new Date(app.clockTick)),
    query = useInsightRange(tankId, range.start, range.end, true);
  if (!tank)
    return (
      <Screen title={t("insights.charts")}>
        <Empty title={t("error.notFound")} />
      </Screen>
    );
  const options = Array.from(
    new Map(
      (query.data?.values ?? []).map((v) => [
        JSON.stringify([v.parameterKey, v.unitSnapshot]),
        {
          key: v.parameterKey,
          unit: v.unitSnapshot,
          name: waterParameterLabel(v.parameterKey, v.nameSnapshot),
        },
      ]),
    ).entries(),
  );
  const selected = options.find(([id]) => id === series) ?? options[0];
  const readings = new Map(query.data?.readings.map((r) => [r.id, r]));
  const points = (query.data?.values ?? [])
    .filter(
      (v) =>
        selected &&
        v.parameterKey === selected[1].key &&
        v.unitSnapshot === selected[1].unit,
    )
    .map((v) => ({
      id: v.id,
      value: v.value,
      performedAt: readings.get(v.readingId)!.performedAt,
    }));
  const target = selected
    ? matchingTarget(app.data, tankId, selected[1].key, selected[1].unit)
    : undefined;
  const latest = points.at(-1);
  const status = latest ? targetStatus(latest.value, target) : null;
  const staleDays =
    app.data.tankPreferences.find((p) => p.tankId === tankId)?.staleDays ?? 7;
  return (
    <Screen title={t("insights.charts")}>
      <Text style={s.heading}>{tank.name}</Text>
      <Choices
        value={days}
        options={["7", "30", "90"].map(
          (d) => [d, t("insights.days", { count: Number(d) })] as const,
        )}
        onChange={(d) => {
          setDays(d);
          setPage(0);
        }}
      />
      {!tank.archivedAt && (
        <Button
          title={t("insights.preferences")}
          variant="secondary"
          onPress={() =>
            router.push({ pathname: "/tank/preferences", params: { tankId } })
          }
        />
      )}
      {query.error ? (
        <>
          <Banner text={t("readings.error")} />
          <Button title={t("common.tryAgain")} onPress={query.retry} />
        </>
      ) : !query.data ? (
        <Text style={s.muted}>{t("readings.loading")}</Text>
      ) : !selected ? (
        <Empty title={t("insights.empty")} />
      ) : (
        <>
          <SelectField
            label={t("insights.parameter")}
            value={selected[0]}
            options={options.map(
              ([key, v]) =>
                [key, v.name + (v.unit ? ` (${v.unit})` : "")] as const,
            )}
            onChange={(v) => {
              setSeries(v);
              setPage(0);
            }}
          />
          <Card>
            <Text style={s.label}>
              {t("insights.count", { count: points.length })}
            </Text>
            {latest && (
              <Text style={s.heading}>
                {readingNumber(latest.value)} {selected[1].unit}
              </Text>
            )}
            {status && (
              <Text
                style={{ color: status === "within" ? c.green : c.overdue }}
              >
                {t(`insights.${status}`)}
              </Text>
            )}
            {latest &&
              isStale(
                latest.performedAt,
                staleDays,
                new Date(app.clockTick),
              ) && (
                <Text style={{ color: c.muted }}>{t("insights.stale")}</Text>
              )}
            <ParameterChart
              points={points}
              changes={(query.data.logs ?? []).filter(
                (l) => l.activityType === "water_change",
              )}
              target={target}
              unit={selected[1].unit}
            />
          </Card>
          <Card>
            {[...points]
              .reverse()
              .slice(page * 30, (page + 1) * 30)
              .map((p) => (
                <Text key={p.id} style={s.body}>
                  {readingDate(p.performedAt)} · {readingNumber(p.value)}{" "}
                  {selected[1].unit}
                </Text>
              ))}
            <View style={s.row}>
              {page > 0 && (
                <Button
                  title={t("readings.newer")}
                  variant="secondary"
                  onPress={() => setPage((p) => p - 1)}
                />
              )}
              {(page + 1) * 30 < points.length && (
                <Button
                  title={t("readings.older")}
                  variant="secondary"
                  onPress={() => setPage((p) => p + 1)}
                />
              )}
            </View>
          </Card>
          {query.data.logs
            .filter((l) => l.activityType === "water_change")
            .map((l) => (
              <Text key={l.id} style={s.tiny}>
                {readingDate(l.performedAt)} · {t("activity.waterChange")}{" "}
                {l.percent}%
              </Text>
            ))}
        </>
      )}
    </Screen>
  );
}
