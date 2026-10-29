import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validateStoreMetadata,
  validateBuildNumber,
  isPublicHttpsUrl,
} from "../scripts/release-config";
import { configureReleaseSigning } from "../plugins/release-signing.cjs";
test("release metadata fails closed for missing publisher, private or placeholder URLs", () => {
  for (const url of [
    "",
    "http://app.com/privacy",
    "https://example.com/privacy",
    "https://localhost/privacy",
    "https://127.0.0.1/privacy",
    "https://192.168.1.10/privacy",
    "https://user:pass@aquair.app/privacy",
  ])
    assert.equal(isPublicHttpsUrl(url), false, url);
  assert.equal(isPublicHttpsUrl("https://aquaair.app/privacy"), true);
  assert.throws(() =>
    validateStoreMetadata({
      publisher: "",
      privacyPolicyUrl: "",
      supportUrl: "",
    }),
  );
  assert.doesNotThrow(() =>
    validateStoreMetadata({
      publisher: "Aqua Air Studio",
      privacyPolicyUrl: "https://aquaair.app/privacy",
      supportUrl: "https://aquaair.app/support",
    }),
  );
  for (const n of ["0", "-1", "1.2", "abc", "2100000001"])
    assert.throws(() => validateBuildNumber(n));
  assert.equal(validateBuildNumber("42"), 42);
});
test("release signing generation replaces debug signing and survives repeated prebuild without embedding secrets", () => {
  const source = `android {\n signingConfigs {\n debug { storeFile file('debug.keystore') }\n }\n buildTypes {\n debug { signingConfig signingConfigs.debug }\n release {\n signingConfig signingConfigs.debug\n minifyEnabled false\n }\n }\n}`;
  const generated = configureReleaseSigning(source);
  assert.match(generated, /release \{\s*signingConfig signingConfigs.release/);
  assert.match(
    generated,
    /System.getenv\('AQUAAIR_ANDROID_KEYSTORE_PASSWORD'\)/,
  );
  assert.match(generated, /Missing Android release signing credentials/);
  assert.equal(configureReleaseSigning(generated), generated);
  assert.throws(() => configureReleaseSigning("unrecognized gradle template"));
});
test("release photo picking never requests broad photo-library permission", () => {
  const media = readFileSync("src/services/media.ts", "utf8");
  assert.doesNotMatch(media, /requestMediaLibraryPermissionsAsync/);
  assert.match(media, /requestCameraPermissionsAsync/);
});

test("release CLI runs help without signing credentials or native side effects", async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/release.ts", "help"],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /No command publishes/);
});

test("release builds reject insufficient disk space and Android debug certificates", async () => {
  const { assertReleaseDiskSpace, assertUploadCertificate } =
    await import("../scripts/release-config");
  assert.throws(() => assertReleaseDiskSpace(1024 ** 3), /disk space/);
  assert.doesNotThrow(() => assertReleaseDiskSpace(20 * 1024 ** 3));
  assert.throws(
    () => assertUploadCertificate("CN=Android Debug\nO=Android\nC=US"),
    /debug certificate/,
  );
  assert.doesNotThrow(() =>
    assertUploadCertificate("CN=Truong Nguyen\nO=Aqua Air"),
  );
});
