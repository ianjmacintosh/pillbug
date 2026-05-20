import { describe, expect, test, vi } from "vitest";
import {
  registerPatient,
  sendLoginLink,
  verifyToken,
  verifyPin,
  createSession,
  getSession,
  deleteSession,
} from "./auth";
import { makeInMemoryRepo, makeEmailSpy } from "./test/auth-helpers";

const identityHash = async (p: string) => p;

describe("registerPatient", () => {
  test("creates a patient and sends a magic link", async () => {
    const repo = makeInMemoryRepo();
    const email = makeEmailSpy();

    await registerPatient(
      "delivered+auth-test@resend.dev",
      repo,
      email.sender,
      identityHash,
    );

    expect(
      await repo.findPatientByEmail("delivered+auth-test@resend.dev"),
    ).not.toBeNull();
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0].to).toBe("delivered+auth-test@resend.dev");
    expect(email.sent[0].type).toBe("verification");
  });

  test("sends a magic link to an existing patient on duplicate registration", async () => {
    const repo = makeInMemoryRepo();
    const email = makeEmailSpy();

    await registerPatient(
      "delivered+auth-test@resend.dev",
      repo,
      email.sender,
      identityHash,
    );
    const result = await registerPatient(
      "delivered+auth-test@resend.dev",
      repo,
      email.sender,
      identityHash,
    );

    expect(result).toEqual({ ok: true });
    expect(email.sent).toHaveLength(2);
    expect(email.sent[1].to).toBe("delivered+auth-test@resend.dev");
  });
});

describe("sendLoginLink", () => {
  test("sends a login email to an existing patient", async () => {
    const repo = makeInMemoryRepo();
    const email = makeEmailSpy();
    await registerPatient(
      "delivered+auth-test@resend.dev",
      repo,
      email.sender,
      identityHash,
    );
    email.sent.length = 0; // clear the registration email

    await sendLoginLink(
      "delivered+auth-test@resend.dev",
      repo,
      email.sender,
      identityHash,
    );

    expect(email.sent).toHaveLength(1);
    expect(email.sent[0].to).toBe("delivered+auth-test@resend.dev");
    expect(email.sent[0].type).toBe("login");
  });
});

describe("verifyToken", () => {
  test("accepts a valid unused token", async () => {
    const repo = makeInMemoryRepo();
    const email = makeEmailSpy();
    await registerPatient(
      "delivered+auth-test@resend.dev",
      repo,
      email.sender,
      identityHash,
    );
    const token = email.sent[0].token;

    const result = await verifyToken(token, repo);

    expect(result).toMatchObject({ ok: true });
  });

  test("rejects an invalid token", async () => {
    const repo = makeInMemoryRepo();
    const result = await verifyToken("not-a-real-token", repo);
    expect(result).toEqual({ error: "invalid" });
  });

  test("rejects an already-used token", async () => {
    const repo = makeInMemoryRepo();
    const email = makeEmailSpy();
    await registerPatient(
      "delivered+auth-test@resend.dev",
      repo,
      email.sender,
      identityHash,
    );
    const token = email.sent[0].token;

    await verifyToken(token, repo);
    const result = await verifyToken(token, repo);

    expect(result).toEqual({ error: "used" });
  });

  test("marks the token as used so it cannot be redeemed again", async () => {
    const repo = makeInMemoryRepo();
    const email = makeEmailSpy();
    await registerPatient(
      "delivered+auth-test@resend.dev",
      repo,
      email.sender,
      identityHash,
    );
    const token = email.sent[0].token;

    const first = await verifyToken(token, repo);
    expect(first).toMatchObject({ ok: true });

    const second = await verifyToken(token, repo);
    expect(second).toEqual({ error: "used" });
  });

  test("sets last_login_at on first redemption", async () => {
    const repo = makeInMemoryRepo();
    const email = makeEmailSpy();
    await registerPatient(
      "delivered+auth-test@resend.dev",
      repo,
      email.sender,
      identityHash,
    );
    const token = email.sent[0].token;

    expect(
      (await repo.findPatientByEmail("delivered+auth-test@resend.dev"))
        ?.lastLoginAt,
    ).toBeNull();

    await verifyToken(token, repo);

    expect(
      (await repo.findPatientByEmail("delivered+auth-test@resend.dev"))
        ?.lastLoginAt,
    ).not.toBeNull();
  });

  test("updates last_login_at on subsequent logins", async () => {
    const repo = makeInMemoryRepo();
    const email = makeEmailSpy();
    await registerPatient(
      "delivered+auth-test@resend.dev",
      repo,
      email.sender,
      identityHash,
    );

    await verifyToken(email.sent[0].token, repo);
    const firstLoginAt = (
      await repo.findPatientByEmail("delivered+auth-test@resend.dev")
    )?.lastLoginAt;

    vi.setSystemTime(new Date(Date.now() + 60 * 1000));
    await registerPatient(
      "delivered+auth-test@resend.dev",
      repo,
      email.sender,
      identityHash,
    );
    await verifyToken(email.sent[1].token, repo);
    vi.useRealTimers();

    const secondLoginAt = (
      await repo.findPatientByEmail("delivered+auth-test@resend.dev")
    )?.lastLoginAt;

    expect(secondLoginAt).not.toBeNull();
    expect(secondLoginAt).not.toBe(firstLoginAt);
  });

  test("rejects an expired token", async () => {
    const repo = makeInMemoryRepo();
    const email = makeEmailSpy();
    await registerPatient(
      "delivered+auth-test@resend.dev",
      repo,
      email.sender,
      identityHash,
    );
    const token = email.sent[0].token;

    vi.setSystemTime(new Date(Date.now() + 21 * 60 * 1000));
    const result = await verifyToken(token, repo);
    vi.useRealTimers();

    expect(result).toEqual({ error: "expired" });
  });
});

describe("verifyPin", () => {
  test("returns invalid for an unknown token", async () => {
    const repo = makeInMemoryRepo();

    const result = await verifyPin(
      "not-a-real-token",
      "1234",
      repo,
      identityHash,
    );

    expect(result).toEqual({ error: "invalid" });
  });

  test("returns locked after 5 failed attempts", async () => {
    const repo = makeInMemoryRepo();
    await repo.createPatient("p1", "a@b.com", new Date().toISOString());
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    await repo.createToken("tok", "p1", expiresAt, "correct-hash");
    for (let i = 0; i < 5; i++) await repo.incrementFailedAttempts("tok");

    const result = await verifyPin("tok", "wrong", repo, identityHash);

    expect(result).toEqual({ error: "locked" });
  });

  test("returns used for an already-redeemed token", async () => {
    const repo = makeInMemoryRepo();
    await repo.createPatient("p1", "a@b.com", new Date().toISOString());
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    await repo.createToken("tok", "p1", expiresAt, "1234");
    await repo.markTokenUsed("tok", new Date().toISOString());

    const result = await verifyPin("tok", "1234", repo, identityHash);

    expect(result).toEqual({ error: "used" });
  });

  test("returns expired for a past-TTL token", async () => {
    const repo = makeInMemoryRepo();
    await repo.createPatient("p1", "a@b.com", new Date().toISOString());
    const expiresAt = new Date(Date.now() - 1).toISOString();
    await repo.createToken("tok", "p1", expiresAt, "1234");

    const result = await verifyPin("tok", "1234", repo, identityHash);

    expect(result).toEqual({ error: "expired" });
  });

  test("returns invalid and increments failed attempts for a wrong PIN", async () => {
    const repo = makeInMemoryRepo();
    await repo.createPatient("p1", "a@b.com", new Date().toISOString());
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    await repo.createToken("tok", "p1", expiresAt, "correct-hash");

    const result = await verifyPin("tok", "wrong", repo, identityHash);

    expect(result).toEqual({ error: "invalid" });
    expect((await repo.findToken("tok"))?.failedAttempts).toBe(1);
  });

  test("returns ok with patientId for a correct PIN", async () => {
    const repo = makeInMemoryRepo();
    await repo.createPatient("p1", "a@b.com", new Date().toISOString());
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    await repo.createToken("tok", "p1", expiresAt, "1234");

    const result = await verifyPin("tok", "1234", repo, identityHash);

    expect(result).toEqual({ ok: true, patientId: "p1" });
  });

  test("marks the token used on success so it cannot be redeemed again", async () => {
    const repo = makeInMemoryRepo();
    await repo.createPatient("p1", "a@b.com", new Date().toISOString());
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    await repo.createToken("tok", "p1", expiresAt, "1234");

    await verifyPin("tok", "1234", repo, identityHash);
    const result = await verifyPin("tok", "1234", repo, identityHash);

    expect(result).toEqual({ error: "used" });
  });

  test("sets last_login_at on success", async () => {
    const repo = makeInMemoryRepo();
    await repo.createPatient("p1", "a@b.com", new Date().toISOString());
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    await repo.createToken("tok", "p1", expiresAt, "1234");

    expect((await repo.findPatientByEmail("a@b.com"))?.lastLoginAt).toBeNull();

    await verifyPin("tok", "1234", repo, identityHash);

    expect(
      (await repo.findPatientByEmail("a@b.com"))?.lastLoginAt,
    ).not.toBeNull();
  });

  test("verifyToken (magic link) succeeds even after 5 failed PIN attempts", async () => {
    const repo = makeInMemoryRepo();
    const email = makeEmailSpy();
    await registerPatient(
      "delivered+auth-test@resend.dev",
      repo,
      email.sender,
      identityHash,
    );
    const token = email.sent[0].token;
    for (let i = 0; i < 5; i++) await repo.incrementFailedAttempts(token);

    const result = await verifyToken(token, repo);

    expect(result).toMatchObject({ ok: true });
  });
});

describe("createSession", () => {
  test("returns a session id", async () => {
    const repo = makeInMemoryRepo();
    const sessionId = await createSession("patient-123", repo);
    expect(typeof sessionId).toBe("string");
    expect(sessionId.length).toBeGreaterThan(0);
  });
});

describe("getSession", () => {
  test("returns the patient for a valid session", async () => {
    const repo = makeInMemoryRepo();
    const sessionId = await createSession("patient-123", repo);
    expect(await getSession(sessionId, repo)).toEqual({
      patientId: "patient-123",
    });
  });

  test("returns null for an unknown session", async () => {
    const repo = makeInMemoryRepo();
    expect(await getSession("unknown", repo)).toBeNull();
  });

  test("returns null for an expired session", async () => {
    const repo = makeInMemoryRepo();
    const sessionId = await createSession("patient-123", repo);

    vi.setSystemTime(new Date(Date.now() + 31 * 24 * 60 * 60 * 1000));
    const result = await getSession(sessionId, repo);
    vi.useRealTimers();

    expect(result).toBeNull();
  });
});

describe("deleteSession", () => {
  test("removes the session", async () => {
    const repo = makeInMemoryRepo();
    const sessionId = await createSession("patient-123", repo);
    await deleteSession(sessionId, repo);
    expect(await getSession(sessionId, repo)).toBeNull();
  });
});
