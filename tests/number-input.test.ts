import test from "node:test";
import assert from "node:assert/strict";
import { parseNumberInput } from "../src/domain/number-input";
import { calculateTankVolume } from "../src/domain/tank-volume";

test("numeric fields accept the digit scripts used by the registered languages", () => {
  for (const [input, expected] of [
    ["٣٠", 30],
    ["۳۰", 30],
    ["३०", 30],
    ["৩০", 30],
    ["３０", 30],
    ["١٢٫٥", 12.5],
    ["۱۲,۵", 12.5],
    ["1,5", 1.5],
    ["١٬٠٠٠٫٥", 1000.5],
  ] as const) {
    assert.equal(parseNumberInput(input), expected, input);
  }
  assert.ok(Number.isNaN(parseNumberInput("١٬٢")));
  assert.ok(Number.isNaN(parseNumberInput("30 liters")));
});
test("tank capacity uses localized dimensions consistently", () => {
  assert.equal(calculateTankVolume("१००", "৪০", "۵۰"), 200);
});
