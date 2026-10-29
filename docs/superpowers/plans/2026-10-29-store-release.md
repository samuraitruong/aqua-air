# Local release and store readiness implementation plan

> Use superpowers:executing-plans for inline implementation; requesting-code-review for independent review.

**Goal:** Provide local signed release commands and evidence-based Apple/Google readiness checks without publishing or inventing publisher details.

**Architecture:** Keep Expo app config authoritative, apply repeatable Android signing through a config plugin, read public publisher URLs from release/store.json, keep credentials only in environment/keychains. A Node CLI orchestrates native tools without shell interpolation. Release preflight rejects incomplete publisher details; unsigned iOS compilation is available for verification only.

**Tech stack:** Existing Expo 55, Node/TypeScript, Xcode 26+, JDK 17, Android SDK/Gradle.

- [x] Verify current official Apple/Google/Expo requirements and inspect permission/privacy manifests, toolchain and dependencies.
- [x] Add failing tests for metadata URL/build validation and Android signing transformation (no debug signing on release, idempotent generation, missing credentials fail closed).
- [x] Add CLI commands for check, URL verification, native prebuild, iOS archive/export/unsigned verification, Android AAB/APK. Add config for explicit build numbers, privacy disclosures, permission minimization and signing plugin. Ignore secrets/build artifacts.
- [x] Fix unnecessary full-photo-library permission requests; expose configured public privacy/support links in Settings and local privacy explanation; translate link/error labels across eleven catalogs.
- [x] Add release instructions, publisher privacy-policy draft and review notes, source-linked audit including unresolved account/device/store-console items. Verify tests, formatting, Expo config/prebuild, real Release compile where toolchain permits, and script failure paths. Independent reviewer checks code, followed by fixes for material findings.

## Review focus

No automatic submission; no debug keystore accepted as release artifact; secrets absent from config, commands and logs; regenerating native folders retains signing/privacy changes; blocked build correctly reports missing publisher/signing settings rather than claiming store readiness; policy claims distinguish local-only data from user exports/OS backups. UI links cannot silently fail.

## Scope updates and evidence

User supplied publisher Truong Nguyen, samuraitruong@hotmail.com and aquaair.truongthings.site, then explicitly requested an undeployed static web/ folder. Added overview, privacy and support pages with those details and configured their .html URLs in the app. Source checks cover local links and contact consistency. Browser tested all pages at 320/375/414/768 px with no overflowing elements.

Dependency audit found fflate 0.8.2 ZIP64 hang advisory, fixed with 0.8.3. Added malformed native-link guard before the legacy router decoder; remaining upstream decoder/tooling advisories are documented. Added expo-system-ui matching SDK55 to apply configured Android light UI.

Both native prebuilds succeed. iOS Release compilation and Android manifest task stopped on disk exhaustion. Removed only this run's iOS archive intermediates (about 1 GiB); added a tested >=8 GiB disk-space guard. No signed artifact/upload. Physical-device QA remains required.

Final: 71 tests and typecheck/format/preflight pass. Both generated native projects inspected. Browser verification succeeded after freeing own archive output and starting authorized loopback preview. Final signed artifacts not produced because of disk/signing prerequisites; reported in audit. Whole-workflow independent review found no material defect; corrected TestFlight/upload order and stale documentation. Site remains undeployed as requested.
