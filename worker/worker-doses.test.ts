import { beforeEach, describe, expect, test, vi } from "vitest";
import worker from "./worker";
import { makeD1AuthRepo } from "./d1-auth-repo";
import { makeD1PrescriptionRepo } from "./d1-prescriptions-repo";
import { makeD1DoseRepo } from "./d1-doses-repo";
import { makeInMemoryRepo } from "./test/auth-helpers";
import { makeInMemoryPrescriptionRepo } from "./test/prescription-helpers";
import { makeInMemoryDoseRepo } from "./test/dose-helpers";
import { verifyTurnstileToken } from "./turnstile";
import { checkHealth } from "./health";
import type { Prescription } from "./prescriptions";

vi.mock("./d1-auth-repo", () => ({ makeD1AuthRepo: vi.fn() }));
vi.mock("./d1-prescriptions-repo", () => ({ makeD1PrescriptionRepo: vi.fn() }));
vi.mock("./d1-doses-repo", () => ({ makeD1DoseRepo: vi.fn() }));
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
  vi.mocked(verifyTurnstileToken).mockResolvedValue(true);
  vi.mocked(checkHealth).mockResolvedValue({ ok: true } as never);
});

describe("GET /api/v1/doses", () => {
  test("returns 401 when unauthenticated", async () => {
    const response = await worker.fetch(
      new Request(
        "http://localhost/api/v1/doses?start=2024-03-11&end=2024-03-17",
      ),
      makeEnv(),
    );
    expect(response.status).toBe(401);
  });

  test("returns 400 when start or end is missing", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    const { cookie } = await makeAuthenticatedSession(authRepo);

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/doses?start=2024-03-11", {
        headers: { Cookie: cookie },
      }),
      makeEnv(),
    );
    expect(response.status).toBe(400);
  });

  test("returns array of doses for the date range when authenticated", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    const { cookie } = await makeAuthenticatedSession(authRepo);

    const response = await worker.fetch(
      new Request(
        "http://localhost/api/v1/doses?start=2024-03-11&end=2024-03-17",
        {
          headers: { Cookie: cookie },
        },
      ),
      makeEnv(),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
});

describe("GET /api/v1/scheduled-doses", () => {
  test("returns 401 when unauthenticated", async () => {
    const response = await worker.fetch(
      new Request(
        "http://localhost/api/v1/scheduled-doses?start=2024-03-11&end=2024-03-17",
      ),
      makeEnv(),
    );
    expect(response.status).toBe(401);
  });

  test("returns 400 when start or end is missing", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    const { cookie } = await makeAuthenticatedSession(authRepo);

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/scheduled-doses?end=2024-03-17", {
        headers: { Cookie: cookie },
      }),
      makeEnv(),
    );
    expect(response.status).toBe(400);
  });

  test("returns projected scheduled doses for the week when authenticated", async () => {
    const authRepo = makeInMemoryRepo();
    const prescriptionRepo = makeInMemoryPrescriptionRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    vi.mocked(makeD1PrescriptionRepo).mockReturnValue(prescriptionRepo);
    const { patientId, cookie } = await makeAuthenticatedSession(authRepo);

    const prescription: Prescription = {
      id: crypto.randomUUID(),
      patientId,
      drugName: "Metformin",
      dosage: "500mg",
      schedule: { days: { monday: ["08:00"] }, timezoneMode: "local" },
      startDate: "2024-03-11",
      endDate: null,
      prescribingDoctor: null,
      instructions: null,
      status: "active",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    await prescriptionRepo.createPrescription(prescription);

    const response = await worker.fetch(
      new Request(
        "http://localhost/api/v1/scheduled-doses?start=2024-03-11&end=2024-03-17",
        {
          headers: { Cookie: cookie },
        },
      ),
      makeEnv(),
    );
    expect(response.status).toBe(200);
    const body = await response.json<unknown[]>();
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toMatchObject({
      prescriptionId: prescription.id,
      drugName: "Metformin",
      scheduledAt: "2024-03-11T08:00:00Z",
    });
  });
});
