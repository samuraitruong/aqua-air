import { useEffect, useState } from "react";
import { useApp } from "./AppProvider";
import type {
  WaterReading,
  WaterReadingWithValues,
  LatestWaterValue,
} from "../domain/models";
type Cursor = Pick<WaterReading, "performedAt" | "createdAt" | "id">;
export function useWaterReadings(tankId: string, active: boolean) {
  const app = useApp();
  const [cursors, setCursors] = useState<Cursor[]>([]),
    [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
      latest: LatestWaterValue[];
      history: WaterReadingWithValues[];
      more: boolean;
    } | null>(null),
    [error, setError] = useState(false);
  useEffect(() => setCursors([]), [tankId, app.historyVersion]);
  const cursor = cursors.at(-1);
  useEffect(() => {
    let alive = true;
    setResult(null);
    setError(false);
    if (app.store)
      void Promise.all([
        app.store.latestWaterValues(tankId),
        active
          ? app.store.waterHistory(tankId, cursor, 31)
          : Promise.resolve([]),
      ])
        .then(([latest, rows]) => {
          if (alive)
            setResult({
              latest,
              history: rows.slice(0, 30),
              more: rows.length > 30,
            });
        })
        .catch(() => {
          if (alive) setError(true);
        });
    return () => {
      alive = false;
    };
  }, [
    tankId,
    active,
    app.store,
    app.historyVersion,
    cursor,
    retry,
    app.clockTick,
  ]);
  return {
    result,
    error,
    retry: () => setRetry((n) => n + 1),
    hasPrevious: cursors.length > 0,
    older: () => {
      const last = result?.history.at(-1);
      if (last)
        setCursors((v) => [
          ...v,
          {
            id: last.id,
            performedAt: last.performedAt,
            createdAt: last.createdAt,
          },
        ]);
    },
    newer: () => setCursors((v) => v.slice(0, -1)),
  };
}
