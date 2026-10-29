import type { Store } from "../repositories/store";
import type { AppData, Photo } from "../domain/models";
import { encodeBackup, type BackupPreview } from "./backup-format";
export interface RestoreMedia {
  read(path: string): Promise<Uint8Array>;
  write(path: string, bytes: Uint8Array): Promise<void>;
  createGeneration(name: string): Promise<void>;
  removeGeneration(name: string): Promise<void>;
  writeRecovery(bytes: Uint8Array): Promise<void>;
  verifyPhoto?(photo: Photo): Promise<void>;
}
export async function restoreTransaction(
  store: Store,
  preview: BackupPreview,
  media: RestoreMedia,
  generation: string,
  now: string,
  id: string,
) {
  let committed = false;
  await media.createGeneration(generation);
  try {
    await store.write(async (current) => {
      const photos: Record<string, Uint8Array> = {};
      for (const p of current.photos)
        photos[p.relativePath] = await media.read(p.relativePath);
      await media.writeRecovery(encodeBackup(current, photos, now));
      const next = JSON.parse(JSON.stringify(preview.data)) as AppData;
      for (const p of next.photos) {
        const source = p.relativePath;
        p.relativePath = `${generation}/${p.id}.${source.split(".").pop()}`;
        await media.write(p.relativePath, preview.files[source]!);
        if (media.verifyPhoto) await media.verifyPhoto(p);
      }
      next.settings.mediaGeneration = generation;
      next.outbox = [
        {
          id,
          reason: "restore",
          scheduleId: null,
          createdAt: now,
          processedAt: null,
        },
      ];
      Object.assign(current, next);
    });
    committed = true;
  } finally {
    if (!committed) await media.removeGeneration(generation);
  }
}
