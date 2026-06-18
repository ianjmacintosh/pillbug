import { createInstance } from "i18next";
import { afterEach, describe, expect, test } from "vitest";
import i18next from "./i18n";

// Creates a fresh isolated instance with the same config as the app.
// Keeps tests independent of the module-level singleton's state.
async function makeConfiguredInstance(
  translations: Record<string, string> = {},
) {
  const i = createInstance();
  await i.init({
    resources: { "en-US": { translation: translations } },
    supportedLngs: ["en-US"],
    fallbackLng: "en-US",
    interpolation: { escapeValue: false },
  });
  return i;
}

describe("i18n initialization", () => {
  test("is initialized", () => {
    expect(i18next.isInitialized).toBe(true);
  });

  test("en-US resource bundle is registered", () => {
    expect(i18next.hasResourceBundle("en-US", "translation")).toBe(true);
  });

  test("pt-BR resource bundle is registered", () => {
    expect(i18next.hasResourceBundle("pt-BR", "translation")).toBe(true);
  });
});

describe("document.documentElement.lang", () => {
  afterEach(async () => {
    await i18next.changeLanguage("en-US");
  });

  test("sets document lang when language changes to pt-BR", async () => {
    await i18next.changeLanguage("pt-BR");
    expect(document.documentElement.lang).toBe("pt-BR");
  });

  test("sets document lang when language changes to en-US", async () => {
    await i18next.changeLanguage("en-US");
    expect(document.documentElement.lang).toBe("en-US");
  });
});

describe("language resolution", () => {
  test("bare en uses en-US translations", async () => {
    const i = await makeConfiguredInstance({ greeting: "Hello" });
    await i.changeLanguage("en");
    expect(i.t("greeting")).toBe("Hello");
  });

  test("unsupported locale falls back to en-US", async () => {
    const i = await makeConfiguredInstance({ greeting: "Hello" });
    await i.changeLanguage("fr-FR");
    expect(i.t("greeting")).toBe("Hello");
  });
});
