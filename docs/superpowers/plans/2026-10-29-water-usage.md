# Monthly water usage implementation plan

> Use superpowers:executing-plans to implement this approved design in this session.

**Goal:** Configure currency and water price, and show current-month replacement litres and estimated cost.

**Architecture:** Save a nullable water-rate object in SQLite settings. Add optional log capacity snapshots with a version-4 migration; SQL aggregates full local-month history. Existing logs use current capacity and are marked estimated. Keep backup formats 1/2 readable with optional additive fields.

**Tech stack:** Existing Expo, TypeScript, SQLite, Intl and native UI primitives.

- [x] Add failing SQLite/service tests for full-month aggregation, snapshots, unknown volumes, local boundaries, archived tanks, edits/deletion and rate validation/persistence. Add backup compatibility tests.
- [x] Implement `src/domain/water-usage.ts` rate validation/cost helpers; extend models/schema/store/service and backup validation/restore. Run targeted tests.
- [x] Add all eleven translations. Build Settings controls in a focused `WaterRateSettings` component; add a dashboard card with loading/error/retry/incomplete states. Use existing tokens and RTL controls.
- [x] Run typecheck, regression tests, formatting and bundle export; inspect native UI without deleting or resetting user data. Obtain one independent review, fix material findings and document validation.

## Review focus

Queries must use full SQLite history, not dashboard summaries. Preserve unknown vs legacy capacities (undefined legacy, null known missing); preserve saved capacity on normal log edits. Do not trust snapshot fields supplied by forms. Preserve water-rate settings during backup restore. A saved zero rate must differ from unset. Currency codes must be supported, finite rates nonnegative, denominator only 1 or 1000. Loading failures must not show zero consumption. Current local date determines the month, independent of UTC log timestamp.

## Ledger

User approved design and selectable currency with per-litre/per-1000-litre input. Initial currency AUD; no cost calculated until saved. Execute inline under existing implementation authorization; no further plan approval needed.

Validation: typecheck and 64 tests pass; Prettier clean; iOS and Android Hermes exports pass. Native iOS verified rate save, per-unit conversion, AUD and VND cost formatting, persisted rate after full restart, Arabic RTL dashboard and Vietnamese settings. Example rates were cleared and Vietnamese restored. Review found no material defects; added populated schema-3 migration, snapshot backup and activity-type-change tests in response to coverage feedback. Native Android visual check not performed.
