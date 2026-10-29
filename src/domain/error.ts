import { t, type MessageKey } from "../i18n";
export class DomainError extends Error {
  constructor(
    public code: string,
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}
export function requireValue(
  ok: unknown,
  message: string,
  field?: string,
): asserts ok {
  if (!ok) throw new DomainError("VALIDATION_ERROR", message, field);
}

export class UserFacingError extends Error {
  constructor(
    public messageKey: MessageKey,
    public params: Record<string, string | number> = {},
  ) {
    super(t(messageKey, params));
  }
}
