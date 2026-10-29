import { t } from "../i18n";
import { DomainError, UserFacingError } from "../domain/error";
export function userMessage(error: unknown): string {
  if (error instanceof UserFacingError)
    return t(error.messageKey, error.params);
  if (error instanceof DomainError) return error.message;
  const message = error instanceof Error ? error.message : "";
  if (/SQLITE_FULL|disk (is )?full|ENOSPC/i.test(message))
    return t("error.storageFull");
  return t("error.localDataFailure");
}
