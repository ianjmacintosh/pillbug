import { describe, expect, test } from "vitest";
import { resolveLanguage } from "./resolveLanguage";

const supported = ["en-US", "pt-BR"] as const;
const fallback = "en-US";

describe("resolveLanguage", () => {
  test("returns exact match for en-US", () => {
    expect(resolveLanguage("en-US", supported, fallback)).toBe("en-US");
  });

  test("returns exact match for pt-BR", () => {
    expect(resolveLanguage("pt-BR", supported, fallback)).toBe("pt-BR");
  });

  test("maps bare en to en-US", () => {
    expect(resolveLanguage("en", supported, fallback)).toBe("en-US");
  });

  test("maps en-GB to en-US (first en-* in supported list)", () => {
    expect(resolveLanguage("en-GB", supported, fallback)).toBe("en-US");
  });

  test("maps bare pt to pt-BR", () => {
    expect(resolveLanguage("pt", supported, fallback)).toBe("pt-BR");
  });

  test("returns fallback for unsupported language", () => {
    expect(resolveLanguage("fr-FR", supported, fallback)).toBe("en-US");
  });
});
