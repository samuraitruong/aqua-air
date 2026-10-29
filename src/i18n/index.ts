import type { ActivityType } from "../domain/models";
import { createTranslator, type LocaleDefinition } from "./translator";
import {
  locales,
  defaultLanguage,
  isLanguage,
  type Language,
  type MessageKey,
} from "./locales";
import legacyActivityTitles from "./legacy-activity-titles.json";
export {
  locales,
  defaultLanguage,
  isLanguage,
  languageOptions,
} from "./locales";
export type { Language, MessageKey } from "./locales";
const translate = createTranslator(locales, defaultLanguage);
let current: Language = defaultLanguage;
export function setLanguage(language: Language) {
  current = isLanguage(language) ? language : defaultLanguage;
}
export function getLanguage(): Language {
  return current;
}
export function getLocale(language: Language = current): string {
  return (locales[language] ?? locales[defaultLanguage]).locale;
}
export function getDirection(language: Language = current): "ltr" | "rtl" {
  return (locales[language] ?? locales[defaultLanguage]).direction;
}
export function t(
  key: MessageKey,
  params: Record<string, string | number> = {},
  language: Language = current,
): string {
  return translate(key, params, language);
}
export const activityKeys = {
  water_change: "activity.waterChange",
  filter_clean: "activity.filterCleaning",
  substrate_clean: "activity.substrateCleaning",
  plant_care: "activity.plantCare",
  other: "activity.other",
} as const satisfies Record<ActivityType, MessageKey>;
function labels<T extends Record<string, MessageKey>>(
  keys: T,
): { [K in keyof T]: string } {
  return Object.fromEntries(
    Object.entries(keys).map(([key, message]) => [key, t(message)]),
  ) as { [K in keyof T]: string };
}
export const copy = {
  name: "Aqua Air",
  get tabs() {
    return labels({
      index: "nav.overview",
      tanks: "nav.tanks",
      calendar: "nav.calendar",
      settings: "nav.settings",
    });
  },
  get activity() {
    return labels(activityKeys);
  },
  get water() {
    return labels({
      freshwater: "water.freshwater",
      saltwater: "water.saltwater",
      brackish: "water.brackish",
      unspecified: "water.unspecified",
    });
  },
  get save() {
    return t("common.saveChanges");
  },
  get cancel() {
    return t("common.cancel");
  },
  get loading() {
    return t("app.loading");
  },
  get localData() {
    return t("settings.localDataNotice");
  },
};
export function activityTitle(
  type: ActivityType,
  title?: string,
  language: Language = current,
): string {
  const key = activityKeys[type];
  const isDefault =
    !title ||
    title === key ||
    legacyActivityTitles[type].includes(title) ||
    Object.values(locales).some(
      (locale: LocaleDefinition) => locale.messages[key] === title,
    );
  return isDefault ? t(key, {}, language) : title;
}
export function quantityLabel(key: MessageKey, count: number): string {
  return t(key, { count });
}
