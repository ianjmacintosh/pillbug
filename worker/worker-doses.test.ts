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

describe("POST /api/v1/doses", () => {
  test("returns 401 when unauthenticated", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/api/v1/doses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescriptionId: "rx-1",
          scheduledAt: "2024-03-11T08:00:00Z",
          status: "taken",
        }),
      }),
      makeEnv(),
    );
    expect(response.status).toBe(401);
  });

  test("returns 400 when required fields are missing", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    const { cookie } = await makeAuthenticatedSession(authRepo);

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/doses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ prescriptionId: "rx-1" }),
      }),
      makeEnv(),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "missing_required_field" });
  });

  test("returns 201 with the created dose on valid authenticated request", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    const { patientId, cookie } = await makeAuthenticatedSession(authRepo);

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/doses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          prescriptionId: "rx-1",
          scheduledAt: "2024-03-11T08:00:00Z",
          status: "taken",
        }),
      }),
      makeEnv(),
    );
    expect(response.status).toBe(201);
    const body = await response.json<Record<string, unknown>>();
    expect(body.id).toBeTruthy();
    expect(body.patientId).toBe(patientId);
    expect(body.prescriptionId).toBe("rx-1");
    expect(body.scheduledAt).toBe("2024-03-11T08:00:00Z");
    expect(body.status).toBe("taken");
    expect(body.loggedAt).toBeTruthy();
    expect(body.createdAt).toBeTruthy();
  });
});

describe("PATCH /api/v1/doses/:doseId", () => {
  test("returns 401 when unauthenticated", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/api/v1/doses/some-dose-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "missed" }),
      }),
      makeEnv(),
    );
    expect(response.status).toBe(401);
  });

  test("returns 400 when status is missing", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    const { cookie } = await makeAuthenticatedSession(authRepo);

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/doses/some-dose-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({}),
      }),
      makeEnv(),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "missing_required_field" });
  });

  test("returns 404 when dose does not exist", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    const { cookie } = await makeAuthenticatedSession(authRepo);

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/doses/nonexistent-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ status: "missed" }),
      }),
      makeEnv(),
    );
    expect(response.status).toBe(404);
  });

  test("returns 200 with updated dose", async () => {
    const authRepo = makeInMemoryRepo();
    const doseRepo = makeInMemoryDoseRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    vi.mocked(makeD1DoseRepo).mockReturnValue(doseRepo);
    const { patientId, cookie } = await makeAuthenticatedSession(authRepo);

    const existing = {
      id: "dose-abc",
      patientId,
      prescriptionId: "rx-1",
      scheduledAt: "2024-03-11T08:00:00Z",
      status: "taken" as const,
      loggedAt: "2024-03-11T08:05:00Z",
      createdAt: "2024-03-11T08:05:00Z",
    };
    await doseRepo.createDose(existing);

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/doses/dose-abc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ status: "missed" }),
      }),
      makeEnv(),
    );
    expect(response.status).toBe(200);
    const body = await response.json<Record<string, unknown>>();
    expect(body.id).toBe("dose-abc");
    expect(body.status).toBe("missed");
  });
});

describe("DELETE /api/v1/doses/:doseId", () => {
  test("returns 401 when unauthenticated", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/api/v1/doses/some-dose-id", {
        method: "DELETE",
      }),
      makeEnv(),
    );
    expect(response.status).toBe(401);
  });

  test("returns 404 when dose does not exist", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    const { cookie } = await makeAuthenticatedSession(authRepo);

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/doses/nonexistent-id", {
        method: "DELETE",
        headers: { Cookie: cookie },
      }),
      makeEnv(),
    );
    expect(response.status).toBe(404);
  });

  test("returns 200 and removes the dose", async () => {
    const authRepo = makeInMemoryRepo();
    const doseRepo = makeInMemoryDoseRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    vi.mocked(makeD1DoseRepo).mockReturnValue(doseRepo);
    const { patientId, cookie } = await makeAuthenticatedSession(authRepo);

    await doseRepo.createDose({
      id: "dose-to-delete",
      patientId,
      prescriptionId: "rx-1",
      scheduledAt: "2024-03-11T08:00:00Z",
      status: "taken",
      loggedAt: "2024-03-11T08:05:00Z",
      createdAt: "2024-03-11T08:05:00Z",
    });

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/doses/dose-to-delete", {
        method: "DELETE",
        headers: { Cookie: cookie },
      }),
      makeEnv(),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    const remaining = await doseRepo.listDoses(
      patientId,
      "2024-03-11",
      "2024-03-11",
    );
    expect(remaining).toHaveLength(0);
  });
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
