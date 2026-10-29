import { test } from "node:test";
import assert from "node:assert/strict";
import { userMessage } from "../src/services/errors";
import { DomainError } from "../src/domain/validation";
test("storage errors never expose SQL while field validation remains useful", () => {
  assert.equal(
    userMessage(
      new DomainError("VALIDATION_ERROR", "Tên bể cần từ 1 đến 60 ký tự."),
    ),
    "Tên bể cần từ 1 đến 60 ký tự.",
  );
  assert.equal(
    userMessage(new Error("SQLITE_FULL: database or disk is full")),
    "Bộ nhớ thiết bị đã đầy. Hãy giải phóng dung lượng rồi thử lại.",
  );
  assert.ok(
    !userMessage(
      new Error("SQLITE_CONSTRAINT CHECK failed SELECT * FROM tanks"),
    ).includes("SQL"),
  );
});

test("user-facing errors carry a label key and render in the current language", async () => {
  const { UserFacingError } = await import("../src/domain/error");
  const { setLanguage } = await import("../src/i18n");
  const error = new UserFacingError("error.storageFull");
  setLanguage("en");
  try {
    assert.equal(
      userMessage(error),
      "Your device storage is full. Free up space and try again.",
    );
  } finally {
    setLanguage("vi");
  }
});
