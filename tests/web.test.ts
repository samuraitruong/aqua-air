import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { readStoreMetadata } from "../scripts/release-config";
test("static website pages have valid local links and real publisher/contact information", () => {
  const root = resolve("web");
  for (const file of ["index.html", "privacy.html", "support.html"]) {
    const html = readFileSync(resolve(root, file), "utf8");
    assert.match(html, /lang="en"/);
    assert.match(html, /<main id="main">/);
    assert.match(html, /Truong Nguyen/);
    assert.match(html, /samuraitruong@hotmail\.com/);
    assert.doesNotMatch(html, /<script|\[LEGAL|TODO|href="#"/);
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const href = match[1]!;
      if (/^(https?:|mailto:)/.test(href)) continue;
      if (href.startsWith("#")) {
        assert.ok(html.includes(`id="${href.slice(1)}"`));
        continue;
      }
      assert.ok(
        existsSync(resolve(root, href.split("#")[0]!)),
        `${file}: ${href}`,
      );
    }
  }
  const store = readStoreMetadata();
  assert.equal(store.publisher, "Truong Nguyen");
  assert.equal(new URL(store.privacyPolicyUrl).pathname, "/privacy.html");
  assert.equal(new URL(store.supportUrl).pathname, "/support.html");
});
