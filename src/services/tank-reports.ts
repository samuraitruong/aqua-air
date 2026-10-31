import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { randomUUID } from "expo-crypto";
import type { InsightRange, Tank } from "../domain/models";
import { waterCsv, careCsv, reportHtml } from "../domain/tank-reports";
import { UserFacingError } from "../domain/error";
export async function shareTankReport(
  tank: Tank,
  data: InsightRange,
  start: string,
  end: string,
  kind: "pdf" | "water" | "care",
) {
  if (!(await Sharing.isAvailableAsync()))
    throw new UserFacingError("messages.fileSharingIsNotAvailableOnThisDevice");
  let temporary: File | undefined, generated: File | undefined;
  try {
    temporary = new File(
      Paths.cache,
      `Aqua-Air-${randomUUID()}.${kind === "pdf" ? "pdf" : "csv"}`,
    );
    if (kind === "pdf") {
      const Print = await import("expo-print");
      const result = await Print.printToFileAsync({
        html: reportHtml(tank, data, start, end),
        width: 595,
        height: 842,
      });
      generated = new File(result.uri);
      generated.copy(temporary);
    } else temporary.write(kind === "water" ? waterCsv(data) : careCsv(data));
    await Sharing.shareAsync(temporary.uri, {
      mimeType: kind === "pdf" ? "application/pdf" : "text/csv",
      UTI:
        kind === "pdf" ? "com.adobe.pdf" : "public.comma-separated-values-text",
    });
  } finally {
    for (const f of [temporary, generated])
      try {
        if (f?.exists) f.delete();
      } catch {
        /* Cache eviction can retry naturally. */
      }
  }
}
