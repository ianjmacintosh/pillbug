import { beforeEach, describe, expect, test, vi } from "vitest";
import worker from "./worker";
import { makeD1AuthRepo } from "./d1-auth-repo";
import { makeD1PrescriptionRepo } from "./d1-prescriptions-repo";
import { makeInMemoryRepo } from "./test/auth-helpers";
import { makeInMemoryPrescriptionRepo } from "./test/prescription-helpers";

vi.mock("./d1-auth-repo", () => ({ makeD1AuthRepo: vi.fn() }));
vi.mock("./d1-prescriptions-repo", () => ({
  makeD1PrescriptionRepo: vi.fn(),
}));

const { mockPage, mockBrowser } = vi.hoisted(() => {
  const fakePdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
  const mockPage = {
    setContent: vi.fn().mockResolvedValue(undefined),
    pdf: vi.fn().mockResolvedValue(fakePdf),
    close: vi.fn().mockResolvedValue(undefined),
  };
  const mockBrowser = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn().mockResolvedValue(undefined),
  };
  return { mockPage, mockBrowser };
});

vi.mock("@cloudflare/puppeteer", () => ({
  default: { launch: vi.fn().mockResolvedValue(mockBrowser) },
}));

function makeEnv(): Parameters<typeof worker.fetch>[1] {
  return {
    ASSETS: { fetch: vi.fn().mockResolvedValue(new Response("ok")) },
    DB: {},
    RESEND_API_KEY: "test-key",
    APP_URL: "http://localhost",
    TURNSTILE_SECRET_KEY: "test-turnstile-secret",
    EMAIL_SECRET: "test-email-secret",
    BROWSER: {},
  } as unknown as Parameters<typeof worker.fetch>[1];
}

async function makeAuthenticatedSession(
  authRepo: ReturnType<typeof makeInMemoryRepo>,
) {
  const patientId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  await authRepo.createPatient(
    patientId,
    `p-${patientId}@resend.dev`,
    new Date().toISOString(),
  );
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
  vi.clearAllMocks();
});

describe("GET /api/v1/fill-session/pdf", () => {
  test("returns 401 when unauthenticated", async () => {
    const res = await worker.fetch(
      new Request("http://localhost/api/v1/fill-session/pdf"),
      makeEnv(),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "not_authenticated" });
  });

  test("returns PDF with correct Content-Type when authenticated", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    vi.mocked(makeD1PrescriptionRepo).mockReturnValue(
      makeInMemoryPrescriptionRepo(),
    );
    mockBrowser.newPage.mockResolvedValue(mockPage);
    mockPage.pdf.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const { cookie } = await makeAuthenticatedSession(authRepo);

    const res = await worker.fetch(
      new Request("http://localhost/api/v1/fill-session/pdf", {
        headers: { Cookie: cookie },
      }),
      makeEnv(),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
  });

  test("Content-Disposition filename follows Pillbug_Worksheet-{monday}-{sunday} format", async () => {
    const authRepo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    vi.mocked(makeD1PrescriptionRepo).mockReturnValue(
      makeInMemoryPrescriptionRepo(),
    );
    mockBrowser.newPage.mockResolvedValue(mockPage);
    mockPage.pdf.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const { cookie } = await makeAuthenticatedSession(authRepo);

    const res = await worker.fetch(
      new Request("http://localhost/api/v1/fill-session/pdf", {
        headers: { Cookie: cookie },
      }),
      makeEnv(),
    );

    const disposition = res.headers.get("Content-Disposition") ?? "";
    expect(disposition).toMatch(
      /^attachment; filename="Pillbug_Worksheet-\d{4}_\d{2}_\d{2}-\d{4}_\d{2}_\d{2}\.pdf"$/,
    );
  });

  test("organizer=2 generates HTML with AM and PM compartment labels", async () => {
    const authRepo = makeInMemoryRepo();
    const prescriptionRepo = makeInMemoryPrescriptionRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    vi.mocked(makeD1PrescriptionRepo).mockReturnValue(prescriptionRepo);
    mockBrowser.newPage.mockResolvedValue(mockPage);
    mockPage.pdf.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const { patientId, cookie } = await makeAuthenticatedSession(authRepo);

    await prescriptionRepo.createPrescription({
      id: crypto.randomUUID(),
      patientId,
      drugName: "Metformin",
      dosage: "500mg",
      doseForm: "tablet",
      status: "active",
      schedule: { days: { monday: [{ time: "08:00", quantity: 1 }] } },
      startDate: "2024-01-01",
      endDate: null,
      prescribingDoctor: null,
      instructions: null,
      createdAt: new Date().toISOString(),
    });

    await worker.fetch(
      new Request("http://localhost/api/v1/fill-session/pdf?organizer=2", {
        headers: { Cookie: cookie },
      }),
      makeEnv(),
    );

    const html: string = mockPage.setContent.mock.calls.at(-1)?.[0] ?? "";
    expect(html).toContain("AM");
    expect(html).toContain("PM");
  });

  test("?startDate column headers include the calendar date for each day", async () => {
    const authRepo = makeInMemoryRepo();
    const prescriptionRepo = makeInMemoryPrescriptionRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    vi.mocked(makeD1PrescriptionRepo).mockReturnValue(prescriptionRepo);
    mockBrowser.newPage.mockResolvedValue(mockPage);
    mockPage.pdf.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const { patientId, cookie } = await makeAuthenticatedSession(authRepo);

    await prescriptionRepo.createPrescription({
      id: crypto.randomUUID(),
      patientId,
      drugName: "Metformin",
      dosage: "500mg",
      doseForm: "tablet",
      status: "active",
      schedule: { days: { tuesday: [{ time: "08:00", quantity: 1 }] } },
      startDate: "2024-01-01",
      endDate: null,
      prescribingDoctor: null,
      instructions: null,
      createdAt: new Date().toISOString(),
    });

    await worker.fetch(
      new Request(
        "http://localhost/api/v1/fill-session/pdf?startDate=2024-03-12",
        { headers: { Cookie: cookie } },
      ),
      makeEnv(),
    );

    const html: string = mockPage.setContent.mock.calls.at(-1)?.[0] ?? "";
    expect(html).toContain("Mar 12"); // Tuesday — the start date
    expect(html).toContain("Mar 17"); // Sunday — wrapped to next week
  });

  test("?startDate on a non-Sunday marks wrapped days with day-header--wrapped class", async () => {
    const authRepo = makeInMemoryRepo();
    const prescriptionRepo = makeInMemoryPrescriptionRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    vi.mocked(makeD1PrescriptionRepo).mockReturnValue(prescriptionRepo);
    mockBrowser.newPage.mockResolvedValue(mockPage);
    mockPage.pdf.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const { patientId, cookie } = await makeAuthenticatedSession(authRepo);

    await prescriptionRepo.createPrescription({
      id: crypto.randomUUID(),
      patientId,
      drugName: "Lisinopril",
      dosage: "10mg",
      doseForm: "tablet",
      status: "active",
      schedule: { days: { tuesday: [{ time: "08:00", quantity: 1 }] } },
      startDate: "2024-01-01",
      endDate: null,
      prescribingDoctor: null,
      instructions: null,
      createdAt: new Date().toISOString(),
    });

    await worker.fetch(
      new Request(
        "http://localhost/api/v1/fill-session/pdf?startDate=2024-03-12",
        { headers: { Cookie: cookie } },
      ),
      makeEnv(),
    );

    const html: string = mockPage.setContent.mock.calls.at(-1)?.[0] ?? "";
    // Check for the class on an element, not in the CSS definition
    expect(html).toContain('class="day-header day-header--wrapped"');
  });

  test("?startDate on a Sunday has no wrapped day elements", async () => {
    const authRepo = makeInMemoryRepo();
    const prescriptionRepo = makeInMemoryPrescriptionRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    vi.mocked(makeD1PrescriptionRepo).mockReturnValue(prescriptionRepo);
    mockBrowser.newPage.mockResolvedValue(mockPage);
    mockPage.pdf.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const { patientId, cookie } = await makeAuthenticatedSession(authRepo);

    await prescriptionRepo.createPrescription({
      id: crypto.randomUUID(),
      patientId,
      drugName: "Lisinopril",
      dosage: "10mg",
      doseForm: "tablet",
      status: "active",
      schedule: { days: { sunday: [{ time: "08:00", quantity: 1 }] } },
      startDate: "2024-01-01",
      endDate: null,
      prescribingDoctor: null,
      instructions: null,
      createdAt: new Date().toISOString(),
    });

    await worker.fetch(
      new Request(
        "http://localhost/api/v1/fill-session/pdf?startDate=2024-03-17",
        { headers: { Cookie: cookie } },
      ),
      makeEnv(),
    );

    const html: string = mockPage.setContent.mock.calls.at(-1)?.[0] ?? "";
    // No element should carry the wrapped class (the CSS def is in <style> but no element should have it)
    expect(html).not.toContain('class="day-header day-header--wrapped"');
  });

  test("missing organizer param defaults to single Daily compartment", async () => {
    const authRepo = makeInMemoryRepo();
    const prescriptionRepo = makeInMemoryPrescriptionRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(authRepo);
    vi.mocked(makeD1PrescriptionRepo).mockReturnValue(prescriptionRepo);
    mockBrowser.newPage.mockResolvedValue(mockPage);
    mockPage.pdf.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const { patientId, cookie } = await makeAuthenticatedSession(authRepo);

    await prescriptionRepo.createPrescription({
      id: crypto.randomUUID(),
      patientId,
      drugName: "Lisinopril",
      dosage: "10mg",
      doseForm: "tablet",
      status: "active",
      schedule: { days: { monday: [{ time: "08:00", quantity: 1 }] } },
      startDate: "2024-01-01",
      endDate: null,
      prescribingDoctor: null,
      instructions: null,
      createdAt: new Date().toISOString(),
    });

    await worker.fetch(
      new Request("http://localhost/api/v1/fill-session/pdf", {
        headers: { Cookie: cookie },
      }),
      makeEnv(),
    );

    const html: string = mockPage.setContent.mock.calls.at(-1)?.[0] ?? "";
    expect(html).toContain("Daily");
  });
});
