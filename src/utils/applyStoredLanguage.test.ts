import { afterEach, describe, expect, test, vi } from "vitest";
import i18next from "./i18n";
import { applyStoredLanguage } from "./applyStoredLanguage";

afterEach(async () => {
  await i18next.changeLanguage("en-US");
  vi.restoreAllMocks();
});

describe("applyStoredLanguage", () => {
  test("applies the stored language value", async () => {
    await applyStoredLanguage("en-US");
    expect(i18next.language).toBe("en-US");
  });

  test("uses browser language when stored language is null", async () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("en-US");
    await applyStoredLanguage(null);
    expect(i18next.language).toBe("en-US");
  });

  test("uses pt-BR browser language when stored language is null", async () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("pt-BR");
    await applyStoredLanguage(null);
    expect(i18next.language).toBe("pt-BR");
  });

  test("falls back to en-US when stored language is null and browser language is unsupported", async () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("fr-FR");
    await applyStoredLanguage(null);
    expect(i18next.language).toBe("en-US");
  });
});
