import { useMemo, useEffect, useState } from "react";
import { randomUUID } from "expo-crypto";
import { useApp } from "./AppProvider";
import { TankInsightsService } from "../services/tank-insights";
import type { InsightRange } from "../domain/models";
export function useInsightsService() {
  const app = useApp();
  return useMemo(
    () =>
      app.store ? new TankInsightsService(app.store, randomUUID) : undefined,
    [app.store],
  );
}
export function useInsightRange(
  tankId: string,
  start: string,
  end: string,
  byTimestamp = false,
) {
  const app = useApp(),
    [result, setResult] = useState<{ key: string; data: InsightRange } | null>(
      null,
    ),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([
    tankId,
    start,
    end,
    app.historyVersion,
    byTimestamp,
    new Date().getTimezoneOffset(),
  ]);
  useEffect(() => {
    let alive = true;
    setError(false);
    if (app.store)
      void app.store
        .insightRange(tankId, start, end, byTimestamp)
        .then((data) => {
          if (alive) setResult({ key, data });
        })
        .catch(() => {
          if (alive) setError(true);
        });
    return () => {
      alive = false;
    };
  }, [app.store, key, attempt]);
  return {
    data: result?.key === key ? result.data : null,
    error,
    retry: () => setAttempt((n) => n + 1),
  };
}
