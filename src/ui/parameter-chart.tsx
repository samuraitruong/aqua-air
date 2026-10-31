import React, { useState } from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Line,
  Polyline,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import type { WaterTarget, CareLog } from "../domain/models";
import { samplePoints } from "../domain/tank-insights";
import { readingDate, readingNumber } from "./water-readings";
import { t } from "../i18n";
import { Text } from "./text";
import { c, s } from "./theme";
export interface ChartPoint {
  id: string;
  value: number;
  performedAt: string;
}
export function ParameterChart({
  points,
  changes,
  target,
  unit,
}: {
  points: ChartPoint[];
  changes: CareLog[];
  target?: WaterTarget;
  unit: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const plot = samplePoints(points),
    [width, setWidth] = useState(300);
  if (!points.length) return null;
  const extrema = points.reduce(
    (a, p) => ({
      min: Math.min(a.min, p.value),
      max: Math.max(a.max, p.value),
    }),
    { min: Infinity, max: -Infinity },
  );
  let min = Math.min(extrema.min, target?.lower ?? extrema.min),
    max = Math.max(extrema.max, target?.upper ?? extrema.max);
  const pad = Math.max((max - min) * 0.12, Math.abs(max) * 0.01, 0.1);
  min -= pad;
  max += pad;
  const first = Date.parse(points[0]!.performedAt),
    last = Date.parse(points.at(-1)!.performedAt);
  const x = (time: string) =>
      last === first
        ? width / 2
        : 76 + ((Date.parse(time) - first) / (last - first)) * (width - 88),
    y = (value: number) => 180 - ((value - min) / (max - min)) * 160;
  const point = points.find((p) => p.id === selected) ?? points.at(-1)!;
  return (
    <View
      style={{ gap: 10 }}
      onLayout={(e) => setWidth(Math.max(120, e.nativeEvent.layout.width))}
    >
      <Text style={s.label}>
        {readingNumber(extrema.min)} / {readingNumber(extrema.max)} {unit} ·{" "}
        {t("insights.minMax")}
      </Text>
      <View accessibilityLabel={t("insights.charts")}>
        <Svg width={width} height={200}>
          {target && (
            <Rect
              x={76}
              y={y(target.upper ?? max)}
              width={width - 88}
              height={Math.max(
                1,
                y(target.lower ?? min) - y(target.upper ?? max),
              )}
              fill={c.greenBg}
            />
          )}
          {[min, (min + max) / 2, max].map((v) => (
            <React.Fragment key={v}>
              <Line
                x1={76}
                y1={y(v)}
                x2={width - 12}
                y2={y(v)}
                stroke={c.border}
              />
              <SvgText x={0} y={y(v) + 4} fontSize={10} fill={c.muted}>
                {readingNumber(Number(v.toPrecision(4)))}
              </SvgText>
            </React.Fragment>
          ))}
          {changes
            .filter(
              (l) =>
                Date.parse(l.performedAt) >= first &&
                Date.parse(l.performedAt) <= last,
            )
            .slice(0, 100)
            .map((l) => (
              <Line
                key={l.id}
                x1={x(l.performedAt)}
                x2={x(l.performedAt)}
                y1={20}
                y2={180}
                stroke={c.iconMuted}
                strokeDasharray="4 4"
              />
            ))}
          <Polyline
            points={plot
              .map((p) => `${x(p.performedAt)},${y(p.value)}`)
              .join(" ")}
            fill="none"
            stroke={c.primary}
            strokeWidth={2}
          />
          {plot.map((p) => (
            <React.Fragment key={p.id}>
              <Circle
                cx={x(p.performedAt)}
                cy={y(p.value)}
                r={p.id === point.id ? 5 : 3}
                fill={c.primary}
              />
              <Circle
                cx={x(p.performedAt)}
                cy={y(p.value)}
                r={12}
                fill="transparent"
                onPress={() => setSelected(p.id)}
              />
            </React.Fragment>
          ))}
        </Svg>
      </View>
      <Text style={s.body}>
        {readingDate(point.performedAt)} · {readingNumber(point.value)} {unit}
      </Text>
      <Text style={s.tiny}>{t("insights.chartHint")}</Text>
      {plot.length < points.length && (
        <Text style={s.tiny}>{t("insights.sampling")}</Text>
      )}
      <Text style={s.tiny}>
        {readingDate(points[0]!.performedAt)} —{" "}
        {readingDate(points.at(-1)!.performedAt)}
      </Text>
    </View>
  );
}
