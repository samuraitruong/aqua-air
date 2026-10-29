# Eleven-language support implementation plan

> **For agentic workers:** Translation catalogs are delegated by file; integration uses executing-plans in this session.

**Goal:** Offer the current top ten languages by total speakers plus Vietnamese (11 total), retain Vietnamese as default and preserve current selections/data.
**Architecture:** Register full independent catalogs using existing stable label keys. Load each locale's Hermes plural data. Derive layout direction from registry for Arabic/Urdu, with localized native permission resources and existing SQLite/backup/notification paths.
**Tech Stack:** Expo 55, React Native, FormatJS Intl polyfills, JSON catalogs.
**Spec:** User request plus clarification: top ten plus Vietnamese, 11 total. Set: vi, en, zh (Simplified), hi, es, ar (MSA), fr, bn, pt (Brazil), id, ur.

## Constraints and review focus
- No changes to existing VI/EN messages or user tank/history data.
- Exact key and interpolation-token coverage in every catalog; all plural variants preserve tokens.
- Arabic and Urdu direction must switch without forcing an app restart or changing device settings.
- SQLite, backup and notifications retain any registered language; OS permission strings follow system language.
- Check long translations, non-Latin fonts, select-sheet scrolling, numeric/date fields and RTL navigation icons.

## Tasks
- [x] Add failing tests for exact registry, default VI, every locale's runtime/plural support, direction and persistence/backup/notifications.
- [x] Integrate nine translated catalogs, native permission resources and FormatJS data.
- [x] Add dynamic layout direction, appropriate text/input direction and navigation chevrons; preserve LTR layout.
- [x] Run tests, typecheck, formatting, iOS/Android exports and native language-switch smoke tests; review and document limitations.
