import type { ConfigContext, ExpoConfig } from "expo/config";
import store from "./release/store.json";
export default ({ config }: ConfigContext): ExpoConfig => {
  const value = process.env.AQUAAIR_BUILD_NUMBER ?? "1";
  if (!/^[1-9]\d*$/.test(value) || Number(value) > 2100000000)
    throw new Error("Invalid AQUAAIR_BUILD_NUMBER");
  return {
    ...config,
    name: config.name ?? "Aqua Air",
    slug: config.slug ?? "aqua-air",
    ios: { ...config.ios, buildNumber: value },
    android: { ...config.android, versionCode: Number(value) },
    extra: { ...config.extra, store },
  };
};
