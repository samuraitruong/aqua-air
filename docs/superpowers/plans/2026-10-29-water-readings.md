# Water readings implementation plan

> Use superpowers:executing-plans inline. Use requesting-code-review for an independent final review.

**Goal:** Record built-in/custom water measurements per tank and show latest results and session history.

**Architecture:** Three normalized tables with immutable value labels/units. Dedicated domain validation/service and SQL queries; hooks load bounded data for a focused tank panel and form. Backup format 3 protects new records, while old backups default to empty measurement arrays.

- [x] Write failing SQLite tests for migration/persistence/idempotency, zero/partial input, range/relation/archive validation, custom definitions, latest-per-parameter, pagination, edits/deletes and reset/tank deletion. Test format-3 backup validation/restore and legacy imports.
- [x] Implement models/schema/store/service/queries/backup and run targeted tests.
- [x] Add eleven translations, measurement form and tank panel. Keep unit/date visible and explicit loading/errors. Expose measurement counts in backup preview.
- [x] Run regression/typecheck/format and iOS/Android exports; use simulator without resetting user data if available, review independently and fix findings. Native release rebuild remains subject to disk-space guard.

## Review focus

No missing-field-as-zero, latest per metric must survive sessions containing other metrics, no mixing different units, data scoped to tank, custom names/units immutable in history, empty/duplicate session save rejected, stale async responses ignored, old backups clear new data on replace restore, format-3 counts include all tables, summary data cannot load all measurements, archive/reset/delete preserve existing app behavior.

## Verification ledger

79 tests and typecheck pass. Review findings: canonicalize all restored reading timestamps before lexicographic SQL sorting; permit unchanged existing captured local dates after timezone travel. Added red/green regression tests for both. Native separate iPhone16e QA app verified add/custom/zero/localized decimals/range rejection/edit/restart. Fixed layout card flex after screenshot review and preserved same-query history during refresh to prevent scroll collapse. Main user aquarium database untouched. Captures in artifacts/screenshots/water-readings. Final bundle/format checks recorded in completion report; Android native visual/physical-device checks remain outside verification.
