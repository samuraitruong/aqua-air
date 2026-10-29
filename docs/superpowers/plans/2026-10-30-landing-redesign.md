# Landing page redesign plan

User requested a full landing-page presentation, CTA and app imagery from the design preview; confirmed there are no store listing URLs yet.

- [x] Inspect existing site, brand tokens, deployment packaging and original design screens.
- [x] Capture dashboard, tank and calendar screenshots plus aquarium photo from read-only design pages.
- [x] Replace web/index.html with product-led hero, genuine prelaunch CTAs, app/feature stories and closing CTA. Add scoped web/landing.css, preserving policy/support styles and routes.
- [x] Include all CSS assets in the GitHub website artifact; document screenshot provenance and CTA setup.
- [x] Validate links/format/tests/actionlint, browser navigation and responsive layout at 320/375/414/768/desktop. Save preview screenshots and stop owned preview servers. Nothing deployed directly.

Validation: 79 tests, typecheck, Prettier and actionlint pass. Browser checked 320/375/414/768/1024/1280/1440 px: no horizontal overflowing elements; screenshot captions clear overlapping previews. All images load when scrolled into view, section CTAs land correctly and policy/support links work. Independent source review found no material issues. Captured final desktop/mobile previews under artifacts/screenshots/landing-redesign. No direct deployment performed.
