import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  copyFileSync,
  statfsSync,
} from "node:fs";
import { X509Certificate } from "node:crypto";
import { resolve, basename } from "node:path";
import {
  readStoreMetadata,
  validateStoreMetadata,
  validateBuildNumber,
  assertReleaseDiskSpace,
  assertUploadCertificate,
} from "./release-config";
const root = resolve(__dirname, "..");
const output = resolve(root, "build");
const command = process.argv[2] ?? "help";
function run(
  binary: string,
  args: string[],
  cwd = root,
  extra: Partial<NodeJS.ProcessEnv> = {},
) {
  const result = spawnSync(binary, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ...extra },
  });
  if (result.error)
    throw new Error(
      `Could not run ${basename(binary)}: ${result.error.message}`,
    );
  if (result.status !== 0)
    throw new Error(
      `${basename(binary)} failed (status ${result.status ?? result.signal}).`,
    );
}
function expo(args: string[]) {
  run(process.execPath, [resolve(root, "node_modules/expo/bin/cli"), ...args]);
}
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name}; see docs/release.md.`);
  return value;
}
function metadata() {
  const store = readStoreMetadata();
  validateStoreMetadata(store);
  validateBuildNumber(process.env.AQUAAIR_BUILD_NUMBER ?? "1");
  return store;
}
async function verifyLinks() {
  const store = metadata();
  for (const key of ["privacyPolicyUrl", "supportUrl"] as const) {
    const response = await fetch(store[key], {
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    }).catch(() => {
      throw new Error(
        `${key} is not reachable at ${store[key]}. Deploy web/ with HTTPS first, then retry release:check:links.`,
      );
    });
    if (
      !response.ok ||
      !/text\/html/i.test(response.headers.get("content-type") ?? "")
    )
      throw new Error(
        `${key} must return a public HTML page directly (HTTP ${response.status}); use its final URL.`,
      );
    await response.body?.cancel();
    console.log(
      `${key}: HTTP ${response.status} HTML verified. Review its actual content before submission.`,
    );
  }
}
function quality() {
  run("npm", ["run", "check"]);
  run("npm", ["run", "format:check"]);
}
function prepare(platform: "ios" | "android") {
  if (platform === "ios" && process.platform !== "darwin")
    throw new Error("iOS release builds require macOS with Xcode.");
  expo(["prebuild", "--platform", platform, "--no-install"]);
  if (platform === "ios") run("pod", ["install"], resolve(root, "ios"));
}
function team() {
  const id = required("AQUAAIR_APPLE_TEAM_ID");
  if (!/^[A-Z0-9]{10}$/.test(id))
    throw new Error(
      "AQUAAIR_APPLE_TEAM_ID must be the 10-character Apple team ID.",
    );
  return id;
}
function ensureDiskSpace() {
  const disk = statfsSync(root);
  assertReleaseDiskSpace(Number(disk.bavail) * Number(disk.bsize));
}
function archive(signed: boolean) {
  ensureDiskSpace();
  const id = signed ? team() : null;
  prepare("ios");
  mkdirSync(resolve(output, "ios"), { recursive: true });
  const archivePath = resolve(
    output,
    "ios",
    `AquaAir${signed ? "" : "-unsigned"}.xcarchive`,
  );
  if (existsSync(archivePath))
    throw new Error(
      `Archive already exists: ${archivePath}. Move it aside before building again.`,
    );
  run(
    "xcodebuild",
    [
      "-workspace",
      "ios/AquaAir.xcworkspace",
      "-scheme",
      "AquaAir",
      "-configuration",
      "Release",
      "-destination",
      "generic/platform=iOS",
      "-archivePath",
      archivePath,
      "archive",
      ...(signed
        ? [
            "CODE_SIGN_STYLE=Automatic",
            `DEVELOPMENT_TEAM=${id}`,
            ...(process.env.AQUAAIR_ALLOW_PROVISIONING_UPDATES === "1"
              ? ["-allowProvisioningUpdates"]
              : []),
          ]
        : ["CODE_SIGNING_ALLOWED=NO"]),
    ],
    root,
    { NODE_ENV: "production" },
  );
  console.log(
    `${signed ? "Signed" : "UNSIGNED verification-only"} archive: ${archivePath}`,
  );
}
function exportIpa() {
  const id = team(),
    archivePath = resolve(output, "ios/AquaAir.xcarchive");
  if (!existsSync(archivePath))
    throw new Error("Run release:ios:archive first.");
  const options = resolve(output, "ios/ExportOptions.plist");
  writeFileSync(
    options,
    `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>method</key><string>app-store-connect</string><key>destination</key><string>export</string><key>teamID</key><string>${id}</string><key>signingStyle</key><string>automatic</string><key>manageAppVersionAndBuildNumber</key><false/></dict></plist>`,
  );
  run("xcodebuild", [
    "-exportArchive",
    "-archivePath",
    archivePath,
    "-exportPath",
    resolve(output, "ios/export"),
    "-exportOptionsPlist",
    options,
    ...(process.env.AQUAAIR_ALLOW_PROVISIONING_UPDATES === "1"
      ? ["-allowProvisioningUpdates"]
      : []),
  ]);
  console.log("IPA exported to build/ios/export. Nothing uploaded.");
}
function android(kind: "aab" | "apk") {
  const path = resolve(required("AQUAAIR_ANDROID_KEYSTORE"));
  for (const key of [
    "AQUAAIR_ANDROID_KEYSTORE_PASSWORD",
    "AQUAAIR_ANDROID_KEY_ALIAS",
    "AQUAAIR_ANDROID_KEY_PASSWORD",
  ])
    required(key);
  if (
    !existsSync(path) ||
    basename(path).toLowerCase() === "debug.keystore" ||
    process.env.AQUAAIR_ANDROID_KEY_ALIAS === "androiddebugkey"
  )
    throw new Error(
      "Supply an existing production upload keystore, not the debug key.",
    );
  const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  if (!sdk || !existsSync(resolve(sdk, "platforms/android-36")))
    throw new Error(
      "Set ANDROID_HOME to an SDK containing Android platform 36 and build tools 36.",
    );
  const certificate = spawnSync(
    "keytool",
    [
      "-exportcert",
      "-rfc",
      "-keystore",
      path,
      "-alias",
      required("AQUAAIR_ANDROID_KEY_ALIAS"),
      "-storepass:env",
      "AQUAAIR_ANDROID_KEYSTORE_PASSWORD",
    ],
    { encoding: "utf8", env: process.env },
  );
  if (certificate.status !== 0)
    throw new Error(
      "Could not read the upload certificate. Check the keystore, alias and password.",
    );
  assertUploadCertificate(new X509Certificate(certificate.stdout).subject);
  ensureDiskSpace();
  prepare("android");
  run(
    "./gradlew",
    [
      kind === "aab" ? ":app:bundleRelease" : ":app:assembleRelease",
      "--no-daemon",
    ],
    resolve(root, "android"),
    { NODE_ENV: "production", AQUAAIR_ANDROID_KEYSTORE: path },
  );
  mkdirSync(resolve(output, "android"), { recursive: true });
  const native =
    kind === "aab"
      ? "bundle/release/app-release.aab"
      : "apk/release/app-release.apk";
  const target = resolve(
    output,
    `android/AquaAir-${validateBuildNumber(process.env.AQUAAIR_BUILD_NUMBER ?? "1")}.${kind}`,
  );
  if (existsSync(target))
    throw new Error(
      `Output exists: ${target}. Keep old artifacts or increment the build number.`,
    );
  copyFileSync(resolve(root, "android/app/build/outputs", native), target);
  console.log(`Signed ${kind.toUpperCase()}: ${target}. Nothing uploaded.`);
}
async function main() {
  try {
    switch (command) {
      case "help":
        console.log(
          "See docs/release.md. Commands: check, links, prepare-ios, prepare-android, ios-verify, ios-archive, ios-export, android-aab, android-apk. No command publishes.",
        );
        break;
      case "check":
        quality();
        metadata();
        console.log(
          "Source checks and publisher metadata pass. Next run release:check:links and the physical-device checklist.",
        );
        break;
      case "links":
        await verifyLinks();
        break;
      case "prepare-ios":
        prepare("ios");
        break;
      case "prepare-android":
        prepare("android");
        break;
      case "ios-verify":
        quality();
        archive(false);
        break;
      case "ios-archive":
        quality();
        await verifyLinks();
        archive(true);
        break;
      case "ios-export":
        metadata();
        exportIpa();
        break;
      case "android-aab":
        quality();
        await verifyLinks();
        android("aab");
        break;
      case "android-apk":
        quality();
        await verifyLinks();
        android("apk");
        break;
      default:
        throw new Error(`Unknown release command: ${command}`);
    }
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Release command failed.",
    );
    process.exitCode = 1;
  }
}
void main();
