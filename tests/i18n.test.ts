import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  t,
  setLanguage,
  getLocale,
  activityTitle,
  locales,
  languageOptions,
} from "../src/i18n";
import { createTranslator, type MessageValue } from "../src/i18n/translator";
import vi from "../src/i18n/vi.json";
import en from "../src/i18n/en.json";
import { taskStatus } from "../src/domain/scheduling";
import { formatDate } from "../src/domain/dates";
afterEach(() => setLanguage("vi"));
test("stable label keys change labels, statuses and dates immediately", () => {
  setLanguage("en");
  assert.equal(t("settings.language"), "Language");
  assert.equal(
    taskStatus("2026-10-26", "2026-10-28").label,
    "Overdue by 2 days",
  );
  assert.equal(getLocale(), "en-GB");
  assert.equal(formatDate("2026-10-28", { month: "long" }), "October");
  setLanguage("vi");
  assert.equal(t("settings.language"), "Ngôn ngữ");
  assert.equal(taskStatus("2026-10-28", "2026-10-28").label, "Hôm nay");
});
const variants = (value: MessageValue) =>
  typeof value === "string" ? [value] : Object.values(value);
const placeholders = (value: string) =>
  [...value.matchAll(/\{([\w]+)\}/g)].map((x) => x[1]).sort();
test("registered locale catalogs have identical stable keys and matching placeholders", () => {
  for (const [language, definition] of Object.entries(locales)) {
    assert.deepEqual(
      Object.keys(definition.messages).sort(),
      Object.keys(vi).sort(),
      language,
    );
    for (const [key, value] of Object.entries(vi)) {
      assert.match(key, /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$/);
      const expected = placeholders(variants(value)[0]!);
      for (const text of variants(
        definition.messages[key as keyof typeof vi],
      )) {
        assert.ok(text.trim(), key);
        assert.deepEqual(placeholders(text), expected, key);
      }
    }
  }
});
test("a third language uses the same engine, locale plural rules and fallback", () => {
  const translate = createTranslator(
    {
      vi: locales.vi,
      en: locales.en,
      fr: {
        label: "Français",
        locale: "fr-FR",
        messages: {
          "settings.language": "Langue",
          "status.dueInDays": { one: "Dans {0} jour", other: "Dans {0} jours" },
        },
      },
    },
    "vi",
  );
  assert.equal(translate("settings.language", {}, "fr"), "Langue");
  assert.equal(translate("status.dueInDays", { 0: 1 }, "fr"), "Dans 1 jour");
  assert.equal(translate("status.dueInDays", { 0: 2 }, "fr"), "Dans 2 jours");
  assert.equal(translate("common.cancel", {}, "fr"), "Hủy");
  assert.equal(translate("unknown.key", {}, "fr"), "unknown.key");
});
test("language options come from the registry", () => {
  assert.deepEqual(
    languageOptions.map(([code]) => code),
    Object.keys(locales),
  );
});
test("standard and legacy activity titles translate while user titles remain unchanged", () => {
  setLanguage("en");
  assert.equal(activityTitle("water_change", "Thay nước"), "Water change");
  assert.equal(
    activityTitle("water_change", "activity.waterChange"),
    "Water change",
  );
  assert.equal(activityTitle("other", "Thay nước"), "Thay nước");
  assert.equal(activityTitle("other", "Custom care task"), "Custom care task");
  setLanguage("vi");
  assert.equal(activityTitle("filter_clean", "Filter cleaning"), "Vệ sinh lọc");
});
test("English counts use locale plural forms", () => {
  setLanguage("en");
  assert.equal(t("status.dueInDays", { 0: 1 }), "Due in 1 day");
  assert.equal(t("status.overdueDays", { 0: 1 }), "Overdue by 1 day");
  assert.equal(t("counts.tankCount", { 0: 1 }), "1 tank");
});

test("the translator never interprets Vietnamese or English display text as label keys", () => {
  const translate = createTranslator(locales, "vi");
  assert.equal(translate("Cài đặt", {}, "en"), "Cài đặt");
  assert.equal(translate("Settings", {}, "vi"), "Settings");
});
test("fallback plural grammar uses the fallback catalog locale", () => {
  const translate = createTranslator(
    {
      en: locales.en,
      fr: { label: "Français", locale: "fr-FR", messages: {} },
    },
    "en",
  );
  assert.equal(translate("status.dueInDays", { 0: 0 }, "fr"), "Due in 0 days");
});

test("the top ten language set plus Vietnamese is registered, with VI still the default", async () => {
  const { defaultLanguage, isLanguage, getDirection } =
    await import("../src/i18n");
  const expected = [
    "vi",
    "en",
    "zh",
    "hi",
    "es",
    "ar",
    "fr",
    "bn",
    "pt",
    "id",
    "ur",
  ];
  assert.deepEqual(Object.keys(locales), expected);
  assert.equal(defaultLanguage, "vi");
  for (const code of expected) {
    assert.ok(isLanguage(code), code);
    assert.equal(
      getDirection(code as any),
      code === "ar" || code === "ur" ? "rtl" : "ltr",
      code,
    );
  }
});

test("all language catalogs render plural counts without leaving interpolation tokens", () => {
  for (const [code, definition] of Object.entries(locales)) {
    const translate = createTranslator(locales, "vi");
    for (const [key, value] of Object.entries(definition.messages)) {
      if (typeof value !== "string")
        for (const count of [0, 1, 2, 3, 11, 100, 1.5]) {
          const result = translate(
            key,
            { 0: count, count },
            code as keyof typeof locales,
          );
          assert.ok(result.trim(), `${code}:${key}:${count}`);
          assert.doesNotMatch(result, /\{[\w]+\}/, `${code}:${key}:${count}`);
        }
    }
  }
});
