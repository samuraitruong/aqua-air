import "./polyfills";
export type PluralMessage = Readonly<
  Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }
>;
export type MessageValue = string | PluralMessage;
export interface LocaleDefinition {
  readonly label: string;
  readonly direction?: "ltr" | "rtl";
  readonly locale: string;
  readonly messages: Readonly<Partial<Record<string, MessageValue>>>;
}
export function createTranslator<R extends Record<string, LocaleDefinition>>(
  registry: R,
  fallback: keyof R & string,
) {
  return (
    key: string,
    params: Record<string, string | number> = {},
    language: keyof R & string = fallback,
  ): string => {
    const definition = registry[language] ?? registry[fallback]!;
    const source =
      definition.messages[key] === undefined ? registry[fallback]! : definition;
    const value = source.messages[key];
    if (value === undefined) return key;
    const count = params.count ?? params["0"];
    const template =
      typeof value === "string"
        ? value
        : (value[
            new Intl.PluralRules(source.locale).select(
              typeof count === "number" ? count : 0,
            )
          ] ?? value.other);
    return template.replace(/\{([\w]+)\}/g, (placeholder, name: string) =>
      Object.prototype.hasOwnProperty.call(params, name)
        ? String(params[name])
        : placeholder,
    );
  };
}
