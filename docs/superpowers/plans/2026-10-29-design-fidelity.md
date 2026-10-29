# Aqua Air design fidelity implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement task by task.

**Goal:** Match the user-owned Design/index.html preview while preserving implemented functions, including VI/EN, SQLite, dimensions and both filters.
**Architecture:** Restore original design tokens, SVG icons and shared primitives in place, then correct screen composition. Use native safe areas and scalable text rather than copying simulated device chrome. New errors and notifications inherit reference styling.
**Tech Stack:** Expo 55, React Native, react-native-svg.
**Spec:** Design/index.html; user's explicit request to reproduce the original interface.

## Global constraints
- Do not edit Design/ or migrate/reset user data.
- Preserve routes, services, validation, history pagination and translation keys.
- Keep native safe areas and accessible controls; tolerate English and large text.
- Original SVG icon family in UI; add a separate launcher icon as requested.

## Review focus
- Long names and English text must wrap without overlapping pills or controls.
- Unpictured dimensions, filters, error and notification states use the same tokens.
- Missing photos remain clearly indicated; do not invent tank photos.
- Form selection, dismissal, unsaved changes and fixed save footer still function.
- Icons must inherit tint and launcher assets must be opaque on iOS and safe on Android.

### Task 1: Shared visual system
- [x] Read exact CSS and SVG paths from reference.
- [x] Restore typography, spacing, headers, cards, inputs, buttons, pills, photos, bottom tabs and original SVG family.
- [x] Add compact selects and underline tabs while preserving selection handlers.
- [x] Run typecheck and visually inspect primitives in app.

### Task 2: Screen fidelity
- [x] Correct welcome, dashboard horizontal summary and upcoming rows, tank list search/cards.
- [x] Restore full-bleed detail photo, stats, timeline and underline tabs.
- [x] Restore form select, upload, percentage, reminder preview, activity summary, settings groups and backup rows.
- [x] Check all 12 reference screens, EN layout and user-added fields.

### Task 3: Launcher and verification
- [x] Produce editable brand SVG and deterministic PNG launcher/adaptive assets; configure app.json.
- [x] Run npm run check, formatting and iOS/Android exports.
- [x] Inspect app screenshots and obtain code review; document any verification limits.
