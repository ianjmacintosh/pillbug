import { beforeEach, describe, expect, test, vi } from "vitest";
import worker from "./worker";
import { makeD1AuthRepo } from "./d1-auth-repo";
import { makeD1PrescriptionRepo } from "./d1-prescriptions-repo";
import { makeInMemoryRepo } from "./test/auth-helpers";
import { makeInMemoryPrescriptionRepo } from "./test/prescription-helpers";
import { verifyTurnstileToken } from "./turnstile";
import { checkHealth } from "./health";

vi.mock("./d1-auth-repo", () => ({ makeD1AuthRepo: vi.fn() }));
vi.mock("./d1-prescriptions-repo", () => ({ makeD1PrescriptionRepo: vi.fn() }));
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
  email = `patient-${crypto.randomUUID()}@resend.dev`,
) {
  const patientId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  await authRepo.createPatient(patientId, email, new Date().toISOString());
  await authRepo.updateLastLoginAt(patientId, new Date().toISOString());
  await authRepo.createSession(
    sessionId,
    patientId,
    new Date(Date.now() + 86400000).toISOString(),
  );
  return { patientId, sessionId, cookie: `session=${sessionId}` };
}

const VALID_PRESCRIPTION_BODY = {
  drugName: "Metformin",
  dosage: "500mg",
  schedule: { days: { monday: ["08:00"] }, timezoneMode: "local" },
  startDate: "2024-01-01",
};

beforeEach(() => {
  vi.mocked(makeD1AuthRepo).mockReturnValue(makeInMemoryRepo());
  vi.mocked(makeD1PrescriptionRepo).mockReturnValue(
    makeInMemoryPrescriptionRepo(),
  );
  vi.mocked(verifyTurnstileToken).mockResolvedValue(true);
  vi.mocked(checkHealth).mockResolvedValue({ ok: true } as never);
});

describe("POST /api/v1/prescriptions", () => {
  test("returns 401 when unauthenticated", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/api/v1/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(VALID_PRESCRIPTION_BODY),
      }),
      makeEnv(),
    );
    expect(response.status).toBe(401);
  });

  test("returns doseCount and doseForm in 201 response when provided", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    const { cookie } = await makeAuthenticatedSession(authRepo);

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          ...VALID_PRESCRIPTION_BODY,
          doseCount: 2,
          doseForm: "capsule",
        }),
      }),
      makeEnv(),
    );

    expect(response.status).toBe(201);
    const data = await response.json<Record<string, unknown>>();
    expect(data.doseCount).toBe(2);
    expect(data.doseForm).toBe("capsule");
  });

  test("returns doseCount=1 and doseForm=tablet when not provided in body", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    const { cookie } = await makeAuthenticatedSession(authRepo);

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify(VALID_PRESCRIPTION_BODY),
      }),
      makeEnv(),
    );

    expect(response.status).toBe(201);
    const data = await response.json<Record<string, unknown>>();
    expect(data.doseCount).toBe(1);
    expect(data.doseForm).toBe("tablet");
  });

  test("returns 201 with prescription object when authenticated with valid body", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    const { cookie } = await makeAuthenticatedSession(authRepo);

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify(VALID_PRESCRIPTION_BODY),
      }),
      makeEnv(),
    );

    expect(response.status).toBe(201);
    const data = await response.json<Record<string, unknown>>();
    expect(data.id).toBeTypeOf("string");
    expect(data.drugName).toBe("Metformin");
    expect(data.status).toBe("active");
    expect(data.patientId).toBeUndefined();
  });

  test("returns 400 when a required field is missing", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    const { cookie } = await makeAuthenticatedSession(authRepo);

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ drugName: "Metformin" }),
      }),
      makeEnv(),
    );

    expect(response.status).toBe(400);
    const data = await response.json<{ error: string }>();
    expect(data.error).toBe("missing_required_field");
  });
});

describe("GET /api/v1/prescriptions", () => {
  test("returns 401 when unauthenticated", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/api/v1/prescriptions"),
      makeEnv(),
    );
    expect(response.status).toBe(401);
  });

  test("returns 200 with empty array when patient has no prescriptions", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    const { cookie } = await makeAuthenticatedSession(authRepo);

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/prescriptions", {
        headers: { Cookie: cookie },
      }),
      makeEnv(),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  test("only returns prescriptions belonging to the requesting patient", async () => {
    const authRepo = makeInMemoryRepo();
    const prescriptionRepo = makeInMemoryPrescriptionRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    vi.mocked(makeD1PrescriptionRepo).mockReturnValue(prescriptionRepo);

    const { patientId: ownerId, cookie } =
      await makeAuthenticatedSession(authRepo);
    const { patientId: otherId } = await makeAuthenticatedSession(authRepo);

    await prescriptionRepo.createPrescription({
      id: crypto.randomUUID(),
      patientId: ownerId,
      doseCount: 1,
      doseForm: "tablet",
      drugName: "Mine",
      dosage: "10mg",
      schedule: { days: {}, timezoneMode: "local" },
      startDate: "2024-01-01",
      endDate: null,
      prescribingDoctor: null,
      instructions: null,
      status: "active",
      createdAt: new Date().toISOString(),
    });
    await prescriptionRepo.createPrescription({
      id: crypto.randomUUID(),
      patientId: otherId,
      doseCount: 1,
      doseForm: "tablet",
      drugName: "NotMine",
      dosage: "20mg",
      schedule: { days: {}, timezoneMode: "local" },
      startDate: "2024-01-01",
      endDate: null,
      prescribingDoctor: null,
      instructions: null,
      status: "active",
      createdAt: new Date().toISOString(),
    });

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/prescriptions", {
        headers: { Cookie: cookie },
      }),
      makeEnv(),
    );

    expect(response.status).toBe(200);
    const data = await response.json<{ drugName: string }[]>();
    expect(data).toHaveLength(1);
    expect(data[0].drugName).toBe("Mine");
  });
});

describe("GET /api/v1/prescriptions/:prescriptionId", () => {
  test("returns 401 when unauthenticated", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/api/v1/prescriptions/rx-1"),
      makeEnv(),
    );
    expect(response.status).toBe(401);
  });

  test("returns 404 when prescription not found", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    const { cookie } = await makeAuthenticatedSession(authRepo);

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/prescriptions/rx-missing", {
        headers: { Cookie: cookie },
      }),
      makeEnv(),
    );
    expect(response.status).toBe(404);
  });

  test("returns 200 with prescription when found", async () => {
    const authRepo = makeInMemoryRepo();
    const prescriptionRepo = makeInMemoryPrescriptionRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    vi.mocked(makeD1PrescriptionRepo).mockReturnValue(prescriptionRepo);

    const { patientId, cookie } = await makeAuthenticatedSession(authRepo);
    await prescriptionRepo.createPrescription({
      id: "rx-1",
      patientId,
      doseCount: 1,
      doseForm: "tablet",
      drugName: "Metformin",
      dosage: "500mg",
      schedule: { days: {}, timezoneMode: "local" },
      startDate: "2024-01-01",
      endDate: null,
      prescribingDoctor: null,
      instructions: null,
      status: "active",
      createdAt: new Date().toISOString(),
    });

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/prescriptions/rx-1", {
        headers: { Cookie: cookie },
      }),
      makeEnv(),
    );

    expect(response.status).toBe(200);
    const data = await response.json<Record<string, unknown>>();
    expect(data.id).toBe("rx-1");
    expect(data.drugName).toBe("Metformin");
    expect(data.patientId).toBeUndefined();
  });

  test("returns 404 when prescription belongs to a different patient", async () => {
    const authRepo = makeInMemoryRepo();
    const prescriptionRepo = makeInMemoryPrescriptionRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    vi.mocked(makeD1PrescriptionRepo).mockReturnValue(prescriptionRepo);

    const { cookie } = await makeAuthenticatedSession(authRepo);
    const { patientId: otherId } = await makeAuthenticatedSession(authRepo);
    await prescriptionRepo.createPrescription({
      id: "rx-1",
      patientId: otherId,
      doseCount: 1,
      doseForm: "tablet",
      drugName: "NotMine",
      dosage: "10mg",
      schedule: { days: {}, timezoneMode: "local" },
      startDate: "2024-01-01",
      endDate: null,
      prescribingDoctor: null,
      instructions: null,
      status: "active",
      createdAt: new Date().toISOString(),
    });

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/prescriptions/rx-1", {
        headers: { Cookie: cookie },
      }),
      makeEnv(),
    );
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/v1/prescriptions/:prescriptionId", () => {
  test("returns 401 when unauthenticated", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/api/v1/prescriptions/rx-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dosage: "1000mg" }),
      }),
      makeEnv(),
    );
    expect(response.status).toBe(401);
  });

  test("returns 404 when prescription not found or belongs to another patient", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    const { cookie } = await makeAuthenticatedSession(authRepo);

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/prescriptions/rx-missing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ dosage: "1000mg" }),
      }),
      makeEnv(),
    );
    expect(response.status).toBe(404);
  });

  test("returns 200 with updated doseCount and doseForm when patched", async () => {
    const authRepo = makeInMemoryRepo();
    const prescriptionRepo = makeInMemoryPrescriptionRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    vi.mocked(makeD1PrescriptionRepo).mockReturnValue(prescriptionRepo);

    const { patientId, cookie } = await makeAuthenticatedSession(authRepo);
    await prescriptionRepo.createPrescription({
      id: "rx-1",
      patientId,
      doseCount: 1,
      doseForm: "tablet",
      drugName: "Metformin",
      dosage: "500mg",
      schedule: { days: {}, timezoneMode: "local" },
      startDate: "2024-01-01",
      endDate: null,
      prescribingDoctor: null,
      instructions: null,
      status: "active",
      createdAt: new Date().toISOString(),
    });

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/prescriptions/rx-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ doseCount: 2, doseForm: "capsule" }),
      }),
      makeEnv(),
    );

    expect(response.status).toBe(200);
    const data = await response.json<Record<string, unknown>>();
    expect(data.doseCount).toBe(2);
    expect(data.doseForm).toBe("capsule");
  });

  test("returns 200 with updated prescription when valid partial body", async () => {
    const authRepo = makeInMemoryRepo();
    const prescriptionRepo = makeInMemoryPrescriptionRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    vi.mocked(makeD1PrescriptionRepo).mockReturnValue(prescriptionRepo);

    const { patientId, cookie } = await makeAuthenticatedSession(authRepo);
    await prescriptionRepo.createPrescription({
      id: "rx-1",
      patientId,
      doseCount: 1,
      doseForm: "tablet",
      drugName: "Metformin",
      dosage: "500mg",
      schedule: { days: {}, timezoneMode: "local" },
      startDate: "2024-01-01",
      endDate: null,
      prescribingDoctor: null,
      instructions: null,
      status: "active",
      createdAt: new Date().toISOString(),
    });

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/prescriptions/rx-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ dosage: "1000mg" }),
      }),
      makeEnv(),
    );

    expect(response.status).toBe(200);
    const data = await response.json<Record<string, unknown>>();
    expect(data.dosage).toBe("1000mg");
    expect(data.drugName).toBe("Metformin");
    expect(data.patientId).toBeUndefined();
  });
});

describe("DELETE /api/v1/prescriptions/:prescriptionId", () => {
  test("returns 401 when unauthenticated", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/api/v1/prescriptions/rx-1", {
        method: "DELETE",
      }),
      makeEnv(),
    );
    expect(response.status).toBe(401);
  });

  test("returns 404 when prescription not found or belongs to another patient", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    const { cookie } = await makeAuthenticatedSession(authRepo);

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/prescriptions/rx-missing", {
        method: "DELETE",
        headers: { Cookie: cookie },
      }),
      makeEnv(),
    );
    expect(response.status).toBe(404);
  });

  test("returns 200 with ok: true when prescription is deleted", async () => {
    const authRepo = makeInMemoryRepo();
    const prescriptionRepo = makeInMemoryPrescriptionRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    vi.mocked(makeD1PrescriptionRepo).mockReturnValue(prescriptionRepo);

    const { patientId, cookie } = await makeAuthenticatedSession(authRepo);
    await prescriptionRepo.createPrescription({
      id: "rx-1",
      patientId,
      doseCount: 1,
      doseForm: "tablet",
      drugName: "Metformin",
      dosage: "500mg",
      schedule: { days: {}, timezoneMode: "local" },
      startDate: "2024-01-01",
      endDate: null,
      prescribingDoctor: null,
      instructions: null,
      status: "active",
      createdAt: new Date().toISOString(),
    });

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/prescriptions/rx-1", {
        method: "DELETE",
        headers: { Cookie: cookie },
      }),
      makeEnv(),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
