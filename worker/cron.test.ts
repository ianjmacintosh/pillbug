import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { deleteStaleUnverifiedPatients, deleteExpiredTokens } from "./cron";
import { makeInMemoryRepo } from "./test/auth-helpers";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("deleteStaleUnverifiedPatients", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("deletes an unverified patient whose account is exactly 7 days old", async () => {
    const repo = makeInMemoryRepo();
    vi.setSystemTime(new Date("2025-05-09T03:00:00Z"));
    await repo.createPatient(
      "p1",
      "delivered+cron-test@resend.dev",
      new Date().toISOString(),
    );

    // created_at + 7 days <= scheduledTime → delete
    // May 9 + 7 days = May 16 ≤ May 16 → delete
    const scheduledTime = new Date("2025-05-16T03:00:00Z").getTime();
    const cutoffDate = new Date(scheduledTime - 7 * DAY_MS).toISOString();

    await deleteStaleUnverifiedPatients(repo, cutoffDate);

    expect(
      await repo.findPatientByEmail("delivered+cron-test@resend.dev"),
    ).toBeNull();
  });

  test("retains an unverified patient whose account is 6 days old", async () => {
    const repo = makeInMemoryRepo();
    vi.setSystemTime(new Date("2025-05-10T03:00:00Z"));
    await repo.createPatient(
      "p1",
      "delivered+cron-test@resend.dev",
      new Date().toISOString(),
    );

    // created_at + 7 days > scheduledTime → retain
    // May 10 + 7 days = May 17 > May 16 → retain
    const scheduledTime = new Date("2025-05-16T03:00:00Z").getTime();
    const cutoffDate = new Date(scheduledTime - 7 * DAY_MS).toISOString();

    await deleteStaleUnverifiedPatients(repo, cutoffDate);

    expect(
      await repo.findPatientByEmail("delivered+cron-test@resend.dev"),
    ).not.toBeNull();
  });

  test("retains a verified patient even if their account is older than 7 days", async () => {
    const repo = makeInMemoryRepo();
    vi.setSystemTime(new Date("2025-05-01T03:00:00Z"));
    await repo.createPatient(
      "p1",
      "delivered+cron-test@resend.dev",
      new Date().toISOString(),
    );
    await repo.updateLastLoginAt("p1", new Date().toISOString());

    const scheduledTime = new Date("2025-05-16T03:00:00Z").getTime();
    const cutoffDate = new Date(scheduledTime - 7 * DAY_MS).toISOString();

    await deleteStaleUnverifiedPatients(repo, cutoffDate);

    expect(
      await repo.findPatientByEmail("delivered+cron-test@resend.dev"),
    ).not.toBeNull();
  });
});

describe("deleteExpiredTokens", () => {
  test("deletes expired tokens", async () => {
    const repo = makeInMemoryRepo();
    await repo.createPatient("p1", "a@b.com", new Date().toISOString());
    const pastExpiresAt = new Date(Date.now() - 1).toISOString();
    await repo.createToken("tok-expired", "p1", pastExpiresAt, "1234");

    await deleteExpiredTokens(repo, new Date().toISOString());

    expect(await repo.findToken("tok-expired")).toBeNull();
  });

  test("deletes used tokens", async () => {
    const repo = makeInMemoryRepo();
    await repo.createPatient("p1", "a@b.com", new Date().toISOString());
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    await repo.createToken("tok-used", "p1", expiresAt, "1234");
    await repo.markTokenUsed("tok-used", new Date().toISOString());

    await deleteExpiredTokens(repo, new Date().toISOString());

    expect(await repo.findToken("tok-used")).toBeNull();
  });

  test("retains valid unused tokens", async () => {
    const repo = makeInMemoryRepo();
    await repo.createPatient("p1", "a@b.com", new Date().toISOString());
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    await repo.createToken("tok-valid", "p1", expiresAt, "1234");

    await deleteExpiredTokens(repo, new Date().toISOString());

    expect(await repo.findToken("tok-valid")).not.toBeNull();
  });
});
