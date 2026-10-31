import React, { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useApp } from "../../src/state/AppProvider";
import { useInsightRange } from "../../src/state/useTankInsights";
import { localDate, isDate, formatDate } from "../../src/domain/dates";
import { shareTankReport } from "../../src/services/tank-reports";
import {
  Screen,
  Card,
  Button,
  DateField,
  Empty,
  Banner,
} from "../../src/ui/components";
import { Text } from "../../src/ui/text";
import { s } from "../../src/ui/theme";
import { t } from "../../src/i18n";
export default function Export() {
  const { tankId } = useLocalSearchParams<{ tankId: string }>(),
    app = useApp(),
    tank = app.data.tanks.find((t) => t.id === tankId),
    today = localDate();
  const [start, setStart] = useState(today.slice(0, 8) + "01"),
    [end, setEnd] = useState(today),
    [period, setPeriod] = useState({ start, end });
  const query = useInsightRange(tankId, period.start, period.end);
  const valid = isDate(start) && isDate(end) && start <= end,
    ready = !!query.data && period.start === start && period.end === end;
  if (!tank)
    return (
      <Screen title={t("insights.export")}>
        <Empty title={t("error.notFound")} />
      </Screen>
    );
  const share = (kind: "pdf" | "water" | "care") =>
    void app.run(() => shareTankReport(tank, query.data!, start, end, kind));
  return (
    <Screen title={t("insights.export")}>
      <Text style={s.heading}>{tank.name}</Text>
      <Card>
        <DateField
          label={t("insights.start")}
          value={start}
          onChange={setStart}
        />
        <DateField label={t("insights.end")} value={end} onChange={setEnd} />
        <Button
          title={t("insights.preview")}
          disabled={!valid || app.busy}
          onPress={() => setPeriod({ start, end })}
        />
      </Card>
      {!valid && <Banner text={t("insights.invalid")} />}
      {query.error ? (
        <>
          <Banner text={t("readings.error")} />
          <Button title={t("common.tryAgain")} onPress={query.retry} />
        </>
      ) : !query.data ? (
        <Text>{t("readings.loading")}</Text>
      ) : (
        ready && (
          <Card>
            <Text style={s.label}>
              {formatDate(start)} — {formatDate(end)}
            </Text>
            <Text style={s.body}>
              {t("insights.count", { count: query.data.readings.length })}
            </Text>
            <Text style={s.body}>
              {t("insights.careCount", { count: query.data.logs.length })}
            </Text>
            <Text style={s.tiny}>{t("insights.exportHint")}</Text>
            <Button
              title={t("insights.pdf")}
              disabled={app.busy}
              onPress={() => share("pdf")}
            />
            <Button
              title={t("insights.waterCsv")}
              variant="secondary"
              disabled={app.busy}
              onPress={() => share("water")}
            />
            <Button
              title={t("insights.careCsv")}
              variant="secondary"
              disabled={app.busy}
              onPress={() => share("care")}
            />
          </Card>
        )
      )}
    </Screen>
  );
}
