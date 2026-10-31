# Tank insights and journal implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Deliver all five approved offline features, with PDF reports replacing HTML exports.
**Architecture:** Extend AppData/SqlStore, existing snapshot transactions, photo storage and backup staging. Focused insights domain/service/UI modules reuse existing components, SVG and share APIs. Use Expo Print for PDF.
**Tech Stack:** TypeScript, React Native/Expo 55, SQLite, react-native-svg, expo-print.
**Spec:** docs/superpowers/specs/2026-10-31-tank-insights-journal-design.md

## Global constraints

- Offline SQLite; preserve existing records and original Design files.
- All 11 languages, Vietnamese default, locale dates/numbers and RTL.
- Backups read versions 1–3; write new format with complete new entities/photos.
- Charts/exports query complete ranges, not one page. User targets are not safety advice.
- No deployment, push, or automatic commits.

## Review focus

- Restore/covers/journal photo cleanup must retain all referenced files.
- Filtered preset forms cannot silently lose typed measurement values.
- Sparse/constant chart series and timezone boundaries must remain truthful.
- User text in CSV/PDF must not become spreadsheet formulas or markup.
- Large histories must export fully and keep chart rendering bounded.

### Task 1: Persistence and domain

Files: src/domain/models.ts, src/domain/tank-insights.ts, src/repositories/schema.ts, src/repositories/store.ts, src/services/tank-insights.ts, src/services/care.ts, tests/tank-insights.test.ts.
Interfaces: AppData collections readingPresets, waterTargets, tankPreferences, journalEntries; TankInsightsService(store,uuid,clock). Query complete tank range with SqlStore.insightRange(tankId,start,end); journal paginated by SqlStore.journalHistory.
- [x] Write/run failing tests for schema migration, preset/target validation, inclusive status, stale boundaries, chart sampling and journal ownership.
- [x] Implement schema 6, service mutations, range queries and cleanup/reference integration.
- [x] Run focused tests/typecheck; record evidence below.

### Task 2: Backup compatibility

Files: src/services/backup-format.ts, src/services/backup.ts, src/services/insights-validation.ts, tests/tank-insights.test.ts.
Interfaces: validateInsightsData(AppData), format 4 counts; legacy collections normalised only for old formats.
- [x] Write/run failing tests for new data/photo roundtrip, legacy defaults and malformed cross-tank references/counts.
- [x] Implement validation, backup version/counts and photo-omission handling.
- [x] Run backup and focused tests; record evidence.

### Task 3: Presets, targets and charts

Files: app/tank/insights.tsx, app/tank/preferences.tsx, app/water/edit.tsx, src/ui/parameter-chart.tsx, app/tank/[id].tsx.
Interfaces: chartRange(days,now), chartSeries(values), targetStatus(value,target), service preset/target/preference methods.
- [x] Cover preset visibility retaining typed values and chart/date edge cases in domain tests.
- [x] Implement tank actions, preset selection/defaults/CRUD, range editing and accessible SVG charts with markers/statistics/list.
- [x] Verify typecheck and narrow/RTL UI where available.

### Task 4: Photo journal

Files: app/tank/journal.tsx, app/journal/edit.tsx; reuse src/services/media.ts.
Interfaces: journal entry CRUD; existing pickTankPhoto and photoUri; paginated journal query.
- [x] Exercise journal deletion/cover references, archive restrictions and persistence in tests.
- [x] Implement dated editor, full-image view, selection/comparison and paginated list.
- [x] Verify typecheck/tests; record limits of native image-picker testing.

### Task 5: CSV/PDF reports and localisation

Files: src/domain/tank-reports.ts, src/services/tank-reports.ts, app/tank/export.tsx, src/i18n/*.json, package.json/package-lock.json, tests/tank-reports.test.ts.
Interfaces: waterCsv/readings, careCsv/logs; reportHtml(snapshot,labels); shareTankReport(snapshot,kind).
- [x] Write/run failing export completeness, escaping, formula-neutralisation and Unicode tests.
- [x] Install compatible expo-print; implement range preview, local PDF/CSV generation, sharing/cleanup and all locale labels.
- [x] Run full check, formatting, Expo dependency check and both bundle exports; fresh review and fix material issues.

## Execution ledger

- User selected PDF instead of HTML; proceeding within the requested implementation scope.
- Native inline execution; preserve current workspace changes. No commit/push/deployment.

- Persistence, backup, UI and export implementation complete. Added schema 6 and format 4; legacy backups 1–3 read with empty new collections.
- Focused tests observed RED→GREEN for initial domain/service integration, export generation, preset ordering/unit matching, timezone ranges and future journal validation.
- Fresh reviewer identified preset ordering and current-timezone range selection; both fixed with regression tests. Unit target matching also guarded explicitly.
- Ruling: charts query UTC timestamps bounded by current-device local midnights; report exports filter recorded local dates to match history. This preserves historical date labels after timezone travel.
- Local QA build initially failed linking due to a Release React.xcframework with no configuration marker. Replaced through React Native's shipped replace-rncore-version.js with cached Debug framework; native Xcode build then passed. No product dependency patch or tracked native files changed.
- Both platform Hermes exports and Expo dependency compatibility pass. Native QA ongoing; physical devices and native Android remain unverified.

- Final verification: `npm run release:check` passed (91/91 tests, TypeScript strict, Prettier and publisher metadata); `git diff --check` clean. Both final platform bundle exports succeeded.
- Native iPhone 16e / iOS 26.1: populated data migrated to schema 6; default preset created and reopened as blank pH-only form; localized 7,3 measurement saved; personal 6,5–7,5 pH target saved and displayed on latest results and two-point chart; native PDF generation/share sheet passed; generated 29 KB PDF rasterized with sips and visually inspected; two design images selected with the system picker, journal entries saved and comparison opened; reload retained measurements, targets and journal images. Main iPhone 17 Pro install/data untouched.
- Native QA uncovered raw whitespace strings inside two pagination Views. Added AST regression, observed failure, removed only the invalid View strings and verified pass. Existing unsigned QA notification/keychain development warning was dismissed; no change to notification logic.
- Evidence: artifacts/tank-insights/ios-chart.png, ios-photo-compare.png, qa-report.pdf, qa-report.png. Native Android, physical devices and every-language native visual review still required before release. No commit/push/publication performed.
