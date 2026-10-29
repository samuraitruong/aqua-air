import { test } from "node:test";
import assert from "node:assert/strict";
import { safeSystemPath } from "../src/domain/system-path";
test("native links reject malformed URI sequences before router query decoding", () => {
  for (const path of [
    "aquaair://care/edit?notes=%FE%FE%FE",
    "aquaair://tank/%E0%A4",
    "aquaair://?x=%",
    "a".repeat(4097),
  ])
    assert.equal(safeSystemPath(path), "/");
  for (const path of [
    "aquaair://tank/edit",
    "aquaair://care/edit?tankId=abc",
    "aquaair://?name=B%E1%BB%83%20c%C3%A1",
    "/",
  ])
    assert.equal(safeSystemPath(path), path);
});
