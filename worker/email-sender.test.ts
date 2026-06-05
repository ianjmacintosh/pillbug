import { describe, expect, test, vi } from "vitest";
import { makeEmailSender } from "./email-sender";
import { Resend } from "resend";
import verificationTemplate from "./emails/verification.html?raw";
import loginTemplate from "./emails/login.html?raw";
import verificationPtBRTemplate from "./emails/verification.pt-BR.html?raw";
import loginPtBRTemplate from "./emails/login.pt-BR.html?raw";

vi.mock("resend", () => ({ Resend: vi.fn() }));

describe("makeEmailSender", () => {
  describe("when EMAIL_MOCK is true", () => {
    test("sendVerificationEmail is a no-op", async () => {
      const sender = makeEmailSender(
        "true",
        "test-key",
        "https://pillbug.ianjmacintosh.com",
      );
      await expect(
        sender.sendVerificationEmail(
          "delivered@resend.dev",
          "token",
          "1234",
          null,
        ),
      ).resolves.toBeUndefined();
    });

    test("sendLoginEmail is a no-op", async () => {
      const sender = makeEmailSender(
        "true",
        "test-key",
        "https://pillbug.ianjmacintosh.com",
      );
      await expect(
        sender.sendLoginEmail("delivered@resend.dev", "token", "1234", null),
      ).resolves.toBeUndefined();
    });

    test("does not construct Resend", () => {
      vi.mocked(Resend).mockClear();
      makeEmailSender("true", "test-key", "https://pillbug.ianjmacintosh.com");
      expect(Resend).not.toHaveBeenCalled();
    });
  });

  describe("when RESEND_API_KEY is missing", () => {
    test("sendVerificationEmail is a no-op", async () => {
      const sender = makeEmailSender(
        undefined,
        undefined,
        "https://pillbug.ianjmacintosh.com",
      );
      await expect(
        sender.sendVerificationEmail(
          "delivered@resend.dev",
          "token",
          "1234",
          null,
        ),
      ).resolves.toBeUndefined();
    });

    test("sendLoginEmail is a no-op", async () => {
      const sender = makeEmailSender(
        undefined,
        undefined,
        "https://pillbug.ianjmacintosh.com",
      );
      await expect(
        sender.sendLoginEmail("delivered@resend.dev", "token", "1234", null),
      ).resolves.toBeUndefined();
    });

    test("does not construct Resend", () => {
      vi.mocked(Resend).mockClear();
      makeEmailSender(
        undefined,
        undefined,
        "https://pillbug.ianjmacintosh.com",
      );
      expect(Resend).not.toHaveBeenCalled();
    });
  });

  describe("when EMAIL_MOCK is not set", () => {
    test("constructs Resend with the provided API key", () => {
      vi.mocked(Resend).mockClear();
      makeEmailSender(
        undefined,
        "real-api-key",
        "https://pillbug.ianjmacintosh.com",
      );
      expect(Resend).toHaveBeenCalledWith("real-api-key");
    });

    test("sendVerificationEmail sends with the correct English subject", async () => {
      const mockSend = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(Resend).mockImplementation(function () {
        return { emails: { send: mockSend } };
      } as unknown as typeof Resend);
      const sender = makeEmailSender(
        undefined,
        "real-api-key",
        "https://pillbug.ianjmacintosh.com",
      );
      await sender.sendVerificationEmail(
        "user@example.com",
        "token",
        "1234",
        null,
      );
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ subject: "Verify your Pillbug account" }),
      );
    });

    test("sendLoginEmail sends with the correct English subject", async () => {
      const mockSend = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(Resend).mockImplementation(function () {
        return { emails: { send: mockSend } };
      } as unknown as typeof Resend);
      const sender = makeEmailSender(
        undefined,
        "real-api-key",
        "https://pillbug.ianjmacintosh.com",
      );
      await sender.sendLoginEmail("user@example.com", "token", "1234", null);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ subject: "Your Pillbug sign-in link" }),
      );
    });

    test("sendVerificationEmail sends the rendered verification HTML body", async () => {
      const mockSend = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(Resend).mockImplementation(function () {
        return { emails: { send: mockSend } };
      } as unknown as typeof Resend);
      const sender = makeEmailSender(
        undefined,
        "real-api-key",
        "https://pillbug.ianjmacintosh.com",
      );
      await sender.sendVerificationEmail(
        "user@example.com",
        "mytoken",
        "5678",
        null,
      );
      const expectedHtml = verificationTemplate
        .replaceAll("{{pin}}", "5678")
        .replaceAll(
          "{{fallback_link}}",
          "https://pillbug.ianjmacintosh.com/enter-code?token=mytoken&pin=5678",
        )
        .replaceAll(
          "{{login_link}}",
          "https://pillbug.ianjmacintosh.com/login?email=user%40example.com",
        );
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ html: expectedHtml }),
      );
    });

    test("sendLoginEmail sends the rendered login HTML body", async () => {
      const mockSend = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(Resend).mockImplementation(function () {
        return { emails: { send: mockSend } };
      } as unknown as typeof Resend);
      const sender = makeEmailSender(
        undefined,
        "real-api-key",
        "https://pillbug.ianjmacintosh.com",
      );
      await sender.sendLoginEmail("user@example.com", "mytoken", "5678", null);
      const expectedHtml = loginTemplate
        .replaceAll("{{pin}}", "5678")
        .replaceAll(
          "{{fallback_link}}",
          "https://pillbug.ianjmacintosh.com/enter-code?token=mytoken&pin=5678",
        )
        .replaceAll(
          "{{login_link}}",
          "https://pillbug.ianjmacintosh.com/login?email=user%40example.com",
        );
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ html: expectedHtml }),
      );
    });

    test("sendVerificationEmail with pt-BR sends the pt-BR subject", async () => {
      const mockSend = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(Resend).mockImplementation(function () {
        return { emails: { send: mockSend } };
      } as unknown as typeof Resend);
      const sender = makeEmailSender(
        undefined,
        "real-api-key",
        "https://pillbug.ianjmacintosh.com",
      );
      await sender.sendVerificationEmail(
        "user@example.com",
        "token",
        "1234",
        "pt-BR",
      );
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ subject: "Verifique sua conta Pillbug" }),
      );
    });

    test("sendLoginEmail with pt-BR sends the pt-BR subject", async () => {
      const mockSend = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(Resend).mockImplementation(function () {
        return { emails: { send: mockSend } };
      } as unknown as typeof Resend);
      const sender = makeEmailSender(
        undefined,
        "real-api-key",
        "https://pillbug.ianjmacintosh.com",
      );
      await sender.sendLoginEmail("user@example.com", "token", "1234", "pt-BR");
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Seu link de acesso ao Pillbug",
        }),
      );
    });

    test("sendVerificationEmail with pt-BR sends the pt-BR HTML body", async () => {
      const mockSend = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(Resend).mockImplementation(function () {
        return { emails: { send: mockSend } };
      } as unknown as typeof Resend);
      const sender = makeEmailSender(
        undefined,
        "real-api-key",
        "https://pillbug.ianjmacintosh.com",
      );
      await sender.sendVerificationEmail(
        "user@example.com",
        "mytoken",
        "5678",
        "pt-BR",
      );
      const expectedHtml = verificationPtBRTemplate
        .replaceAll("{{pin}}", "5678")
        .replaceAll(
          "{{fallback_link}}",
          "https://pillbug.ianjmacintosh.com/enter-code?token=mytoken&pin=5678",
        )
        .replaceAll(
          "{{login_link}}",
          "https://pillbug.ianjmacintosh.com/login?email=user%40example.com",
        );
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ html: expectedHtml }),
      );
    });

    test("sendLoginEmail with pt-BR sends the pt-BR HTML body", async () => {
      const mockSend = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(Resend).mockImplementation(function () {
        return { emails: { send: mockSend } };
      } as unknown as typeof Resend);
      const sender = makeEmailSender(
        undefined,
        "real-api-key",
        "https://pillbug.ianjmacintosh.com",
      );
      await sender.sendLoginEmail(
        "user@example.com",
        "mytoken",
        "5678",
        "pt-BR",
      );
      const expectedHtml = loginPtBRTemplate
        .replaceAll("{{pin}}", "5678")
        .replaceAll(
          "{{fallback_link}}",
          "https://pillbug.ianjmacintosh.com/enter-code?token=mytoken&pin=5678",
        )
        .replaceAll(
          "{{login_link}}",
          "https://pillbug.ianjmacintosh.com/login?email=user%40example.com",
        );
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ html: expectedHtml }),
      );
    });
  });
});
