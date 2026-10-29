import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useApp } from "../state/AppProvider";
import { getLocale, t } from "../i18n";
import { localDate } from "../domain/dates";
import { parseNumberInput } from "../domain/number-input";
import {
  formatWaterCost,
  validateWaterRate,
  waterCurrencies,
  type MonthlyWaterUsage,
} from "../domain/water-usage";
import {
  Button,
  Card,
  Field,
  Icon,
  SectionHeading,
  SelectField,
  Banner,
} from "./components";
import { Text } from "./text";
import { c, s } from "./theme";

export function WaterRateSettings() {
  const app = useApp(),
    saved = app.data.settings.waterRate;
  const [amount, setAmount] = useState(saved ? String(saved.amount) : "");
  const [currency, setCurrency] = useState(saved?.currency ?? "AUD");
  const [unit, setUnit] = useState<"1" | "1000">(
    String(saved?.perLitres ?? 1000) as "1" | "1000",
  );
  const [error, setError] = useState(false);
  useEffect(() => {
    setAmount(saved ? String(saved.amount) : "");
    setCurrency(saved?.currency ?? "AUD");
    setUnit(String(saved?.perLitres ?? 1000) as "1" | "1000");
    setError(false);
  }, [saved?.amount, saved?.currency, saved?.perLitres]);
  const rate = {
    amount: amount.trim() ? parseNumberInput(amount) : NaN,
    currency,
    perLitres: Number(unit) as 1 | 1000,
  };
  const unchanged =
    !!saved &&
    saved.amount === rate.amount &&
    saved.currency === currency &&
    saved.perLitres === rate.perLitres;
  return (
    <>
      <SectionHeading title={t("water.rate")} />
      <Card>
        <View style={s.row}>
          <Icon name="droplet" />
          <Text style={[s.heading, s.grow]}>{t("water.title")}</Text>
        </View>
        <SelectField
          label={t("water.currency")}
          value={currency}
          options={waterCurrencies.map((code) => [code, code] as const)}
          onChange={setCurrency}
        />
        <SelectField
          label={t("water.unit")}
          value={unit}
          options={[
            ["1000", t("water.per1000L")],
            ["1", t("water.perL")],
          ]}
          onChange={(next) => {
            const value = parseNumberInput(amount);
            if (amount.trim() && Number.isFinite(value))
              setAmount(
                String(
                  Number(
                    ((value * Number(next)) / Number(unit)).toPrecision(12),
                  ),
                ),
              );
            setUnit(next);
          }}
        />
        <Field
          label={`${t("water.amount")} (${currency})`}
          value={amount}
          onChangeText={(value) => {
            setAmount(value);
            setError(false);
          }}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        {error && <Banner text={t("water.invalidRate")} />}
        <Text style={s.tiny}>{t("water.estimate")}</Text>
        <Button
          title={t("common.saveChanges")}
          disabled={app.busy || unchanged}
          onPress={() => {
            try {
              validateWaterRate(rate);
              setError(false);
              void app.run(
                () => app.care!.setWaterRate(rate),
                t("water.saved"),
              );
            } catch {
              setError(true);
            }
          }}
        />
        {!!saved && (
          <Button
            title={t("water.clear")}
            variant="ghost"
            disabled={app.busy}
            onPress={() =>
              void app.run(() => app.care!.setWaterRate(null), t("water.saved"))
            }
          />
        )}
      </Card>
    </>
  );
}

export function MonthlyWaterCard() {
  const app = useApp(),
    router = useRouter(),
    month = localDate().slice(0, 7);
  const [result, setResult] = useState<MonthlyWaterUsage | null>(null),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setResult(null);
    setError(false);
    if (app.store)
      void app.store
        .monthlyWaterUsage(month)
        .then((value) => {
          if (active) setResult(value);
        })
        .catch(() => {
          if (active) setError(true);
        });
    return () => {
      active = false;
    };
  }, [app.store, app.data, app.historyVersion, app.clockTick, month, retry]);
  const [details, setDetails] = useState(false);
  const rate = app.data.settings.waterRate;
  return (
    <Card aqua>
      <View style={s.row}>
        <Icon name="droplet" size={25} />
        <View style={s.grow}>
          <Text style={s.heading}>{t("water.monthly")}</Text>
          <Text style={s.tiny}>
            {new Intl.DateTimeFormat(getLocale(), {
              month: "long",
              year: "numeric",
            }).format(new Date(month + "-01T12:00:00"))}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("water.hint")}
          accessibilityState={{ expanded: details }}
          onPress={() => setDetails((v) => !v)}
          style={{
            minWidth: 44,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="info" size={20} />
        </Pressable>
      </View>
      {error ? (
        <>
          <Banner text={t("water.loadError")} />
          <Button
            title={t("water.retry")}
            variant="secondary"
            onPress={() => setRetry((n) => n + 1)}
          />
        </>
      ) : !result ? (
        <View style={s.row}>
          <ActivityIndicator color={c.primary} />
          <Text style={s.muted}>{t("water.loading")}</Text>
        </View>
      ) : (
        <>
          <View style={[s.row, { alignItems: "flex-start", flexWrap: "wrap" }]}>
            <View style={{ flexGrow: 1, flexBasis: 130, gap: 4 }}>
              <Text style={s.tiny}>{t("water.litres")}</Text>
              <Text style={[s.title, { fontSize: 26, lineHeight: 34 }]}>
                {new Intl.NumberFormat(getLocale(), {
                  maximumFractionDigits: 2,
                }).format(result.litres)}{" "}
                L
              </Text>
            </View>
            <View style={{ flexGrow: 1, flexBasis: 130, gap: 4 }}>
              <Text style={s.tiny}>{t("water.cost")}</Text>
              {rate ? (
                <Text style={[s.heading, { lineHeight: 28 }]}>
                  {formatWaterCost(result.litres, rate)}
                </Text>
              ) : (
                <Text style={s.heading}>—</Text>
              )}
            </View>
          </View>
          {!!result.missing && <Banner text={t("water.missing")} />}
          {details && !!result.estimated && (
            <Text style={s.tiny}>{t("water.legacy")}</Text>
          )}
          {details && <Text style={s.tiny}>{t("water.hint")}</Text>}
          {details && rate && <Text style={s.tiny}>{t("water.estimate")}</Text>}
          <Button
            title={t(rate ? "water.rate" : "water.configure")}
            variant="ghost"
            onPress={() => router.push("/settings")}
          />
        </>
      )}
    </Card>
  );
}
