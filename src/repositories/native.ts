import { openDatabaseAsync } from "expo-sqlite";
import { SqlStore, type SqlDriver } from "./store";
export async function openStore() {
  const db = await openDatabaseAsync("aqua-air.db");
  const driver: SqlDriver = {
    exec: (s) => db.execAsync(s),
    all: <T>(s: string, ...p: (string | number | null)[]) =>
      db.getAllAsync<T>(s, ...p),
    run: async (s, ...p) => {
      await db.runAsync(s, ...p);
    },
  };
  const store = new SqlStore(driver);
  await store.init();
  return store;
}
