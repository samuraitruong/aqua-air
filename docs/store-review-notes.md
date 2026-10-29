# Aqua Air — draft review notes and store declarations

Confirm these against the final signed build. Do not paste unresolved placeholders into a store listing.

## Reviewer access

Aqua Air is an offline aquarium-care journal. No account, subscription, payment, special hardware, demo credentials, server or invitation is needed. Notifications and camera access are optional. Start from an empty install and create your own test tank; no real user data is preloaded.

Suggested flow:

1. Add tank → enter a name, dimensions 100 × 40 × 50 cm (200 L), optionally enable a 40 L sump and a canister. Save.
2. Log water change → enter 25% and a past/current date. Dashboard monthly usage includes 60 L for that record (tank + sump). Historical capacities are saved for new records; records from older builds estimate using current capacity and explain that limitation.
3. Settings → Water rate → select currency and price per litre or 1,000 L → save. Dashboard cost is an estimate at the configured current price, excluding fixed charges/top-ups/filter waste; no payment is taken.
4. Open a care schedule and reminders, allow notifications if desired, and use Send test reminder. Delivery depends on device settings, focus/notification permissions and Android battery/scheduling behavior; exact delivery is not guaranteed.
5. Settings → Language → choose any of the eleven languages. Vietnamese is the initial default; Arabic and Urdu support RTL.
6. Settings → Backup → export a backup via the system share sheet. Import a valid exported .aquaair file to preview counts and confirm restore. Restore replaces the current journal and creates a local recovery file first.
7. Settings → Privacy policy shows an offline explanation and links to the publisher's public policy; Help & support opens the public support page.

## Store information to complete

- Publisher identity and contact details, support URL, privacy URL, applicable seller/trader declarations and territories.
- Accurate category (aquarium care/productivity utility), descriptions, localized screenshots showing the actual release app, icon and current release/build numbers.
- Apple's current age-rating questionnaire; Google's content rating, target audience, app-access and advertising declarations. No ads/IAP exist in this source; do not advertise payments or premium features.
- No account creation exists, so in-app account-deletion/sign-in-with-Apple flows are not applicable to this version. Local data deletion is available in Settings.
- App Privacy / Data safety starting position: no user data is transmitted to the developer by the app, no tracking, no ads. Local on-device processing is not automatically "data collected" under store definitions. Verify the final binary and SDKs, selected support hosting/services and any changes before submitting the forms. Voluntary file exports and OS backups are disclosed in the policy. Do not infer declarations only from SQLite usage.
- Encryption: this version uses platform transport facilities and SHA-256 for backup integrity, without custom confidential-data encryption or encrypted backups. `ITSAppUsesNonExemptEncryption=false` is configured; publisher must confirm the export-compliance answers for the final binary and distribution.
- Permissions: camera only when taking photos; system picker for selected images; optional local notifications. No broad media, microphone, location, contacts, exact-alarm or tracking permissions are intended.

## Release-device checklist (record results before submission)

- Install signed builds from TestFlight/Play internal testing; launch without Metro/network; force-stop/relaunch and confirm SQLite/photos/settings persist.
- Test smallest supported phones, large text, long translations, VoiceOver/TalkBack, and Arabic/Urdu RTL. Check main flows with all eleven locale catalogs.
- Deny camera/photos/notifications, dismiss dialogs and picker, cancel exports, grant permissions later. Core journal remains usable; no crash or permission loops.
- Deliver real local reminders while backgrounded and after restart/reboot; tap active and stale reminders. Check Android channel/Doze settings and 16 KB device compatibility. Do not promise exact alarm times.
- Save/edit/delete activities; test month boundaries/timezones, sump/unknown-capacity calculations and zero/unset rates.
- Export with/without photos; restore on another fresh install; reject corrupt/oversized/unsupported files without changing existing data. Verify recovery after a failed restore. If existing photos are missing, resolve missing covers before restore (known recovery-snapshot limitation).
- Delete all local data after exporting; verify records, photos, reminders and app-managed recovery file clear. Exported/system backups remain outside the app's control.
- Open real public privacy/support URLs from the signed app; no placeholders, authentication or broken links. Test the support contact mechanism.
