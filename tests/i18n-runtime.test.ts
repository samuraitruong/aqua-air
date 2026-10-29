import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

test("translations render on Hermes runtimes without native Intl.PluralRules", () => {
  const result = execFileSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "-e",
      `
    delete Intl.PluralRules;
    delete Intl.Locale;
    const module = await import('./src/i18n/index.ts');
    const { t, locales } = module.default ?? module;
    for (const [code, definition] of Object.entries(locales)) {
      if (Intl.PluralRules.supportedLocalesOf([definition.locale]).length !== 1) throw new Error("Missing CLDR data: " + code);
      for (const count of [0,1,2,3,11,100]) {
        const value = t("status.dueInDays", {0: count}, code);
        if (!value || value.includes("{0}")) throw new Error("Bad plural: " + code);
      }
    }
    console.log(JSON.stringify([
      t('counts.tanks', { count: 1 }, 'en'),
      t('counts.tanks', { count: 2 }, 'en'),
      t('counts.tanks', { count: 2 }, 'vi')
    ]));
  `,
    ],
    { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  assert.deepEqual(JSON.parse(result), ["tank", "tanks", "bể cá"]);
});
