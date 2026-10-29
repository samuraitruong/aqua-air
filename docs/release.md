# Local store release builds

These commands build on your computer. They do not upload, submit, roll out, reset app data or create signing credentials. Native folders are generated; change app.json/app.config.ts/plugins, not generated signing files.

## One-time setup

- `npm ci` (Node 22+, the lockfile is authoritative).
- iOS: macOS, Xcode 26+ with iOS 26+ SDK, Xcode command-line tools, CocoaPods and an Apple Developer membership. Open Xcode once, finish its setup, add your developer account and register `com.aquaair.app` in your team/App Store Connect. Check `xcodebuild -version` and `xcodebuild -showsdks`.
- Android: JDK 17 and Android Studio SDK with platform 36, build tools 36, platform tools and the NDK/CMake versions requested by the generated project. Set `ANDROID_HOME` to the SDK path (typically `$HOME/Library/Android/sdk` on macOS). Accept the SDK licenses through Android Studio or `sdkmanager --licenses`.
- Keep at least 8 GiB of free disk space before a native release build; 15–20 GiB is recommended. The scripts check the filesystem before building. The 2026-10-29 verification run hit disk exhaustion and did not produce a validated native release artifact.
- Both application IDs currently use `com.aquaair.app`. Confirm availability/ownership before first upload; keep them stable afterwards.
- Fill `release/store.json` with your actual publisher name and final public HTTPS privacy/support URLs. These are public build configuration, not secrets. The prepared website is in `web/`: review and deploy its contents to `https://aquaair.truongthings.site` before release. `release/store.json` already contains the publisher and /privacy.html and /support.html URLs. Support page must provide a working contact mechanism. The policy and listing must identify the same publisher/app. No login, placeholder domains, redirects or PDFs for these configured URLs.

## Quality and metadata

```sh
npm run release:help
npm run release:check
npm run release:check:links
```

`release:check` runs TypeScript, all tests, formatting and metadata validation. It validates the configured publisher details (already filled for Truong Nguyen). Link checks require the configured HTTPS pages to return HTML directly; they do not prove policy wording is adequate. Review the actual pages and store declarations yourself.

Before each upload, increase the build number; the same value sets iOS CFBundleVersion and Android versionCode:

```sh
export AQUAAIR_BUILD_NUMBER=1
```

Use 2, 3, etc. for subsequent uploads, including TestFlight/internal-track builds. The script cannot know what you already uploaded. For a new marketing version, update `expo.version` in app.json and `version` in package.json. Settings reads the bundled version dynamically.

## iOS: signed archive and IPA

Configure your distribution certificate and provisioning profile in Xcode/Keychain. The team ID is the 10-character ID from your Apple Developer membership, not the numeric App Store app ID.

```sh
export AQUAAIR_APPLE_TEAM_ID=YOURTEAMID
npm run release:prepare:ios
npm run release:ios:archive
npm run release:ios:export
# Or archive and export in one command:
npm run release:ios
```

Outputs: `build/ios/AquaAir.xcarchive` and IPA in `build/ios/export/`. Existing archives are not overwritten. Move old artifacts aside before another archive. The export uses `app-store-connect`, automatic signing, and `destination=export` so it does not upload. The archive contains embedded production JS; Metro is not required to run it.

If profiles must be downloaded/refreshed, explicitly enable Xcode's account provisioning access:

```sh
export AQUAAIR_ALLOW_PROVISIONING_UPDATES=1
npm run release:ios
```

This requires the account already configured in Xcode. For manually managed enterprise signing or multiple targets, use Xcode Organizer with the appropriate profiles instead of changing the template blindly.

Compile an **unsigned, non-submittable** Release archive to check compilation without Apple credentials:

```sh
npm run release:ios:verify
```

Output: `build/ios/AquaAir-unsigned.xcarchive`. This bypasses publisher/signing prerequisites only for compile verification. It is not an IPA, cannot be installed as a normal device app, and cannot be submitted. The signed workflow never uses it. Archive and IPA should be from the same source, marketing version and build number; do not change configuration between archive/export.

Upload the signed build with Xcode Organizer or Transporter, then review it through TestFlight before submitting it for App Review. Uploading and submitting are separate actions and are not performed by these commands.

## Android: upload key, AAB and APK

Create a dedicated upload key **once**, outside this repository. Reuse your existing upload key if the app is already registered; do not replace it on each build. Back it up securely. Run the following yourself; keytool prompts for passwords and identity:

```sh
mkdir -p "$HOME/.aquaair-signing"
keytool -genkeypair -v -storetype PKCS12 \
  -keystore "$HOME/.aquaair-signing/aquaair-upload.p12" \
  -alias aquaair-upload -keyalg RSA -keysize 2048 -validity 10000
```

Set the following in your shell or a secure local environment loader. Do not put passwords in command arguments, app.json, release/store.json, source control or logs. The scripts do not automatically source `.env` files.

```sh
export AQUAAIR_ANDROID_KEYSTORE="$HOME/.aquaair-signing/aquaair-upload.p12"
export AQUAAIR_ANDROID_KEY_ALIAS=aquaair-upload
# Set AQUAAIR_ANDROID_KEYSTORE_PASSWORD and AQUAAIR_ANDROID_KEY_PASSWORD
# through your password manager or an interactive shell prompt.
export ANDROID_HOME="$HOME/Library/Android/sdk"
npm run release:prepare:android
npm run release:android:aab
npm run release:android:apk
```

For a simple interactive **zsh** prompt that avoids password history:

```sh
read -rs 'AQUAAIR_ANDROID_KEYSTORE_PASSWORD?Keystore password: '; print
export AQUAAIR_ANDROID_KEYSTORE_PASSWORD
read -rs 'AQUAAIR_ANDROID_KEY_PASSWORD?Key password: '; print
export AQUAAIR_ANDROID_KEY_PASSWORD
```

Outputs: `build/android/AquaAir-<buildNumber>.aab` for Google Play and `.apk` for local physical-device testing. The generated Gradle release type uses `signingConfigs.release`, not the debug certificate. Both script and Gradle reject missing signing credentials. Native prebuild preserves this via `plugins/release-signing.cjs`. APKs signed by the upload key may not update installations signed by Google Play's app signing key; use internal testing for update compatibility checks.

Inspect the final artifact before upload:

```sh
jarsigner -verify -verbose -certs build/android/AquaAir-1.aab
# Replace the build-tools directory if your installed version differs:
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --print-certs build/android/AquaAir-1.apk
"$ANDROID_HOME/build-tools/36.0.0/zipalign" -c -P 16 -v 4 build/android/AquaAir-1.apk
# With Google's bundletool installed:
java -jar /absolute/path/to/bundletool.jar dump config \
  --bundle=build/android/AquaAir-1.aab
```

Confirm 16 KB alignment in the final AAB-generated APKs and all packaged native libraries, then run on a 16 KB emulator/device. zipalign checks ZIP layout only; it does not certify ELF segment alignment or device behavior. Follow the linked Android guide in `docs/store-readiness.md` for ELF verification. The current RN template uses AGP 8.12 and an appropriate modern NDK, but source versions alone do not certify the resulting artifact.

Enroll in Play App Signing and upload the AAB manually to Play Console's internal test track. Do not use a debug keystore for store releases. The CLI also reads the public signing certificate with keytool and rejects the standard Android Debug certificate. New personal accounts may require 12 continuously opted-in testers for 14 days before applying for production access.

## What remains before submission

Follow `docs/store-readiness.md` and `docs/store-review-notes.md`. Physical-device release QA, public policy/support pages, truthful privacy/age/content declarations, screenshots, developer identity, signing and store account configuration are required. A passing command or source review cannot guarantee either store's approval.

Official build instructions: [Expo local production builds](https://docs.expo.dev/guides/local-app-production/), [Android app signing](https://developer.android.com/studio/publish/app-signing).

The existing eas.json profiles are not used by these local commands. EAS is optional and requires separate account/credential setup; this release-signing plugin expects the documented local signing environment. Do not assume the legacy EAS profiles are validated for cloud builds.
