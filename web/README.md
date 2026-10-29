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

After deploying, run `npm run release:check:links`; it deliberately fails before the public pages exist. The GitHub Actions workflow deploys this folder after successful CI on the default branch; adding the workflow locally does not publish it until pushed/run. Do not deploy repository files, signing keys, app data or source maps alongside the site.

## GitHub Pages deployment

One-time repository setup: open **Settings → Pages → Build and deployment → Source**, then select **GitHub Actions**. The `github-pages` environment must allow deployments from your default branch (currently `main`).

Push the workflow and site changes to `main`, or manually run CI on that branch. The deployment job waits for all tests, formatting and iOS/Android bundle exports to pass, then publishes only the `web/` artifact. Pull requests and feature branches never deploy. No extra repository secrets are required.

Default site URL: https://samuraitruong.github.io/aqua-air/. All internal links are relative, so this project subpath works.

To connect the domain already used by the app, first set **Settings → Pages → Custom domain** to `aquaair.truongthings.site`, then create a DNS CNAME record for `aquaair.truongthings.site` pointing to `samuraitruong.github.io` (no repository path). Enable **Enforce HTTPS** once the certificate is available. Until that is configured, the app's custom-domain privacy/support URLs will not resolve to this Pages site. No DNS or repository settings have been changed by editing this workflow.

GitHub's official setup: [custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

## Landing page content

The product landing page loads `styles.css` and scoped `landing.css`; privacy/support continue using the shared document layout. Dashboard, tank and calendar images in `assets/app-*.png`, plus `assets/aquarium.png`, were captured from the original `Design/screens/` preview without changing those design files. They are labelled as design previews and contain sample design data, not user records.

There are no store listing URLs yet. “Explore the app” links to the feature section; launch enquiry CTAs open an email draft addressed to the publisher. No signup, subscription or message is sent automatically. Once store listings exist, replace or extend those CTAs with the real destinations and remove the prelaunch label.
