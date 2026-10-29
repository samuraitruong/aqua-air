import vi from "./vi.json";
import en from "./en.json";
import zh from "./zh.json";
import hi from "./hi.json";
import es from "./es.json";
import ar from "./ar.json";
import fr from "./fr.json";
import bn from "./bn.json";
import pt from "./pt.json";
import id from "./id.json";
import ur from "./ur.json";
import type { LocaleDefinition } from "./translator";
export const locales = {
  vi: {
    label: "Tiếng Việt (VI)",
    locale: "vi-VN",
    direction: "ltr",
    messages: vi,
  },
  en: {
    label: "English (EN)",
    locale: "en-GB",
    direction: "ltr",
    messages: en,
  },
  zh: {
    label: "简体中文 (ZH)",
    locale: "zh-Hans-CN",
    direction: "ltr",
    messages: zh,
  },
  hi: { label: "हिन्दी (HI)", locale: "hi-IN", direction: "ltr", messages: hi },
  es: {
    label: "Español (ES)",
    locale: "es-ES",
    direction: "ltr",
    messages: es,
  },
  ar: { label: "العربية (AR)", locale: "ar", direction: "rtl", messages: ar },
  fr: {
    label: "Français (FR)",
    locale: "fr-FR",
    direction: "ltr",
    messages: fr,
  },
  bn: { label: "বাংলা (BN)", locale: "bn-BD", direction: "ltr", messages: bn },
  pt: {
    label: "Português (PT-BR)",
    locale: "pt-BR",
    direction: "ltr",
    messages: pt,
  },
  id: {
    label: "Bahasa Indonesia (ID)",
    locale: "id-ID",
    direction: "ltr",
    messages: id,
  },
  ur: { label: "اردو (UR)", locale: "ur-PK", direction: "rtl", messages: ur },
} as const satisfies Record<string, LocaleDefinition>;
export type Language = keyof typeof locales;
export type MessageKey = keyof typeof vi;
export const defaultLanguage: Language = "vi";
export const languageOptions = (Object.keys(locales) as Language[]).map(
  (code) => [code, locales[code].label] as const,
);
export function isLanguage(value: unknown): value is Language {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(locales, value)
  );
}
