/** Editable vector masters and deterministic native launcher exports. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { URL } from "node:url";
import { PNG } from "pngjs";
import { Resvg } from "@resvg/resvg-js";
const directory = new URL("../assets/brand/", import.meta.url);
mkdirSync(directory, { recursive: true });
const paths = JSON.parse(
  readFileSync(new URL("../src/ui/icon-paths.json", import.meta.url), "utf8"),
) as Record<string, string>;
const mark = (color: string) =>
  `<g transform="translate(164 152) scale(29)" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths.drop}</g>`;
const wrap = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${body}</svg>`;
const icon = wrap(
  `<defs><linearGradient id="sea" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#129FAB"/><stop offset=".55" stop-color="#087F8C"/><stop offset="1" stop-color="#066674"/></linearGradient></defs><path fill="url(#sea)" d="M0 0h1024v1024H0z"/><circle cx="900" cy="90" r="400" fill="#BEEEF0" opacity=".08"/>${mark("#FFFFFF")}`,
);
const foreground = wrap(mark("#FFFFFF"));
const monochrome = wrap(mark("#000000"));
for (const [name, svg] of Object.entries({
  icon,
  "adaptive-foreground": foreground,
  monochrome,
})) {
  writeFileSync(new URL(`${name}.svg`, directory), svg + "\n");
  writeFileSync(
    new URL(`${name}.png`, directory),
    name === "icon"
      ? PNG.sync.write(PNG.sync.read(new Resvg(svg).render().asPng()), {
          colorType: 2,
        })
      : new Resvg(svg).render().asPng(),
  );
}
console.log(
  "Generated 1024px launcher, adaptive foreground and monochrome assets in assets/brand",
);
