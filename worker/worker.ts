import {
  registerPatient,
  sendLoginLink,
  verifyPin,
  createSession,
  getSession,
  deleteSession,
} from "./auth";
import { hashPin as hashPinFn } from "./email-crypto";
import { deleteStaleUnverifiedPatients, deleteExpiredTokens } from "./cron";
import { Resend } from "resend";
import { makeD1AuthRepo } from "./d1-auth-repo";
import { makeD1PrescriptionRepo } from "./d1-prescriptions-repo";
import { checkHealth } from "./health";
import { makeEmailSender } from "./email-sender";
import { verifyTurnstileToken } from "./turnstile";
import {
  createPrescription,
  deletePrescription,
  listPrescriptions,
  toPrescriptionResponse,
  updatePrescription,
  validateSchedule,
} from "./prescriptions";
import { makeD1DoseRepo } from "./d1-doses-repo";
import { scheduledDoses } from "./scheduled-doses";
import { isDoseStatus } from "./doses";
import { validateCfAccessJwt } from "./cf-access";
import { getAdminStats, renderAdminHtml } from "./admin";
import { handleFillSessionPdf } from "./fill-session-pdf";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  RESEND_API_KEY: string;
  APP_URL: string;
  TURNSTILE_SECRET_KEY: string;
  EMAIL_SECRET: string;
  PIN_SECRET: string;
  EMAIL_MOCK?: string;
  CF_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  CF_ACCESS_MOCK?: string;
  BROWSER: Fetcher;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
};

const HTTPS_SECURITY_HEADERS = {
  ...SECURITY_HEADERS,
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' https://challenges.cloudflare.com https://scripts.simpleanalyticscdn.com; frame-src 'self' https://challenges.cloudflare.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; connect-src 'self' https://queue.simpleanalyticscdn.com; img-src 'self' https://queue.simpleanalyticscdn.com https://simpleanalyticsbadges.com",
  "Strict-Transport-Security": "max-age=63072000",
};

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

function getSessionId(request: Request): string | null {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)session=([^;]+)/);
  return match?.[1] ?? null;
}

function sessionCookie(value: string, secure: boolean): string {
  const secureFlag = secure ? "; Secure" : "";
  return `${SESSION_COOKIE}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}${secureFlag}`;
}

function clearSessionCookie(secure: boolean): string {
  const secureFlag = secure ? "; Secure" : "";
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureFlag}`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleRequest(request, env);
    } catch (e) {
      console.error("Unhandled error:", e);
      return new Response(JSON.stringify({ error: "internal_error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },

  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    const repo = makeD1AuthRepo(env.DB, env.EMAIL_SECRET);
    const now = new Date(controller.scheduledTime).toISOString();
    const cutoffDate = new Date(
      controller.scheduledTime - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    await deleteStaleUnverifiedPatients(repo, cutoffDate);
    await deleteExpiredTokens(repo, now);
  },
};

function resolveLanguage(raw: unknown): string {
  if (typeof raw !== "string") return "en-US";
  try {
    return new Intl.Locale(raw).toString();
  } catch {
    return "en-US";
  }
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const secure = url.protocol === "https:";
  const repo = makeD1AuthRepo(env.DB, env.EMAIL_SECRET);
  const hashPin = (pin: string) => hashPinFn(pin, env.PIN_SECRET);
  const prescriptionRepo = makeD1PrescriptionRepo(env.DB);
  const doseRepo = makeD1DoseRepo(env.DB);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (url.pathname === "/api/v1/health") {
    const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
    const health = await checkHealth(env.DB, resend);
    return new Response(JSON.stringify(health), {
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  if (url.pathname === "/api/v1/register" && request.method === "POST") {
    const {
      email,
      turnstileToken,
      language: rawLanguage,
    } = await request.json<{
      email: string;
      turnstileToken: string;
      language?: unknown;
    }>();
    const tokenValid = await verifyTurnstileToken(
      turnstileToken,
      env.TURNSTILE_SECRET_KEY,
    );
    if (!tokenValid) {
      return new Response(
        JSON.stringify({ error: "invalid_turnstile_token" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }
    const language = resolveLanguage(rawLanguage);
    const emailSender = makeEmailSender(
      env.EMAIL_MOCK,
      env.RESEND_API_KEY,
      url.origin,
    );
    const { token } = await registerPatient(
      email.trim(),
      repo,
      emailSender,
      hashPin,
      language,
    );
    return new Response(JSON.stringify({ ok: true, token }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/api/v1/login" && request.method === "POST") {
    const { email, turnstileToken } = await request.json<{
      email: string;
      turnstileToken: string;
    }>();
    const tokenValid = await verifyTurnstileToken(
      turnstileToken,
      env.TURNSTILE_SECRET_KEY,
    );
    if (!tokenValid) {
      return new Response(
        JSON.stringify({ error: "invalid_turnstile_token" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }
    const emailSender = makeEmailSender(
      env.EMAIL_MOCK,
      env.RESEND_API_KEY,
      url.origin,
    );
    const { token } = await sendLoginLink(
      email.trim(),
      repo,
      emailSender,
      hashPin,
    );
    return new Response(JSON.stringify({ ok: true, token }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/api/v1/auth/verify-pin" && request.method === "POST") {
    const { token, pin } = await request.json<{ token: string; pin: string }>();
    const result = await verifyPin(token, pin, repo, hashPin);
    if ("error" in result) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const sessionId = await createSession(result.patientId, repo);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": sessionCookie(sessionId, secure),
      },
    });
  }

  if (url.pathname === "/api/v1/session" && request.method === "GET") {
    const sessionId = getSessionId(request);
    const session = sessionId ? await getSession(sessionId, repo) : null;
    if (!session) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ ok: true, patientId: session.patientId }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  if (url.pathname === "/api/v1/account" && request.method === "GET") {
    const sessionId = getSessionId(request);
    const session = sessionId ? await getSession(sessionId, repo) : null;
    if (!session) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const [createdAt, timezone, language] = await Promise.all([
      repo.findPatientCreatedAt(session.patientId),
      repo.findPatientTimezone(session.patientId),
      repo.findPatientLanguage(session.patientId),
    ]);
    const registrationDate = createdAt ? createdAt.slice(0, 10) : null;
    return new Response(
      JSON.stringify({ timezone, registrationDate, language }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  if (url.pathname === "/api/v1/account" && request.method === "PATCH") {
    const sessionId = getSessionId(request);
    const session = sessionId ? await getSession(sessionId, repo) : null;
    if (!session) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const body = await request.json<Record<string, unknown>>();
    const { timezone, language } = body;
    if (typeof timezone === "string") {
      const validZones = new Set(Intl.supportedValuesOf("timeZone"));
      if (!validZones.has(timezone)) {
        return new Response(JSON.stringify({ error: "invalid_timezone" }), {
          status: 422,
          headers: { "Content-Type": "application/json" },
        });
      }
      await repo.updatePatientTimezone(session.patientId, timezone);
    }
    if (typeof language === "string") {
      await repo.updatePatientLanguage(
        session.patientId,
        resolveLanguage(language),
      );
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/api/v1/logout" && request.method === "POST") {
    const sessionId = getSessionId(request);
    if (sessionId) await deleteSession(sessionId, repo);
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/register",
        "Set-Cookie": clearSessionCookie(secure),
      },
    });
  }

  if (url.pathname === "/api/v1/fill-session/pdf" && request.method === "GET") {
    const sessionId = getSessionId(request);
    const session = sessionId ? await getSession(sessionId, repo) : null;
    if (!session) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const patientTimezone = await repo.findPatientTimezone(session.patientId);
    const prescriptions = await listPrescriptions(
      session.patientId,
      ["active"],
      prescriptionRepo,
    );
    return handleFillSessionPdf(request, env, prescriptions, patientTimezone);
  }

  if (url.pathname === "/api/v1/prescriptions" && request.method === "POST") {
    const sessionId = getSessionId(request);
    const session = sessionId ? await getSession(sessionId, repo) : null;
    if (!session) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const body = await request.json<Record<string, unknown>>();
    const required = ["drugName", "dosage", "schedule", "startDate"];
    for (const field of required) {
      if (!body[field]) {
        return new Response(
          JSON.stringify({ error: "missing_required_field" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
    }
    const scheduleError = validateSchedule(body.schedule);
    if (scheduleError) {
      return new Response(JSON.stringify(scheduleError), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }
    const result = await createPrescription(
      {
        doseForm: body.doseForm != null ? String(body.doseForm) : undefined,
        drugName: String(body.drugName),
        dosage: String(body.dosage),
        schedule: body.schedule as never,
        startDate: String(body.startDate),
        endDate: body.endDate != null ? String(body.endDate) : null,
        prescribingDoctor:
          body.prescribingDoctor != null
            ? String(body.prescribingDoctor)
            : null,
        instructions:
          body.instructions != null ? String(body.instructions) : null,
      },
      session.patientId,
      prescriptionRepo,
    );
    if ("error" in result) {
      return new Response(JSON.stringify(result), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(toPrescriptionResponse(result)), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/api/v1/prescriptions" && request.method === "GET") {
    const sessionId = getSessionId(request);
    const session = sessionId ? await getSession(sessionId, repo) : null;
    if (!session) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const statusParam = url.searchParams.get("status") ?? "active";
    const statusFilter = statusParam.split(",").map((s) => s.trim());
    const prescriptions = await listPrescriptions(
      session.patientId,
      statusFilter,
      prescriptionRepo,
    );
    const body = prescriptions.map(toPrescriptionResponse);
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const prescriptionMatch = url.pathname.match(
    /^\/api\/v1\/prescriptions\/([^/]+)$/,
  );

  if (prescriptionMatch && request.method === "GET") {
    const sessionId = getSessionId(request);
    const session = sessionId ? await getSession(sessionId, repo) : null;
    if (!session) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const prescriptionId = prescriptionMatch[1];
    const prescription = await prescriptionRepo.getPrescription(
      prescriptionId,
      session.patientId,
    );
    if (!prescription) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(toPrescriptionResponse(prescription)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (prescriptionMatch && request.method === "PATCH") {
    const sessionId = getSessionId(request);
    const session = sessionId ? await getSession(sessionId, repo) : null;
    if (!session) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const prescriptionId = prescriptionMatch[1];
    const body = await request.json<Record<string, unknown>>();
    const fields: Record<string, unknown> = {};
    const allowed = [
      "doseForm",
      "drugName",
      "dosage",
      "schedule",
      "startDate",
      "endDate",
      "prescribingDoctor",
      "instructions",
      "status",
    ];
    for (const key of allowed) {
      if (key in body) fields[key] = body[key];
    }
    if (fields.schedule) {
      const scheduleError = validateSchedule(fields.schedule);
      if (scheduleError) {
        return new Response(JSON.stringify(scheduleError), {
          status: 422,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    const result = await updatePrescription(
      prescriptionId,
      session.patientId,
      fields as never,
      prescriptionRepo,
    );
    if ("error" in result) {
      const status = result.error === "not_found" ? 404 : 422;
      return new Response(JSON.stringify(result), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(toPrescriptionResponse(result)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (prescriptionMatch && request.method === "DELETE") {
    const sessionId = getSessionId(request);
    const session = sessionId ? await getSession(sessionId, repo) : null;
    if (!session) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const prescriptionId = prescriptionMatch[1];
    const result = await deletePrescription(
      prescriptionId,
      session.patientId,
      prescriptionRepo,
    );
    if ("error" in result) {
      return new Response(JSON.stringify(result), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const doseMatch = url.pathname.match(/^\/api\/v1\/doses\/([^/]+)$/);

  if (doseMatch && request.method === "DELETE") {
    const sessionId = getSessionId(request);
    const session = sessionId ? await getSession(sessionId, repo) : null;
    if (!session) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const doseId = doseMatch[1];
    const deleted = await doseRepo.deleteDose(doseId, session.patientId);
    if (!deleted) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (doseMatch && request.method === "PATCH") {
    const sessionId = getSessionId(request);
    const session = sessionId ? await getSession(sessionId, repo) : null;
    if (!session) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const body = await request.json<Record<string, unknown>>();
    const patchStatus = body.status;
    if (!isDoseStatus(patchStatus)) {
      return new Response(JSON.stringify({ error: "missing_required_field" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const doseId = doseMatch[1];
    const updated = await doseRepo.updateDoseStatus(
      doseId,
      session.patientId,
      patchStatus,
    );
    if (!updated) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/api/v1/doses" && request.method === "POST") {
    const sessionId = getSessionId(request);
    const session = sessionId ? await getSession(sessionId, repo) : null;
    if (!session) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const body = await request.json<Record<string, unknown>>();
    if (
      !body.prescriptionId ||
      !body.scheduledAt ||
      !isDoseStatus(body.status)
    ) {
      return new Response(JSON.stringify({ error: "missing_required_field" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const now = new Date().toISOString();
    const dose = {
      id: crypto.randomUUID(),
      patientId: session.patientId,
      prescriptionId: String(body.prescriptionId),
      scheduledAt: String(body.scheduledAt),
      status: body.status,
      loggedAt: now,
      createdAt: now,
    };
    await doseRepo.createDose(dose);
    return new Response(JSON.stringify(dose), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/api/v1/doses" && request.method === "GET") {
    const sessionId = getSessionId(request);
    const session = sessionId ? await getSession(sessionId, repo) : null;
    if (!session) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");
    if (!start || !end) {
      return new Response(JSON.stringify({ error: "missing_required_param" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const doses = await doseRepo.listDoses(session.patientId, start, end);
    return new Response(JSON.stringify(doses), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/api/v1/scheduled-doses" && request.method === "GET") {
    const sessionId = getSessionId(request);
    const session = sessionId ? await getSession(sessionId, repo) : null;
    if (!session) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");
    if (!start || !end) {
      return new Response(JSON.stringify({ error: "missing_required_param" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const patientTimezone = await repo.findPatientTimezone(session.patientId);
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: patientTimezone ?? "UTC",
    }).format(new Date());
    const prescriptions = await listPrescriptions(
      session.patientId,
      ["active"],
      prescriptionRepo,
    );
    const doses = await doseRepo.listDoses(session.patientId, start, end);
    const result = scheduledDoses(
      prescriptions,
      start,
      end,
      today,
      doses,
      patientTimezone ?? "UTC",
    );
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/admin" && request.method === "GET") {
    const devBypass = env.CF_ACCESS_MOCK === "true" && !secure;
    const adminHeaders = {
      ...(secure ? HTTPS_SECURITY_HEADERS : SECURITY_HEADERS),
      "Cache-Control": "no-store, private",
    };
    if (!devBypass) {
      const token = request.headers.get("cf-access-jwt-assertion");
      if (!token) {
        return new Response("Unauthorized", {
          status: 401,
          headers: adminHeaders,
        });
      }
      const valid = await validateCfAccessJwt(
        token,
        env.CF_TEAM_DOMAIN ?? "",
        env.CF_ACCESS_AUD ?? "",
      );
      if (!valid) {
        return new Response("Unauthorized", {
          status: 401,
          headers: adminHeaders,
        });
      }
    }
    const stats = await getAdminStats(env.DB);
    return new Response(renderAdminHtml(stats), {
      headers: {
        ...adminHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }

  if (url.pathname === "/") {
    const sessionId = getSessionId(request);
    const session = sessionId ? await getSession(sessionId, repo) : null;
    if (!session) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/register" },
      });
    }
  }

  const assetResponse = await env.ASSETS.fetch(request);
  const headers = new Headers(assetResponse.headers);
  for (const [key, value] of Object.entries(
    secure ? HTTPS_SECURITY_HEADERS : SECURITY_HEADERS,
  )) {
    headers.set(key, value);
  }
  return new Response(assetResponse.body, {
    status: assetResponse.status,
    statusText: assetResponse.statusText,
    headers,
  });
}
