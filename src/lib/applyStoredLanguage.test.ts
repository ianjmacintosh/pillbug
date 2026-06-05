import { afterEach, describe, expect, test } from "vitest";
import i18next from "./i18n";
import { applyStoredLanguage } from "./applyStoredLanguage";

afterEach(async () => {
  await i18next.changeLanguage("en-US");
});

describe("applyStoredLanguage", () => {
  test("falls back to en-US when language is null", async () => {
    await applyStoredLanguage(null);
    expect(i18next.language).toBe("en-US");
  });

  test("applies the stored language value", async () => {
    await applyStoredLanguage("en-US");
    expect(i18next.language).toBe("en-US");
  });
});
