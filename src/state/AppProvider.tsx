import { setLanguage } from "../i18n";
import { t as tr } from "../i18n";
import { userMessage } from "../services/errors";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { AppState, AccessibilityInfo, Platform } from "react-native";
import { randomUUID } from "expo-crypto";
import * as Haptics from "expo-haptics";
import { openStore } from "../repositories/native";
import type { SqlStore } from "../repositories/store";
import { WaterReadingService } from "../services/water-readings";
import { CareService } from "../services/care";
import { emptyData, type AppData } from "../domain/models";
import { nativeNotifications } from "../services/notifications";
import { reconcileNotifications } from "../services/notification-worker";
import { cleanUnusedPhotos } from "../services/media";
type Result<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
    };
interface Context {
  data: AppData;
  totalLogs: number;
  totalReadings: number;
  historyVersion: number;
  clockTick: number;
  store: SqlStore | null;
  care: CareService | null;
  water: WaterReadingService | null;
  loading: boolean;
  busy: boolean;
  error: string | null;
  toast: string | null;
  refresh(): Promise<void>;
  retry(): void;
  notify(message: string): void;
  clearError(): void;
  run<T>(fn: () => Promise<T>, message?: string): Promise<Result<T>>;
}
const Ctx = createContext<Context | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [totalLogs, setTotalLogs] = useState(0);
  const [totalReadings, setTotalReadings] = useState(0);
  const [water, setWater] = useState<WaterReadingService | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0),
    [clockTick, setClockTick] = useState(Date.now());
  const [data, setData] = useState(emptyData),
    [store, setStore] = useState<SqlStore | null>(null),
    [care, setCare] = useState<CareService | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [toast, setToast] = useState<string | null>(null),
    [attempt, setAttempt] = useState(0);
  const locked = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((text: string) => {
    setToast(text);
    AccessibilityInfo.announceForAccessibility(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 4500);
  }, []);
  const refresh = useCallback(async () => {
    if (store) {
      const view = await store.view();
      setLanguage(view.data.settings.language);
      setData((previous) =>
        JSON.stringify(previous) === JSON.stringify(view.data)
          ? previous
          : view.data,
      );
      setTotalLogs(view.totalLogs);
      setTotalReadings(view.totalReadings);
    }
  }, [store]);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    openStore()
      .then(async (db) => {
        if (!alive) return;
        const initial = await db.view();
        if (!alive) return;
        setStore(db);
        setCare(new CareService(db, randomUUID));
        setWater(new WaterReadingService(db, randomUUID));
        setLanguage(initial.data.settings.language);
        setData(initial.data);
        setTotalLogs(initial.totalLogs);
        setTotalReadings(initial.totalReadings);
        try {
          cleanUnusedPhotos(initial.data.photos);
        } catch {
          /* Retry orphan cleanup at next startup. */
        }
        setLoading(false);
        await reconcileNotifications(db, nativeNotifications);
        if (alive) {
          const current = await db.view();
          setData((previous) =>
            JSON.stringify(previous) === JSON.stringify(current.data)
              ? previous
              : current.data,
          );
          setTotalLogs(current.totalLogs);
          setTotalReadings(current.totalReadings);
        }
      })
      .catch(() => {
        if (alive) {
          setError(tr("messages.couldNotOpenLocalDataPleaseTryAgain"));
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [attempt]);
  useEffect(() => {
    if (!store) return;
    const update = async () => {
      try {
        setClockTick(Date.now());
        await reconcileNotifications(store, nativeNotifications);
        const view = await store.view();
        setLanguage(view.data.settings.language);
        setData((previous) =>
          JSON.stringify(previous) === JSON.stringify(view.data)
            ? previous
            : view.data,
        );
        setTotalLogs(view.totalLogs);
        setTotalReadings(view.totalReadings);
      } catch {
        setError(tr("messages.couldNotRefreshYourDataPleaseTryAgain"));
      }
    };
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void update();
    });
    const interval = setInterval(() => {
      if (AppState.currentState === "active") void update();
    }, 60000);
    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [store]);
  async function run<T>(
    fn: () => Promise<T>,
    message?: string,
  ): Promise<Result<T>> {
    if (locked.current)
      return {
        ok: false,
      };
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      const value = await fn();
      setHistoryVersion((v) => v + 1);
      await refresh();
      if (message) notify(message);
      if (Platform.OS !== "web")
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
      if (store)
        void reconcileNotifications(store, nativeNotifications).then(() =>
          refresh(),
        );
      return {
        ok: true,
        value,
      };
    } catch (e) {
      setError(userMessage(e));
      return {
        ok: false,
      };
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <Ctx.Provider
      value={{
        data,
        totalLogs,
        totalReadings,
        water,
        historyVersion,
        clockTick,
        store,
        care,
        loading,
        busy,
        error,
        toast,
        refresh,
        retry: () => setAttempt((x) => x + 1),
        notify,
        clearError: () => setError(null),
        run,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw Error("AppProvider is required");
  return ctx;
}
