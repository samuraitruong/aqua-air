# Original design alignment

Reference: the user-owned `Design/index.html` and its 12 screens. The Design folder is unchanged. The app retains real SQLite data and native controls rather than the HTML demo's sample records, simulated status bar, phone frame or browser storage.

## Shared system

The original palette, 15px body, 13px secondary text, 11px metadata, 23px page titles, 18px secondary headers, 21px cards with 17px padding, 12px inputs, 14px buttons, and 1.7-unit SVG strokes are represented in `src/ui/theme.ts`, `icons.tsx` and `icon-paths.json`. Headers center their title when they have a back button. `visual-controls.tsx` supplies select sheets, underline tabs, section headings and centered icon tiles.

## Screen mapping

| Reference | Native route | Alignment |
|---|---|---|
| 01 Welcome | `/`, empty library | Centered Aqua Air mark, original aquarium artwork, two-line heading, primary and secondary actions |
| 02 Dashboard | `/` | Horizontal summary tiles, compact care actions, upcoming icon rows, section links |
| 03 Tanks | `/tanks` | Search surface, filter chips, 177px cover, compact metadata and status; sort is in the header |
| 04 Add | `/tank/edit` | Dashed upload, flat fields, fixed save action; dimensions and filters follow the same tokens |
| 05 Detail | `/tank/[id]` | 220px full-bleed hero, paired stats, underline tabs, timeline; optional history filtering is in the tank menu |
| 06 Log | `/care/edit` | Tank summary, activity select, date/time, large percentage with slider/presets, notes, linked due date, fixed save |
| 07 Activity | `/care/[id]` | Centered activity icon/title, water percentage tile, icon-bearing metadata, notes, fixed edit/delete actions |
| 08 Schedule | `/schedule/edit` | Flat activity/interval fields, compact next-date card, optional manual due date, reminder row, pause switch |
| 09 Reminders | `/schedule/reminders` | Tank summary, large time, lead select, switches, nested notification preview, fixed save |
| 10 Calendar | `/calendar` | Month/date navigator, seven-day strip, T2–CN labels in VI, recorded/due/upcoming sections; filters are in header |
| 11 Settings | `/settings` | Centered brand, grouped icon rows/dividers; VI/EN selection and additional native settings use same styling |
| 12 Backup | `/backup` | Large folder tile, count rows with icons, latest backup, export/restore actions |

## Additional states

Missing photos are explicit placeholders, not sample photos belonging to other tanks. Errors use the coral palette, compact inline banner and dismiss action. Toasts and notification permission states share the existing colors and typography. Real time-of-day, dimensions, sump/canister, language, history filters, archives and backup recovery functions remain available.

## Launcher assets

`assets/brand/icon.svg` uses the reference droplet on an aqua/teal gradient. Its 1024px iOS PNG is RGB without an alpha channel. Android has a transparent adaptive foreground within the center safe region plus a monochrome asset. Rebuild with `npm run assets:brand`; configure paths in `app.json`.

## Verification

- `npm run check`: 53 tests including a regression that removes native `Intl.Locale` and `Intl.PluralRules` before loading translations.
- `npm run format:check`.
- iOS and Android Hermes exports.
- Native iPhone 17 Pro / iOS 26.1 build, preserving the existing library; no tank or care log was saved during this UI check.
- Welcome and installed launcher icon also inspected on a separate iPhone 16e without an existing Aqua Air library.
- Native inspection of dashboard, list, detail, activity, care form, schedule, reminders, calendar, settings, backup, add-tank and empty-form error states; select dismissal and EN→VI language switch checked without saving care/tank changes.
- Screenshots: `artifacts/screenshots/fidelity/` (local, ignored).

Native safe areas, date pickers, switches, keyboard and text scaling follow the operating system. This is not a claim of identical pixels across all devices. Android native visual inspection and physical-device notification delivery were not performed.
