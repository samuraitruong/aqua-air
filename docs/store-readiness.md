# Store readiness review — 29 October 2026

**Status: prepared for local release work; not yet ready to submit.** Commands, repeatable native configuration and the static policy/support website are present. Public pages are not deployed. Signing and physical-device release QA remain outstanding. Store approval cannot be guaranteed by a source review.

## Changes and verification

| Area | Evidence / result |
| --- | --- |
| Local builds | npm commands for preflight, URL checks, iOS prebuild/archive/IPA export, unsigned Release verification, Android prebuild/AAB/APK. No command uploads. See [release instructions](release.md). |
| Signing | Android release no longer uses Expo's generated debug signing fallback. Environment-only upload-key configuration survives prebuild; missing values fail. CLI rejects standard debug certificate. iOS team/profile configuration remains owner supplied. |
| Versioning | Explicit marketing version and native build numbers; AQUAAIR_BUILD_NUMBER sets both platforms. Settings reads the actual bundled version. Increase the number for each upload. |
| Publisher access | Settings includes Privacy policy and Help & support, with localized labels/offline explanation in all eleven catalogs. Public URLs point to the prepared website. Failures show a user message. |
| Public website | `web/` is buildless HTML/CSS with overview/privacy/support. Publisher Truong Nguyen; support samuraitruong@hotmail.com. Deploy later to aquaair.truongthings.site. Local link tests and browser checks at 320/375/414/768 px pass without overflowing elements. No scripts, analytics, remote fonts or forms. |
| Optional photos | Removed unnecessary full-library runtime request; selected-images system picker retained. Camera request happens only on taking a photo. Generated Android manifest removes broad media/storage, microphone, overlay and exact-alarm permissions. |
| Native targets | Xcode 26.1 / iOS 26.1 SDK installed. Android compile/target SDK 36 pinned by config plugin; RN template AGP 8.12 / NDK 27.1.12297006. Both Expo prebuilds succeed. Final AAB/APK 16 KB ELF + ZIP alignment still needs artifact/device validation. |
| Privacy manifest | Generated iOS PrivacyInfo.xcprivacy retains dependency required-reason entries; no collected data or tracking declared. Review the final archive's aggregated report rather than relying on this source declaration alone. |
| Reliability | Initial SQLite view must succeed before publishing the store to navigation, preserving the retry screen on initial read failure. Existing transactional persistence and restore rollback tests retained. |
| Dependency hardening | fflate updated 0.8.2 → 0.8.3 for malformed ZIP64 infinite-loop fix. Malformed/oversized external native links are rejected before Expo Router's legacy query decoding. |
| Automated checks | TypeScript, 71-test regression suite (including release guards, CLI smoke, web local links and native-link validation), formatting, local preflight. All 71 tests pass. |
| Actual native compilation | Attempted an unsigned iOS Release archive and Android Gradle manifest check. Both stopped on `No space left on device`; no verified Release archive/AAB/IPA was produced. Temporary iOS archive intermediates were removed; disk guard now requires >=8 GiB free (15–20 GiB recommended). |

## Remaining release gates

1. **Deploy `web/`.** Public privacy/support links cannot pass until HTTPS /privacy.html and /support.html are deployed and reachable. Review support correspondence retention/hosting statements before publication. Do not ship a development message or unreachable policy URL.
2. **Free disk space and build signed artifacts.** Configure Apple team/certificates/profiles and an Android upload key; verify bundle identifiers are yours. Run local release commands, inspect signing/entitlements/version/privacy report, and preserve artifacts for the submitted version.
3. **Run physical-device release QA.** TestFlight/Play internal testing must cover offline cold launch, persistence, image picker/camera permission denial, actual reminder delivery/background/reboot, stale reminders, cross-install backups/restore/deletion, VoiceOver/TalkBack, large text, small screens and RTL. Source tests and JS exports do not replace these checks.
4. **Complete truthful store metadata.** Support contact, privacy disclosures, age/content/target-audience forms, no-ads/app-access declarations, genuine screenshots, encryption answers and applicable publisher/trader identity requirements. [Review notes](store-review-notes.md) supply reproducible reviewer steps.
5. **Resolve/reassess remaining upstream advisories before submission.** Post-fflate npm production audit reports 13 advisories: 3 high, 3 moderate, 7 low. High zod issues are in the installed Expo CLI toolchain; deepmerge is in Expo config. The router's query-string → decode-uri-component is a runtime advisory. The native-link guard reduces the external malformed-input path; it is not a replacement for an upstream dependency fix and does not cover every future use. Patched decoder 0.5 is ESM while query-string 7 expects CommonJS; a blind override risks breaking navigation. Plan a supported Expo/Router update or a reviewed compatible patch, then rerun native builds and deep-link tests. Do not use `npm audit fix --force` to jump/downgrade SDKs.
6. **Account-specific Play production access.** New personal accounts may need the closed-test requirement; follow the actual console status. Check developer verification and any regional requirements shown in your accounts.

## Review findings retained as limitations

- Restore intentionally makes a recovery snapshot first. An unreadable existing photo can block a valid restore before replacement; remove/replace that cover and retry. No current data is replaced on failure. Website help documents this; never reset data just to retry.
- Export opens the OS share sheet and updates the last-export date. The platform share API cannot prove the user saved the file; UI success copy says the share sheet opened. Verify the file exists before relying on a backup. No assertion of completed external storage is made.
- Android native pickers follow OS locale; in-app date labels use selected app locale, while some time-only labels remain fixed HH:mm. This is a localization limitation, not evidence that all native dialogs were localized/tested.

## Current primary policy sources

Checked against the sources below on 29 October 2026. Requirements may change; recheck at actual submission.

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — 2.1 completeness, 2.3 accurate metadata, 5.1.1 accessible privacy policy and accurate data handling; optional permissions must not block the journal.
- [Apple avoiding common review issues](https://developer.apple.com/app-store/review/) — working support and policy URLs, on-device stability, complete reviewer access.
- [Apple SDK minimums](https://developer.apple.com/news/upcoming-requirements/?id=02032026a) — since 28 April 2026, Xcode 26+ / iOS 26+ SDK uploads.
- [Apple App Privacy details](https://developer.apple.com/app-store/app-privacy-details/) — verify final SDK behavior and declarations; public privacy URL required.
- [Google target API policy](https://support.google.com/googleplay/android-developer/answer/11926878) — new apps/updates target Android 16/API 36+ since 31 August 2026 for this phone app.
- [Google User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311) — public policy, publisher/contact, access/use/sharing/security/retention disclosures and accurate Data safety.
- [Google minimum-scope alternatives](https://support.google.com/googleplay/android-developer/answer/16935362) — system photo picker for infrequent selected images instead of broad READ_MEDIA access.
- [Android 16 KB compatibility](https://developer.android.com/guide/practices/page-sizes) — inspect final native artifacts and test devices, not just target SDK.
- [Google personal-account testing](https://support.google.com/googleplay/android-developer/answer/14151465) — applicable accounts require 12 opted-in testers continuously for 14 days before applying for production.
- [Expo local release builds](https://docs.expo.dev/guides/local-app-production/) and [privacy manifests](https://docs.expo.dev/guides/apple-privacy/) — native generation, signing and dependency reasons.
- [fflate advisory and patched versions](https://github.com/advisories/GHSA-px8p-9vwx-vf98), [URI decoder advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) — recorded dependency findings and scope.
