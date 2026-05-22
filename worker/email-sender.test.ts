import { describe, expect, test, vi } from "vitest";
import { makeEmailSender } from "./email-sender";
import { Resend } from "resend";

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
        sender.sendVerificationEmail("delivered@resend.dev", "token", "1234"),
      ).resolves.toBeUndefined();
    });

    test("sendLoginEmail is a no-op", async () => {
      const sender = makeEmailSender(
        "true",
        "test-key",
        "https://pillbug.ianjmacintosh.com",
      );
      await expect(
        sender.sendLoginEmail("delivered@resend.dev", "token", "1234"),
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
        sender.sendVerificationEmail("delivered@resend.dev", "token", "1234"),
      ).resolves.toBeUndefined();
    });

    test("sendLoginEmail is a no-op", async () => {
      const sender = makeEmailSender(
        undefined,
        undefined,
        "https://pillbug.ianjmacintosh.com",
      );
      await expect(
        sender.sendLoginEmail("delivered@resend.dev", "token", "1234"),
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
  });
});
