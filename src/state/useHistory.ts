import { t as tr } from "../i18n";
import { useState, useEffect, useRef } from "react";
import { useApp } from "./AppProvider";
import type { CareLog } from "../domain/models";
export function useHistory(tankId: string, type = "") {
  const { store, data, historyVersion } = useApp();
  const [logs, setLogs] = useState<CareLog[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState<string | null>(null),
    [more, setMore] = useState(true);
  const busy = useRef(false),
    generation = useRef(0),
    loaded = useRef<CareLog[]>([]),
    query = useRef("");
  useEffect(() => {
    const version = ++generation.current,
      key = `${tankId}:${type}`;
    if (query.current !== key) {
      query.current = key;
      loaded.current = [];
      setLogs([]);
    }
    const target = Math.max(30, Math.ceil(loaded.current.length / 30) * 30);
    setLoading(true);
    setError(null);
    busy.current = true;
    (async () => {
      const rows: CareLog[] = [];
      let nextPage = true;
      while (rows.length < target && nextPage) {
        const page = await store!.history(
          tankId,
          rows.at(-1),
          type === "all" ? "" : type,
        );
        rows.push(...page);
        nextPage = page.length === 30;
      }
      if (generation.current === version) {
        loaded.current = rows;
        setLogs(rows);
        setMore(nextPage);
      }
    })()
      .catch(() => {
        if (generation.current === version)
          setError(tr("messages.couldNotLoadHistoryPleaseTryAgain"));
      })
      .finally(() => {
        if (generation.current === version) {
          setLoading(false);
          busy.current = false;
        }
      });
    return () => {
      generation.current++;
    };
  }, [store, tankId, type, data, historyVersion]);
  async function loadMore() {
    if (busy.current || !more || !loaded.current.length) return;
    busy.current = true;
    const version = generation.current;
    try {
      const rows = await store!.history(
        tankId,
        loaded.current.at(-1),
        type === "all" ? "" : type,
      );
      if (generation.current === version) {
        loaded.current = [...loaded.current, ...rows];
        setLogs(loaded.current);
        setMore(rows.length === 30);
      }
    } catch {
      setError(tr("messages.couldNotLoadTheNextPagePleaseTry"));
    } finally {
      if (generation.current === version) busy.current = false;
    }
  }
  return {
    logs,
    loading,
    error,
    loadMore,
  };
}
