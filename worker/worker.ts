import {
  registerPatient,
  sendLoginLink,
  verifyPin,
  createSession,
  getSession,
  deleteSession,
  type AuthRepository,
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

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function requireSession(
  request: Request,
  repo: AuthRepository,
): Promise<{ patientId: string } | Response> {
  const sessionId = getSessionId(request);
  const session = sessionId ? await getSession(sessionId, repo) : null;
  if (!session) return json({ error: "not_authenticated" }, 401);
  return session;
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
      return json({ error: "invalid_turnstile_token" }, 403);
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
    return json({ ok: true, token });
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
      return json({ error: "invalid_turnstile_token" }, 403);
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
    return json({ ok: true, token });
  }

  if (url.pathname === "/api/v1/auth/verify-pin" && request.method === "POST") {
    const { token, pin } = await request.json<{ token: string; pin: string }>();
    const result = await verifyPin(token, pin, repo, hashPin);
    if ("error" in result) {
      return json({ error: result.error }, 400);
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
    const session = await requireSession(request, repo);
    if (session instanceof Response) return session;
    return json({ ok: true, patientId: session.patientId });
  }

  if (url.pathname === "/api/v1/account" && request.method === "GET") {
    const session = await requireSession(request, repo);
    if (session instanceof Response) return session;
    const [createdAt, timezone, language] = await Promise.all([
      repo.findPatientCreatedAt(session.patientId),
      repo.findPatientTimezone(session.patientId),
      repo.findPatientLanguage(session.patientId),
    ]);
    const registrationDate = createdAt ? createdAt.slice(0, 10) : null;
    return json({ timezone, registrationDate, language });
  }

  if (url.pathname === "/api/v1/account" && request.method === "PATCH") {
    const session = await requireSession(request, repo);
    if (session instanceof Response) return session;
    const body = await request.json<Record<string, unknown>>();
    const { timezone, language } = body;
    if (typeof timezone === "string") {
      const validZones = new Set(Intl.supportedValuesOf("timeZone"));
      if (!validZones.has(timezone)) {
        return json({ error: "invalid_timezone" }, 422);
      }
      await repo.updatePatientTimezone(session.patientId, timezone);
    }
    if (typeof language === "string") {
      await repo.updatePatientLanguage(
        session.patientId,
        resolveLanguage(language),
      );
    }
    return json({ ok: true });
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
    const session = await requireSession(request, repo);
    if (session instanceof Response) return session;
    const [patientTimezone, patientLanguage] = await Promise.all([
      repo.findPatientTimezone(session.patientId),
      repo.findPatientLanguage(session.patientId),
    ]);
    const prescriptions = await listPrescriptions(
      session.patientId,
      ["active"],
      prescriptionRepo,
    );
    return handleFillSessionPdf(
      request,
      env,
      prescriptions,
      patientTimezone,
      patientLanguage,
    );
  }

  if (url.pathname === "/api/v1/prescriptions" && request.method === "POST") {
    const session = await requireSession(request, repo);
    if (session instanceof Response) return session;
    const body = await request.json<Record<string, unknown>>();
    const required = ["drugName", "dosage", "schedule", "startDate"];
    for (const field of required) {
      if (!body[field]) {
        return json({ error: "missing_required_field" }, 400);
      }
    }
    const scheduleError = validateSchedule(body.schedule);
    if (scheduleError) {
      return json(scheduleError, 422);
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
      return json(result, 422);
    }
    return json(toPrescriptionResponse(result), 201);
  }

  if (url.pathname === "/api/v1/prescriptions" && request.method === "GET") {
    const session = await requireSession(request, repo);
    if (session instanceof Response) return session;
    const statusParam = url.searchParams.get("status") ?? "active";
    const statusFilter = statusParam.split(",").map((s) => s.trim());
    const prescriptions = await listPrescriptions(
      session.patientId,
      statusFilter,
      prescriptionRepo,
    );
    return json(prescriptions.map(toPrescriptionResponse));
  }

  const prescriptionMatch = url.pathname.match(
    /^\/api\/v1\/prescriptions\/([^/]+)$/,
  );

  if (prescriptionMatch && request.method === "GET") {
    const session = await requireSession(request, repo);
    if (session instanceof Response) return session;
    const prescriptionId = prescriptionMatch[1];
    const prescription = await prescriptionRepo.getPrescription(
      prescriptionId,
      session.patientId,
    );
    if (!prescription) {
      return json({ error: "not_found" }, 404);
    }
    return json(toPrescriptionResponse(prescription));
  }

  if (prescriptionMatch && request.method === "PATCH") {
    const session = await requireSession(request, repo);
    if (session instanceof Response) return session;
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
        return json(scheduleError, 422);
      }
    }
    const result = await updatePrescription(
      prescriptionId,
      session.patientId,
      fields as never,
      prescriptionRepo,
    );
    if ("error" in result) {
      return json(result, result.error === "not_found" ? 404 : 422);
    }
    return json(toPrescriptionResponse(result));
  }

  if (prescriptionMatch && request.method === "DELETE") {
    const session = await requireSession(request, repo);
    if (session instanceof Response) return session;
    const prescriptionId = prescriptionMatch[1];
    const result = await deletePrescription(
      prescriptionId,
      session.patientId,
      prescriptionRepo,
    );
    if ("error" in result) {
      return json(result, 404);
    }
    return json({ ok: true });
  }

  const doseMatch = url.pathname.match(/^\/api\/v1\/doses\/([^/]+)$/);

  if (doseMatch && request.method === "DELETE") {
    const session = await requireSession(request, repo);
    if (session instanceof Response) return session;
    const doseId = doseMatch[1];
    const deleted = await doseRepo.deleteDose(doseId, session.patientId);
    if (!deleted) {
      return json({ error: "not_found" }, 404);
    }
    return json({ ok: true });
  }

  if (doseMatch && request.method === "PATCH") {
    const session = await requireSession(request, repo);
    if (session instanceof Response) return session;
    const body = await request.json<Record<string, unknown>>();
    const patchStatus = body.status;
    if (!isDoseStatus(patchStatus)) {
      return json({ error: "missing_required_field" }, 400);
    }
    const doseId = doseMatch[1];
    const updated = await doseRepo.updateDoseStatus(
      doseId,
      session.patientId,
      patchStatus,
    );
    if (!updated) {
      return json({ error: "not_found" }, 404);
    }
    return json(updated);
  }

  if (url.pathname === "/api/v1/doses" && request.method === "POST") {
    const session = await requireSession(request, repo);
    if (session instanceof Response) return session;
    const body = await request.json<Record<string, unknown>>();
    if (
      !body.prescriptionId ||
      !body.scheduledAt ||
      !isDoseStatus(body.status)
    ) {
      return json({ error: "missing_required_field" }, 400);
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
    return json(dose, 201);
  }

  if (url.pathname === "/api/v1/doses" && request.method === "GET") {
    const session = await requireSession(request, repo);
    if (session instanceof Response) return session;
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");
    if (!start || !end) {
      return json({ error: "missing_required_param" }, 400);
    }
    const doses = await doseRepo.listDoses(session.patientId, start, end);
    return json(doses);
  }

  if (url.pathname === "/api/v1/scheduled-doses" && request.method === "GET") {
    const session = await requireSession(request, repo);
    if (session instanceof Response) return session;
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");
    if (!start || !end) {
      return json({ error: "missing_required_param" }, 400);
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
    return json(result);
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
