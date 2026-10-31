# Tank insights, presets, targets, journal and reports

Status: approved with user amendment: PDF reports instead of shareable HTML reports.

## Intent and constraints

Implement requested post-MVP features 1–5 as a coherent extension of the existing tank detail and measurement workflows. Preserve local SQLite storage, offline use, existing visual style, all 11 languages (Vietnamese default), RTL, and locale-aware dates/numbers. Do not modify the original Design assets or require an account/server.

The current application has schema 5, backup format 3, paginated water readings, latest-per-parameter summaries, custom parameters, care logs and managed local photos. Reuse those systems; charts and exports must query the full selected date range rather than the currently loaded history page.

## Approaches

Recommended: integrated local implementation using SQLite, existing react-native-svg for charts, existing media handling and native file sharing. Reports are PDF files generated locally with Expo Print, alongside CSV files. This keeps all five features usable offline and uses the Expo-compatible native printing module.

Alternative: add cloud reporting/sync and hosted photo storage. This introduces accounts, connectivity, hosting and privacy changes without serving the requested local-first scope; defer it.

Alternative report format: native PDF generation. Useful later, but adds a native dependency and platform-specific pagination work. User chose PDF generation for this release; HTML is only an escaped internal print template.

## 1. Parameter charts

- Entry from the tank Water parameters section, in the existing teal visual style.
- Select a built-in or custom parameter with recorded data, and a 7/30/90-day period. Default 30 days. Include today and the preceding calendar days in the current device timezone.
- Plot one parameter/unit series at a time; never combine different units on one numeric axis. Separate historical unit variants if present.
- X positions reflect actual measurement times. Display water-change markers from care logs with date and percentage; these indicate timing, not causation.
- Show measurement count, min/max/latest, explicit units and dates. Selecting a point shows its actual value/time. A dated value list provides an accessible alternative to the chart.
- Empty and single-point states are valid. No invented points, extrapolation or safe-water diagnosis. A connecting line is a visual guide between measurements.
- Use indexed SQLite range queries and a bounded/downsampled rendering series for large ranges. Statistics and exports use original data; disclose any chart sampling.

## 2. Quick-entry presets

- Each tank can save named presets containing an ordered selection of built-in/custom parameters; one can be the default for new readings.
- Create, rename, edit and delete presets, with validated unique names per tank. A preset needs at least one valid parameter. Proposed limit: 10 presets per tank.
- Applying a preset selects visible fields only. It never pre-fills previous values, changes measurement dates, submits data or creates a measurement.
- Keep an All parameters option. Editing an existing reading exposes all of its saved values regardless of the default preset. Switching presets must not silently discard typed values; retain them visibly or require explicit confirmation before clearing.
- Presets are tank-specific. Never reference another tank's custom parameters.

## 3. Personal target ranges

- Optional lower and/or upper bound for each parameter on each tank, with at least one bound; lower must be less than or equal to upper. Values must satisfy that parameter's numeric constraints.
- Show Below target / Within target / Above target with text and icons, not color alone. Bounds are inclusive. No target means no status.
- Display the target band on charts, alongside the latest value status and its actual measurement timestamp. Bands apply only to matching parameter/unit series.
- Optional stale-after interval per tank, proposed default 7 days, configurable from 1–365 days. Label old readings as stale separately from target status. This is a tracking preference, not a testing-frequency recommendation.
- Target edits reinterpret display status only; historical numeric results remain unchanged. Describe targets as personal settings, not universal safety limits.
- No background alarms or new notification scheduling in this scope.

## 4. Photo journal

- Add a Photos section to each tank. Create/edit/delete entries containing a performed date/time, optional caption/notes (up to 2,000 characters) and one photo. One photo per entry keeps editing and ordering simple; users can add multiple entries.
- Choose library or camera through the existing picker; reuse JPEG resizing, app-private files and existing permission/error behavior. A cancelled picker creates no journal entry.
- Reverse chronological, paginated journal with full-image viewing. Compare two selected entries side by side, stacked on narrow screens, with captions and dates; no synthetic image manipulation.
- Journal entries do not change the tank cover automatically. Archived tanks allow viewing/comparing/exporting but no new entries or edits, consistent with the existing water-reading UI.
- Track photo references correctly across covers and journal entries. Delete physical files only when no committed reference remains. Unsaved/staged photos must not be removed by unrelated cleanup.
- Tank deletion removes related journal records; cancellation or a failed save preserves committed data.

## 5. CSV and shareable reports

- Per-tank Export action with a date interval, default current month. Explicitly state whether empty sections have no records.
- Water CSV: one row per result, including stable parameter key, name, unit, value, measurement timestamp/local date and notes. Care CSV: one row per activity including timestamp/local date, activity, water-change percent where applicable and notes.
- UTF-8 CSV with BOM for spreadsheet compatibility, consistent columns, decimal-dot numeric values and ISO dates/timestamps. Correctly quote commas, quotes and newlines. Neutralize formula-leading user text for spreadsheet safety without altering numeric results.
- Generate a standalone PDF report with tank details, date period, readings, care activities and summaries. Localize human-readable labels/dates/numbers. Escape all user content. No scripts, remote assets, analytics or external requests; photos are omitted from this initial report to keep files manageable.
- Share generated files via the existing OS share sheet. Preview report information before sharing; creating/sharing a report never mutates aquarium history. Handle unavailable sharing, cancellation and disk errors, and clean temporary exports safely.
- CSV/report files are for reading/sharing; they do not replace .aquaair backups and are not restore inputs.

## Data integrity and compatibility

- Add a forward-only transactional SQLite migration for presets, preset fields, per-tank targets/preferences and journal entries. Preserve existing tank data, readings, care logs and photographs. Foreign keys/cascades enforce tank ownership.
- Include the new data and journal photos in a new backup format version. Continue accepting versions 1–3 with empty defaults for new collections/preferences. Older app versions must reject new formats rather than silently dropping new data.
- Extend validation, manifest counts, path/checksum checks, restore staging/recovery and photo reference collection to cover every new entity. Retain existing archive/file size limits and fail clearly when exceeded.
- Add no implicit seed measurements, presets, target ranges or journal photos. Existing data remains visible after migration and application restart.

## Delivery and verification

Implement in dependent slices: persistence/backup and domain validation; presets/targets; chart queries/UI; photo journal; CSV/PDF and share UI. All five remain in the approved scope.

Automated coverage: populated schema-5 migration and rollback, ownership validation, archive restrictions, preset selection without copied values, inclusive bounds/staleness boundaries, range/timezone/chart edge cases, photo-reference cleanup, CSV escaping/formula text, HTML escaping, export completeness beyond one history page, new backup round trip and legacy backup restore.

Run typecheck, existing/regression tests, formatting and both Expo bundle exports. Verify the new flows in the available native simulator, including restart persistence, non-English/RTL labels, empty/error states, narrow layout and share sheet. Report physical-device/Android verification limits accurately; do not equate bundle export with device testing.

## Excluded

Cloud sync, subscriptions, AI advice, species-specific safety recommendations, dosing calculators, hardware integrations, automatic recurring exports, photo inclusion in reports and CSV import are outside this release.
