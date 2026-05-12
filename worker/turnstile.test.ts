import { describe, expect, test, vi } from "vitest";
import { verifyTurnstileToken } from "./turnstile";

describe("verifyTurnstileToken", () => {
  test("returns true when Cloudflare responds with success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true }),
      }),
    );

    const result = await verifyTurnstileToken("some-token", "secret-key");

    expect(result).toBe(true);
    vi.unstubAllGlobals();
  });

  test("returns false when Cloudflare responds with failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            success: false,
            "error-codes": ["invalid-input-response"],
          }),
      }),
    );

    const result = await verifyTurnstileToken("bad-token", "secret-key");

    expect(result).toBe(false);
    vi.unstubAllGlobals();
  });

  test("posts to the Cloudflare siteverify endpoint", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await verifyTurnstileToken("some-token", "secret-key");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({ method: "POST" }),
    );
    vi.unstubAllGlobals();
  });
});
