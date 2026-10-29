# Aqua Air static website

Deploy the contents of this folder as the document root for `https://aquaair.truongthings.site`. No build step, Node server, dependencies or JavaScript are needed in production. Keep `assets/` and `styles.css` alongside the three HTML pages.

- `/` → overview
- `/privacy.html` → privacy policy
- `/support.html` → contact and help

Publisher: Truong Nguyen · samuraitruong@hotmail.com. These URLs are already configured in `release/store.json` for the app. Review the policy's support-message retention wording and hosting behavior before deploying; edit the effective date when the policy changes. Update both store consoles with the same URLs.

Local preview from the repository root:

```sh
npm run web:preview
```

Open http://127.0.0.1:5501. The command binds to loopback only. Stop with Ctrl+C. Run `npm run web:check` to check local links, required contact details and page structure.

After deploying, run `npm run release:check:links`; it deliberately fails before the public pages exist. No deployment has been performed as part of preparing this folder. Do not deploy repository files, signing keys, app data or source maps alongside the site.
