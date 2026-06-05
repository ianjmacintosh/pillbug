import { describe, expect, test } from "vitest";
import { t } from "./t";

describe("t()", () => {
  test("returns en-US string for null language", () => {
    expect(t("email.verificationSubject", null)).toBe(
      "Verify your Pillbug account",
    );
  });

  test("returns en-US string for en-US language", () => {
    expect(t("email.verificationSubject", "en-US")).toBe(
      "Verify your Pillbug account",
    );
  });

  test("returns en-US string for unknown language", () => {
    expect(t("email.verificationSubject", "fr-FR")).toBe(
      "Verify your Pillbug account",
    );
  });

  test('t("email.verificationSubject", "pt-BR") returns the Portuguese subject', () => {
    expect(t("email.verificationSubject", "pt-BR")).toBe(
      "Verifique sua conta Pillbug",
    );
  });

  test('t("email.loginSubject", "pt-BR") returns the Portuguese subject', () => {
    expect(t("email.loginSubject", "pt-BR")).toBe(
      "Seu link de acesso ao Pillbug",
    );
  });
});
