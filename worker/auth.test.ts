import { describe, expect, test, vi } from "vitest";
import {
  registerPatient,
  sendLoginLink,
  verifyPin,
  createSession,
  getSession,
  deleteSession,
} from "./auth";
import { makeInMemoryRepo, makeEmailSpy } from "./test/auth-helpers";

const identityHash = async (p: string) => p;

describe("registerPatient", () => {
  test("creates a patient, sends a verification email, and returns token", async () => {
    const repo = makeInMemoryRepo();
    const email = makeEmailSpy();

    const result = await registerPatient(
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
    expect(result.ok).toBe(true);
    expect(result.token).toBe(email.sent[0].token);
  });

  test("sends a verification email to an existing patient on duplicate registration", async () => {
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

    expect(result.ok).toBe(true);
    expect(typeof result.token).toBe("string");
    expect(email.sent).toHaveLength(2);
    expect(email.sent[1].to).toBe("delivered+auth-test@resend.dev");
  });
});

describe("sendLoginLink", () => {
  test("sends a login email to an existing patient and returns token", async () => {
    const repo = makeInMemoryRepo();
    const email = makeEmailSpy();
    await registerPatient(
      "delivered+auth-test@resend.dev",
      repo,
      email.sender,
      identityHash,
    );
    email.sent.length = 0; // clear the registration email

    const result = await sendLoginLink(
      "delivered+auth-test@resend.dev",
      repo,
      email.sender,
      identityHash,
    );

    expect(email.sent).toHaveLength(1);
    expect(email.sent[0].to).toBe("delivered+auth-test@resend.dev");
    expect(email.sent[0].type).toBe("login");
    expect(result.ok).toBe(true);
    expect(result.token).toBe(email.sent[0].token);
  });

  test("returns a token for unregistered email without sending email", async () => {
    const repo = makeInMemoryRepo();
    const email = makeEmailSpy();

    const result = await sendLoginLink(
      "unknown@resend.dev",
      repo,
      email.sender,
      identityHash,
    );

    expect(email.sent).toHaveLength(0);
    expect(result.ok).toBe(true);
    expect(typeof result.token).toBe("string");
    expect(result.token.length).toBeGreaterThan(0);
    expect(await repo.findToken(result.token)).not.toBeNull();
  });

  test("decoy token for unregistered email returns invalid for any PIN", async () => {
    const repo = makeInMemoryRepo();
    const email = makeEmailSpy();

    const result = await sendLoginLink(
      "unknown@resend.dev",
      repo,
      email.sender,
      identityHash,
    );

    const verification = await verifyPin(
      result.token,
      "1234",
      repo,
      identityHash,
    );
    expect(verification).toEqual({ error: "invalid" });
  });
});

describe("verifyPin", () => {
  test("returns expired for an unknown token", async () => {
    const repo = makeInMemoryRepo();

    const result = await verifyPin(
      "not-a-real-token",
      "1234",
      repo,
      identityHash,
    );

    expect(result).toEqual({ error: "expired" });
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

  test("deletes other unused tokens for the patient on success", async () => {
    const repo = makeInMemoryRepo();
    await repo.createPatient("p1", "a@b.com", new Date().toISOString());
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    await repo.createToken("tok1", "p1", expiresAt, "1111");
    await repo.createToken("tok2", "p1", expiresAt, "2222");

    await verifyPin("tok1", "1111", repo, identityHash);

    expect(await repo.findToken("tok2")).toBeNull();
  });

  test("does not delete tokens belonging to other patients on success", async () => {
    const repo = makeInMemoryRepo();
    await repo.createPatient("p1", "a@b.com", new Date().toISOString());
    await repo.createPatient("p2", "b@b.com", new Date().toISOString());
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    await repo.createToken("tok1", "p1", expiresAt, "1111");
    await repo.createToken("tok2", "p2", expiresAt, "2222");

    await verifyPin("tok1", "1111", repo, identityHash);

    expect(await repo.findToken("tok2")).not.toBeNull();
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
