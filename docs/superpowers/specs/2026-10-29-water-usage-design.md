# Monthly water usage and cost

Add a water-rate section in Settings and a compact monthly usage card below the dashboard's tank/task totals. Use existing rounded cards, teal droplet icon, typography, spacing and accessible controls. Translate all new labels into the existing eleven languages and support RTL.

## Approach

Use completed water-change logs, rather than scheduled work or manual meter readings: this matches the app's existing records and requires no additional logging step. Estimate replacement water as tank plus enabled sump capacity multiplied by the recorded change percentage. This measures aquarium replacement water, excluding evaporation top-ups and filter/RO waste that the app does not record.

Query every matching log directly in SQLite using its performed local date and the current calendar month; do not calculate from the dashboard's limited recent-log summary. Include archived tanks' records. Deleted logs and permanently deleted tanks leave the total through the app's existing deletion behavior.

## Settings

Allow a nonnegative decimal water price, currency selection and a choice of price per litre or per 1,000 litres (1 m³). No currency is inferred from the chosen UI language. An unset price shows a dashboard action to configure it; a saved zero price is valid. Keep rate, currency and unit in local SQLite and include them in backups. Reject invalid values without saving. Retain compatibility with older backups lacking these settings.

Currency options and the initial currency await the user's response to the pricing-unit question. Recommendation: common ISO currencies with their codes visible to avoid ambiguous symbols, initially AUD; do not calculate money until a rate is explicitly saved.

## Dashboard

Show the localized month, total litres and estimated cost at the currently configured price. Use a two-column litres/cost layout within one card; allow wrapping for longer translations and large text. Link the card to the water-rate setting. Show zero litres for a month without changes. Explain that cost uses the current rate, excluding fixed charges.

Unknown tank capacity must not silently count as zero: indicate incomplete usage when any matching log cannot be estimated. If loading fails, show a retry state rather than zero.

## Historical accuracy

For new water-change logs, persist the total system capacity used for calculation. Retain that basis when editing the log's notes/date/percentage; apply its edited percentage to the saved capacity. Clear it if the activity changes away from water change. A new water-change activity uses the current capacity.

Existing logs without a saved capacity use current tank capacity and are identified as estimates. Preserve this distinction in backups. Unknown capacity remains unknown until an existing estimate can use available tank dimensions; never invent a volume.

## Verification

Test SQLite migration and aggregation across all records, local month boundaries, archived tanks, sump capacity, history edits/deletion, snapshot stability after resizing tanks, incomplete volumes, rate validation/persistence and old/new backup round trips. Check localization key parity, type checking, full regression suite, export and native UI without resetting user data.
