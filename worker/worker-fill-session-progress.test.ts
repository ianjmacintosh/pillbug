import { beforeEach, describe, expect, test, vi } from "vitest";
import worker from "./worker";
import { makeD1AuthRepo } from "./d1-auth-repo";
import { makeD1FillSessionProgressRepo } from "./d1-fill-session-progress-repo";
import { makeInMemoryRepo } from "./test/auth-helpers";
import { makeInMemoryFillSessionProgressRepo } from "./test/fill-session-progress-helpers";
import { verifyTurnstileToken } from "./turnstile";
import { checkHealth } from "./health";

vi.mock("./d1-auth-repo", () => ({ makeD1AuthRepo: vi.fn() }));
vi.mock("./d1-fill-session-progress-repo", () => ({
  makeD1FillSessionProgressRepo: vi.fn(),
}));
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
  vi.mocked(makeD1FillSessionProgressRepo).mockReturnValue(
    makeInMemoryFillSessionProgressRepo(),
  );
  vi.mocked(verifyTurnstileToken).mockResolvedValue(true);
  vi.mocked(checkHealth).mockResolvedValue({ ok: true } as never);
});

describe("GET /api/v1/fill-session/progress", () => {
  test("returns 401 when unauthenticated", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/api/v1/fill-session/progress"),
      makeEnv(),
    );
    expect(response.status).toBe(401);
  });

  test("returns progress: null when nothing saved", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    const { cookie } = await makeAuthenticatedSession(authRepo);

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/fill-session/progress", {
        headers: { Cookie: cookie },
      }),
      makeEnv(),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, progress: null });
  });

  test("returns the saved progress for the authenticated patient", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    const { cookie } = await makeAuthenticatedSession(authRepo);

    await worker.fetch(
      new Request("http://localhost/api/v1/fill-session/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          step: "step3",
          organizerType: "2",
          startDate: "2026-08-02",
          currentIndex: 1,
        }),
      }),
      makeEnv(),
    );

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/fill-session/progress", {
        headers: { Cookie: cookie },
      }),
      makeEnv(),
    );
    expect(response.status).toBe(200);
    const body = await response.json<{
      ok: boolean;
      progress: Record<string, unknown> | null;
    }>();
    expect(body.progress).toMatchObject({
      step: "step3",
      organizerType: "2",
      startDate: "2026-08-02",
      currentIndex: 1,
    });
    expect(body.progress?.updatedAt).toBeTruthy();
  });

  test("does not leak another patient's progress", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    const patientA = await makeAuthenticatedSession(authRepo);
    const patientB = await makeAuthenticatedSession(authRepo);

    await worker.fetch(
      new Request("http://localhost/api/v1/fill-session/progress", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: patientA.cookie,
        },
        body: JSON.stringify({
          step: "step3",
          organizerType: "2",
          startDate: "2026-08-02",
          currentIndex: 0,
        }),
      }),
      makeEnv(),
    );

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/fill-session/progress", {
        headers: { Cookie: patientB.cookie },
      }),
      makeEnv(),
    );
    expect(await response.json()).toEqual({ ok: true, progress: null });
  });

  test("treats progress older than 24 hours as absent", async () => {
    const authRepo = makeInMemoryRepo();
    const progressRepo = makeInMemoryFillSessionProgressRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    vi.mocked(makeD1FillSessionProgressRepo).mockReturnValue(progressRepo);
    const { patientId, cookie } = await makeAuthenticatedSession(authRepo);

    await progressRepo.upsertProgress({
      patientId,
      step: "step3",
      organizerType: "2",
      startDate: "2026-08-02",
      currentIndex: 0,
      updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    });

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/fill-session/progress", {
        headers: { Cookie: cookie },
      }),
      makeEnv(),
    );
    expect(await response.json()).toEqual({ ok: true, progress: null });
  });
});

describe("PUT /api/v1/fill-session/progress", () => {
  test("returns 401 when unauthenticated", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/api/v1/fill-session/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "step1",
          organizerType: "1",
          startDate: "2026-08-02",
          currentIndex: 0,
        }),
      }),
      makeEnv(),
    );
    expect(response.status).toBe(401);
  });

  test("returns 422 for an invalid step", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    const { cookie } = await makeAuthenticatedSession(authRepo);

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/fill-session/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          step: "step99",
          organizerType: "1",
          startDate: "2026-08-02",
          currentIndex: 0,
        }),
      }),
      makeEnv(),
    );
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "invalid_step" });
  });

  test("upserts, replacing prior progress for the same patient", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    const { cookie } = await makeAuthenticatedSession(authRepo);

    for (const step of ["step1", "step2"]) {
      await worker.fetch(
        new Request("http://localhost/api/v1/fill-session/progress", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Cookie: cookie },
          body: JSON.stringify({
            step,
            organizerType: "1",
            startDate: "2026-08-02",
            currentIndex: 0,
          }),
        }),
        makeEnv(),
      );
    }

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/fill-session/progress", {
        headers: { Cookie: cookie },
      }),
      makeEnv(),
    );
    const body = await response.json<{ progress: { step: string } }>();
    expect(body.progress.step).toBe("step2");
  });
});

describe("DELETE /api/v1/fill-session/progress", () => {
  test("returns 401 when unauthenticated", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/api/v1/fill-session/progress", {
        method: "DELETE",
      }),
      makeEnv(),
    );
    expect(response.status).toBe(401);
  });

  test("clears saved progress", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    const { cookie } = await makeAuthenticatedSession(authRepo);

    await worker.fetch(
      new Request("http://localhost/api/v1/fill-session/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          step: "step3",
          organizerType: "1",
          startDate: "2026-08-02",
          currentIndex: 0,
        }),
      }),
      makeEnv(),
    );

    const deleteResponse = await worker.fetch(
      new Request("http://localhost/api/v1/fill-session/progress", {
        method: "DELETE",
        headers: { Cookie: cookie },
      }),
      makeEnv(),
    );
    expect(deleteResponse.status).toBe(200);

    const getResponse = await worker.fetch(
      new Request("http://localhost/api/v1/fill-session/progress", {
        headers: { Cookie: cookie },
      }),
      makeEnv(),
    );
    expect(await getResponse.json()).toEqual({ ok: true, progress: null });
  });
});
