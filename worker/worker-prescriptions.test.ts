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
  schedule: { days: "daily", times: [], timezoneMode: "local" },
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
      drugName: "Mine",
      dosage: "10mg",
      schedule: { days: "daily", times: [], timezoneMode: "local" },
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
      drugName: "NotMine",
      dosage: "20mg",
      schedule: { days: "daily", times: [], timezoneMode: "local" },
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
