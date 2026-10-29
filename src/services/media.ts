import { UserFacingError } from "../domain/error";
import { t as tr } from "../i18n";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { Directory, File, Paths } from "expo-file-system";
import { randomUUID } from "expo-crypto";
import type { Photo } from "../domain/models";
export const documentFile = (relative: string) =>
  new File(Paths.document, relative);
export async function pickTankPhoto(camera = false): Promise<Photo | null> {
  // The system photo picker grants access only to selected images; no library-wide permission is needed.
  if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted)
    throw new UserFacingError("messages.photoAccessHasNotBeenGrantedYouCan");
  const result = camera
    ? await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 1,
      })
    : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
  if (result.canceled) return null;
  const asset = result.assets[0]!;
  const resize =
    asset.width > 1600 || asset.height > 1600
      ? [
          {
            resize:
              asset.width >= asset.height
                ? {
                    width: 1600,
                  }
                : {
                    height: 1600,
                  },
          },
        ]
      : [];
  const image = await manipulateAsync(asset.uri, resize, {
    compress: 0.82,
    format: SaveFormat.JPEG,
  });
  const dir = new Directory(Paths.document, "photos");
  dir.create({
    intermediates: true,
    idempotent: true,
  });
  const id = randomUUID(),
    relativePath = `photos/${id}.jpg`;
  const file = documentFile(relativePath);
  new File(image.uri).copy(file);
  return {
    id,
    relativePath,
    mimeType: "image/jpeg",
    width: image.width,
    height: image.height,
    byteSize: file.size,
    createdAt: new Date().toISOString(),
  };
}
export function photoUri(photo?: Photo): string | undefined {
  if (!photo) return;
  try {
    const f = documentFile(photo.relativePath);
    return f.exists ? f.uri : undefined;
  } catch {
    return;
  }
}
export function cleanUnusedPhotos(used: Photo[]) {
  const referenced = new Set(used.map((p) => p.relativePath));
  const root = new Directory(Paths.document);
  for (const dir of root.list()) {
    if (
      dir instanceof Directory &&
      (dir.name === "photos" || dir.name.startsWith("generation-"))
    ) {
      for (const f of dir.list())
        if (f instanceof File && !referenced.has(`${dir.name}/${f.name}`))
          f.delete();
      if (dir.name.startsWith("generation-") && dir.list().length === 0)
        dir.delete();
    }
  }
}
