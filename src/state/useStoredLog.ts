import { t as tr } from "../i18n";
import { useEffect, useState } from "react";
import { useApp } from "./AppProvider";
import type { CareLog } from "../domain/models";
export function useStoredLog(id?: string) {
  const app = useApp();
  const [result, setResult] = useState<{
    id?: string;
    log?: CareLog;
    loading: boolean;
    error?: string;
  }>({
    id,
    loading: !!id,
  });
  useEffect(() => {
    let alive = true;
    if (!id) {
      setResult({
        id,
        loading: false,
      });
      return;
    }
    setResult((old) =>
      old.id === id
        ? old
        : {
            id,
            loading: true,
          },
    );
    app
      .store!.getLog(id)
      .then((log) => {
        if (alive)
          setResult({
            id,
            log,
            loading: false,
          });
      })
      .catch(() => {
        if (alive)
          setResult({
            id,
            loading: false,
            error: tr("messages.couldNotLoadThisActivityGoBackAnd"),
          });
      });
    return () => {
      alive = false;
    };
  }, [id, app.store, app.data, app.historyVersion]);
  return result.id === id
    ? result
    : {
        id,
        loading: true,
      };
}
