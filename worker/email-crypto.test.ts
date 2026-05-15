import { describe, expect, test } from "vitest";
import { hashEmail, encryptEmail, decryptEmail } from "./email-crypto";

describe("hashEmail", () => {
  test("returns the same hash for the same email and secret", async () => {
    const hash1 = await hashEmail("patient@example.com", "secret");
    const hash2 = await hashEmail("patient@example.com", "secret");
    expect(hash1).toBe(hash2);
  });

  test("returns different hashes for different emails", async () => {
    const hash1 = await hashEmail("alice@example.com", "secret");
    const hash2 = await hashEmail("bob@example.com", "secret");
    expect(hash1).not.toBe(hash2);
  });
});

describe("encryptEmail / decryptEmail", () => {
  test("decryptEmail recovers the original email", async () => {
    const ciphertext = await encryptEmail("patient@example.com", "secret");
    const plaintext = await decryptEmail(ciphertext, "secret");
    expect(plaintext).toBe("patient@example.com");
  });

  test("encryptEmail produces a different ciphertext each call", async () => {
    const ct1 = await encryptEmail("patient@example.com", "secret");
    const ct2 = await encryptEmail("patient@example.com", "secret");
    expect(ct1).not.toBe(ct2);
  });
});
