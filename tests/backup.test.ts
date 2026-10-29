import { languageOptions } from "../src/i18n";
import { test } from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8, unzipSync } from "fflate";
import { emptyData } from "../src/domain/models";
import {
  encodeBackup,
  decodeBackup,
  validateData,
} from "../src/services/backup-format";
const tid = "11111111-1111-4111-8111-111111111111",
  pid = "22222222-2222-4222-8222-222222222222";
function fixture() {
  const d = emptyData();
  d.tanks.push({
    id: tid,
    name: "Bể tép",
    description: "",
    waterType: "freshwater",
    groupName: "Kệ A",
    volumeLitres: 30,
    coverPhotoId: pid,
    archivedAt: null,
    createdAt: "2026-10-28T00:00:00Z",
    updatedAt: "2026-10-28T00:00:00Z",
  });
  d.photos.push({
    id: pid,
    relativePath: "photos/test.jpg",
    mimeType: "image/jpeg",
    width: 1,
    height: 1,
    byteSize: 4,
    createdAt: "2026-10-28T00:00:00Z",
  });
  return d;
}
const image = new Uint8Array([255, 216, 255, 217]);
test("backup round trip preserves Unicode metadata, photo bytes, excludes notification identifiers", () => {
  const bytes = encodeBackup(
    fixture(),
    { "photos/test.jpg": image },
    "2026-10-28T10:00:00Z",
  );
  const p = decodeBackup(bytes);
  assert.equal(p.data.tanks[0]?.name, "Bể tép");
  assert.deepEqual(p.files["photos/" + pid + ".jpg"], image);
  assert.equal(p.manifest.counts.photos, 1);
  assert.equal(p.data.jobs.length, 0);
});
test("tampered data checksum and missing images are rejected", () => {
  assert.throws(() => encodeBackup(fixture(), {}, "2026-10-28T10:00:00Z"));
  const files = unzipSync(
    encodeBackup(
      fixture(),
      { "photos/test.jpg": image },
      "2026-10-28T10:00:00Z",
    ),
  );
  files["data.json"] = strToU8("{}");
  assert.throws(() => decodeBackup(zipSync(files)));
});
test("unsafe ZIP paths and unsupported backup versions fail before replacement", () => {
  assert.throws(() => decodeBackup(zipSync({ "../escape": strToU8("bad") })));
  const files = unzipSync(
    encodeBackup(
      fixture(),
      { "photos/test.jpg": image },
      "2026-10-28T10:00:00Z",
    ),
  );
  const m = JSON.parse(new TextDecoder().decode(files["manifest.json"]));
  m.formatVersion = 999;
  files["manifest.json"] = strToU8(JSON.stringify(m));
  assert.throws(() => decodeBackup(zipSync(files)));
});
test("schema rejects bad enums, duplicate IDs, invalid relations and impossible dates", () => {
  const d = fixture();
  d.tanks[0]!.waterType = "invalid" as any;
  assert.throws(() => validateData(d));
  const dup = fixture();
  dup.tanks.push({ ...dup.tanks[0]! });
  assert.throws(() => validateData(dup));
  const orphan = fixture();
  orphan.tanks[0]!.coverPhotoId = "33333333-3333-4333-8333-333333333333";
  assert.throws(() => validateData(orphan));
  const dates = fixture();
  dates.tanks[0]!.createdAt = "2026-02-30T00:00:00Z";
  assert.throws(() => validateData(dates));
});
test("restore stages photos and rolls back data plus generation when a write fails", async () => {
  const { restoreTransaction } =
    await import("../src/services/restore-transaction");
  const original = fixture();
  let current = structuredClone(original);
  const store = {
    read: async () => structuredClone(current),
    write: async <T>(fn: (d: typeof current) => T | Promise<T>) => {
      const copy = structuredClone(current);
      const result = await fn(copy);
      current = copy;
      return result;
    },
  };
  const files = new Map<string, Uint8Array>([["photos/test.jpg", image]]);
  let recovery: Uint8Array | undefined,
    removed = false;
  const preview = decodeBackup(
    encodeBackup(
      fixture(),
      { "photos/test.jpg": image },
      "2026-10-28T10:00:00Z",
    ),
  );
  preview.data.tanks[0]!.name = "Bể mới";
  await assert.rejects(
    restoreTransaction(
      store,
      preview,
      {
        read: async (path) => files.get(path)!,
        write: async () => {
          throw Error("disk full");
        },
        createGeneration: async () => {},
        removeGeneration: async () => {
          removed = true;
        },
        writeRecovery: async (bytes) => {
          recovery = bytes;
        },
      },
      "generation-test",
      "2026-10-28T10:00:00Z",
      "restore",
    ),
  );
  assert.equal(current.tanks[0]?.name, "Bể tép");
  assert.ok(files.has("photos/test.jpg"));
  assert.equal(removed, true);
  assert.equal(decodeBackup(recovery!).data.tanks[0]?.name, "Bể tép");
});
test("backup retains language, accepts legacy backups without it and rejects unsupported languages", () => {
  const d = fixture();
  for (const [language] of languageOptions) {
    d.settings.language = language;
    assert.equal(
      decodeBackup(
        encodeBackup(d, { "photos/test.jpg": image }, "2026-10-28T10:00:00Z"),
      ).data.settings.language,
      language,
    );
  }
  delete (d.settings as Partial<typeof d.settings>).language;
  assert.equal(
    decodeBackup(
      encodeBackup(d, { "photos/test.jpg": image }, "2026-10-28T10:00:00Z"),
    ).data.settings.language,
    "vi",
  );
  d.settings.language = "unsupported" as any;
  assert.throws(() =>
    encodeBackup(d, { "photos/test.jpg": image }, "2026-10-28T10:00:00Z"),
  );
});
test("backup round trip includes dimensions, sump litres and both filters", () => {
  const d = fixture();
  Object.assign(d.tanks[0]!, {
    lengthCm: 100,
    widthCm: 40,
    heightCm: 50,
    volumeLitres: 200,
    hasSump: true,
    sumpVolumeLitres: 60,
    hasCanister: true,
  });
  const preview = decodeBackup(
    encodeBackup(d, { "photos/test.jpg": image }, "2026-10-28T10:00:00Z"),
  );
  assert.equal(preview.manifest.formatVersion, 2);
  assert.equal(preview.data.tanks[0]?.lengthCm, 100);
  assert.equal(preview.data.tanks[0]?.volumeLitres, 200);
  assert.equal(preview.data.tanks[0]?.hasSump, true);
  assert.equal(preview.data.tanks[0]?.hasCanister, true);
  assert.equal(preview.data.tanks[0]?.sumpVolumeLitres, 60);
});
test("backup validation rejects inconsistent geometric volume, partial dimensions and stray sump volume", () => {
  const d = fixture();
  Object.assign(d.tanks[0]!, {
    lengthCm: 100,
    widthCm: 40,
    heightCm: 50,
    volumeLitres: 999,
  });
  assert.throws(() => validateData(d));
  Object.assign(d.tanks[0]!, { volumeLitres: 200, heightCm: null });
  assert.throws(() => validateData(d));
  Object.assign(d.tanks[0]!, {
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    hasSump: false,
    sumpVolumeLitres: 10,
  });
  assert.throws(() => validateData(d));
});
test("legacy format 1 backup keeps volume and defaults new dimensions and filters", async () => {
  const { createHash } = await import("node:crypto");
  const files = unzipSync(
    encodeBackup(
      fixture(),
      { "photos/test.jpg": image },
      "2026-10-28T10:00:00Z",
    ),
  );
  const data = JSON.parse(new TextDecoder().decode(files["data.json"]));
  for (const tank of data.tanks)
    for (const field of [
      "lengthCm",
      "widthCm",
      "heightCm",
      "hasSump",
      "sumpVolumeLitres",
      "hasCanister",
    ])
      delete tank[field];
  files["data.json"] = strToU8(JSON.stringify(data));
  const manifest = JSON.parse(new TextDecoder().decode(files["manifest.json"]));
  manifest.formatVersion = 1;
  const entry = manifest.files.find(
    (f: { path: string }) => f.path === "data.json",
  );
  entry.size = files["data.json"].length;
  entry.sha256 = createHash("sha256").update(files["data.json"]).digest("hex");
  files["manifest.json"] = strToU8(JSON.stringify(manifest));
  const restored = decodeBackup(zipSync(files)).data.tanks[0]!;
  assert.equal(restored.volumeLitres, 30);
  assert.equal(restored.lengthCm, null);
  assert.equal(restored.hasSump, false);
  assert.equal(restored.hasCanister, false);
});
