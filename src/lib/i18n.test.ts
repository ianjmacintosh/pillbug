import { createInstance } from "i18next";
import { describe, expect, test } from "vitest";
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
});

describe("language resolution", () => {
  test("bare en uses en-US translations", async () => {
    const i = await makeConfiguredInstance({ greeting: "Hello" });
    await i.changeLanguage("en");
    expect(i.t("greeting")).toBe("Hello");
  });

  test("unsupported locale falls back to en-US", async () => {
    const i = await makeConfiguredInstance({ greeting: "Hello" });
    await i.changeLanguage("pt-BR");
    expect(i.t("greeting")).toBe("Hello");
  });
});
