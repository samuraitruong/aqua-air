import { UserFacingError } from "../domain/error";
import { t as tr } from "../i18n";
import { DomainError } from "../domain/validation";
import { Image } from "react-native";
import { Directory, File, Paths } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { randomUUID } from "expo-crypto";
import type { Store } from "../repositories/store";
import {
  encodeBackup,
  decodeBackup,
  type BackupPreview,
} from "./backup-format";
import { documentFile, cleanUnusedPhotos } from "./media";
import { restoreTransaction } from "./restore-transaction";
import type { AppData } from "../domain/models";
async function snapshot(store: Store, withoutPhotos = false) {
  return store.write(async (d) => {
    const data = JSON.parse(JSON.stringify(d)) as AppData;
    const files: Record<string, Uint8Array> = {};
    if (withoutPhotos) {
      data.photos = [];
      data.journalEntries.forEach((j) => (j.photoId = null));
      data.tanks.forEach((t) => (t.coverPhotoId = null));
    } else
      for (const p of data.photos) {
        const file = documentFile(p.relativePath);
        if (!file.exists)
          throw new UserFacingError(
            "messages.somePhotosAreMissingSelectThemAgainOr",
          );
        files[p.relativePath] = await file.bytes();
      }
    return encodeBackup(data, files, new Date().toISOString());
  });
}
export async function exportBackup(store: Store, withoutPhotos = false) {
  const bytes = await snapshot(store, withoutPhotos);
  const file = new File(Paths.cache, `Aqua-Air-${Date.now()}.aquaair`);
  file.write(bytes);
  if (!(await Sharing.isAvailableAsync()))
    throw new UserFacingError("messages.fileSharingIsNotAvailableOnThisDevice");
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/zip",
    dialogTitle: tr("messages.saveAquaAirBackup"),
    UTI: "public.zip-archive",
  });
  await store.write((d) => {
    d.settings.lastBackup = new Date().toISOString();
  });
}
export async function pickBackup(): Promise<BackupPreview | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/zip", "application/octet-stream", "*/*"],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const file = new File(result.assets[0]!.uri);
  if (file.size > 250 * 1024 * 1024)
    throw new UserFacingError("validation.theBackupFileExceedsThe250MbLimit");
  try {
    return decodeBackup(await file.bytes());
  } catch (error) {
    if (error instanceof DomainError) throw error;
    throw new UserFacingError(
      "validation.invalidBackupFileYourCurrentDataHasBeen",
    );
  }
}
export async function restoreBackup(store: Store, preview: BackupPreview) {
  const generation = `generation-${randomUUID()}`;
  await restoreTransaction(
    store,
    preview,
    {
      read: async (path) => documentFile(path).bytes(),
      write: async (path, bytes) => {
        documentFile(path).write(bytes);
      },
      createGeneration: async (name) => {
        new Directory(Paths.document, name).create({
          intermediates: true,
          idempotent: true,
        });
      },
      removeGeneration: async (name) => {
        const dir = new Directory(Paths.document, name);
        if (dir.exists) dir.delete();
      },
      verifyPhoto: async (photo) => {
        const size = await Image.getSize(documentFile(photo.relativePath).uri);
        if (size.width !== photo.width || size.height !== photo.height)
          throw new UserFacingError(
            "messages.aBackupPhotoIsDamagedOrHasIncorrect",
          );
      },
      writeRecovery: async (bytes) => {
        new File(Paths.document, "recovery-before-restore.aquaair").write(
          bytes,
        );
      },
    },
    generation,
    new Date().toISOString(),
    randomUUID(),
  );
  // Cleanup is best-effort after commit; OS scheduling failures are retried independently.
  try {
    cleanUnusedPhotos((await store.read()).photos);
  } catch {
    /* Startup retries cleanup. */
  }
}
