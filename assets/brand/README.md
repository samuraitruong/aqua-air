# Aqua Air brand assets

The launcher continues the original droplet mark in `Design/index.html` and the UI icon family in `src/ui/icon-paths.json`.

- `icon.svg` / `icon.png`: editable master and opaque RGB 1024×1024 launcher.
- `adaptive-foreground.svg` / `.png`: transparent Android foreground, centered within the adaptive safe area.
- `monochrome.svg` / `.png`: single-color Android themed icon.

Run `npm run assets:brand` to reproduce all masters and PNGs using the checked-in generator. The generator uses SVG and deterministic rendering; no image-generation service is required.
