import { beforeEach, describe, expect, test, vi } from "vitest";
import worker from "./worker";
import { makeD1AuthRepo } from "./d1-auth-repo";
import { makeD1PrescriptionRepo } from "./d1-prescriptions-repo";
import { makeD1DoseRepo } from "./d1-doses-repo";
import { makeD1FillSessionRepo } from "./d1-fill-sessions-repo";
import { makeInMemoryRepo } from "./test/auth-helpers";
import { makeInMemoryPrescriptionRepo } from "./test/prescription-helpers";
import { makeInMemoryDoseRepo } from "./test/dose-helpers";
import { makeInMemoryFillSessionRepo } from "./test/fill-session-helpers";
import { verifyTurnstileToken } from "./turnstile";
import { checkHealth } from "./health";

vi.mock("./d1-auth-repo", () => ({ makeD1AuthRepo: vi.fn() }));
vi.mock("./d1-prescriptions-repo", () => ({ makeD1PrescriptionRepo: vi.fn() }));
vi.mock("./d1-doses-repo", () => ({ makeD1DoseRepo: vi.fn() }));
vi.mock("./d1-fill-sessions-repo", () => ({ makeD1FillSessionRepo: vi.fn() }));
vi.mock("./turnstile", () => ({ verifyTurnstileToken: vi.fn() }));
vi.mock("./health", () => ({ checkHealth: vi.fn() }));

function makeEnv(): Parameters<typeof worker.fetch>[1] {
  return {
    ASSETS: { fetch: vi.fn().mockResolvedValue(new Response("ok")) },
    DB: {},
    RESEND_API_KEY: "test-key",
    APP_URL: "http://localhost",
    TURNSTILE_SECRET_KEY: "test-turnstile-secret",
    EMAIL_SECRET: "test-email-secret",
  } as unknown as Parameters<typeof worker.fetch>[1];
}

async function makeAuthenticatedSession(
  authRepo: ReturnType<typeof makeInMemoryRepo>,
) {
  const patientId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  await authRepo.createPatient(
    patientId,
    `patient-${patientId}@resend.dev`,
    new Date().toISOString(),
  );
  await authRepo.updateLastLoginAt(patientId, new Date().toISOString());
  await authRepo.createSession(
    sessionId,
    patientId,
    new Date(Date.now() + 86400000).toISOString(),
  );
  return { patientId, sessionId, cookie: `session=${sessionId}` };
}

beforeEach(() => {
  vi.mocked(makeD1AuthRepo).mockReturnValue(makeInMemoryRepo());
  vi.mocked(makeD1PrescriptionRepo).mockReturnValue(
    makeInMemoryPrescriptionRepo(),
  );
  vi.mocked(makeD1DoseRepo).mockReturnValue(makeInMemoryDoseRepo());
  vi.mocked(makeD1FillSessionRepo).mockReturnValue(
    makeInMemoryFillSessionRepo(),
  );
  vi.mocked(verifyTurnstileToken).mockResolvedValue(true);
  vi.mocked(checkHealth).mockResolvedValue({ ok: true } as never);
});

describe("POST /api/v1/fill-session", () => {
  test("returns 401 when unauthenticated", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/api/v1/fill-session", {
        method: "POST",
      }),
      makeEnv(),
    );
    expect(response.status).toBe(401);
  });

  test("returns 201 with the created fill session on authenticated request", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    const { patientId, cookie } = await makeAuthenticatedSession(authRepo);

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/fill-session", {
        method: "POST",
        headers: { Cookie: cookie },
      }),
      makeEnv(),
    );

    expect(response.status).toBe(201);
    const body = await response.json<Record<string, unknown>>();
    expect(body.id).toBeTruthy();
    expect(body.patientId).toBe(patientId);
    expect(body.completedAt).toBeTruthy();
  });
});
