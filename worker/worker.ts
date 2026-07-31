import { deleteStaleUnverifiedPatients, deleteExpiredTokens } from "./cron";
import { Resend } from "resend";
import { makeD1AuthRepo } from "./d1-auth-repo";
import { makeD1PrescriptionRepo } from "./d1-prescriptions-repo";
import { makeD1DoseRepo } from "./d1-doses-repo";
import { makeD1FillSessionProgressRepo } from "./d1-fill-session-progress-repo";
import { checkHealth } from "./health";
import { getSession } from "./auth";
import { getSessionId } from "./cookie-utils";
import {
  CORS_HEADERS,
  SECURITY_HEADERS,
  HTTPS_SECURITY_HEADERS,
} from "./security-headers";
import { withSession, type Repos } from "./session";
import type { Env } from "./env";
import {
  handleRegister,
  handleLogin,
  handleVerifyPin,
  handleGetSession,
  handleLogout,
} from "./routes/auth";
import { handleGetAccount, handlePatchAccount } from "./routes/account";
import {
  handleCreatePrescription,
  handleListPrescriptions,
  handleGetPrescription,
  handlePatchPrescription,
  handleDeletePrescription,
} from "./routes/prescriptions";
import {
  handleCreateDose,
  handleListDoses,
  handlePatchDose,
  handleDeleteDose,
  handleGetScheduledDoses,
} from "./routes/doses";
import { handleGetFillSessionPdf } from "./routes/fill-session";
import {
  handleGetFillSessionProgress,
  handlePutFillSessionProgress,
  handleDeleteFillSessionProgress,
} from "./routes/fill-session-progress";
import { handleGetAdmin } from "./routes/admin";

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

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const secure = url.protocol === "https:";

  const repos: Repos = {
    auth: makeD1AuthRepo(env.DB, env.EMAIL_SECRET),
    prescription: makeD1PrescriptionRepo(env.DB),
    dose: makeD1DoseRepo(env.DB),
    fillSessionProgress: makeD1FillSessionProgressRepo(env.DB),
  };

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
    return handleRegister(request, env, repos);
  }

  if (url.pathname === "/api/v1/login" && request.method === "POST") {
    return handleLogin(request, env, repos);
  }

  if (url.pathname === "/api/v1/auth/verify-pin" && request.method === "POST") {
    return handleVerifyPin(request, env, repos);
  }

  if (url.pathname === "/api/v1/session" && request.method === "GET") {
    return withSession(handleGetSession, request, env, repos);
  }

  if (url.pathname === "/api/v1/account" && request.method === "GET") {
    return withSession(handleGetAccount, request, env, repos);
  }

  if (url.pathname === "/api/v1/account" && request.method === "PATCH") {
    return withSession(handlePatchAccount, request, env, repos);
  }

  if (url.pathname === "/api/v1/logout" && request.method === "POST") {
    return handleLogout(request, env, repos);
  }

  if (url.pathname === "/api/v1/fill-session/pdf" && request.method === "GET") {
    return withSession(handleGetFillSessionPdf, request, env, repos);
  }

  if (
    url.pathname === "/api/v1/fill-session/progress" &&
    request.method === "GET"
  ) {
    return withSession(handleGetFillSessionProgress, request, env, repos);
  }

  if (
    url.pathname === "/api/v1/fill-session/progress" &&
    request.method === "PUT"
  ) {
    return withSession(handlePutFillSessionProgress, request, env, repos);
  }

  if (
    url.pathname === "/api/v1/fill-session/progress" &&
    request.method === "DELETE"
  ) {
    return withSession(handleDeleteFillSessionProgress, request, env, repos);
  }

  if (url.pathname === "/api/v1/prescriptions" && request.method === "POST") {
    return withSession(handleCreatePrescription, request, env, repos);
  }

  if (url.pathname === "/api/v1/prescriptions" && request.method === "GET") {
    return withSession(handleListPrescriptions, request, env, repos);
  }

  const prescriptionMatch = url.pathname.match(
    /^\/api\/v1\/prescriptions\/([^/]+)$/,
  );

  if (prescriptionMatch && request.method === "GET") {
    return withSession(handleGetPrescription, request, env, repos);
  }

  if (prescriptionMatch && request.method === "PATCH") {
    return withSession(handlePatchPrescription, request, env, repos);
  }

  if (prescriptionMatch && request.method === "DELETE") {
    return withSession(handleDeletePrescription, request, env, repos);
  }

  const doseMatch = url.pathname.match(/^\/api\/v1\/doses\/([^/]+)$/);

  if (doseMatch && request.method === "DELETE") {
    return withSession(handleDeleteDose, request, env, repos);
  }

  if (doseMatch && request.method === "PATCH") {
    return withSession(handlePatchDose, request, env, repos);
  }

  if (url.pathname === "/api/v1/doses" && request.method === "POST") {
    return withSession(handleCreateDose, request, env, repos);
  }

  if (url.pathname === "/api/v1/doses" && request.method === "GET") {
    return withSession(handleListDoses, request, env, repos);
  }

  if (url.pathname === "/api/v1/scheduled-doses" && request.method === "GET") {
    return withSession(handleGetScheduledDoses, request, env, repos);
  }

  if (url.pathname === "/admin" && request.method === "GET") {
    return handleGetAdmin(request, env);
  }

  if (url.pathname === "/") {
    const sessionId = getSessionId(request);
    const session = sessionId ? await getSession(sessionId, repos.auth) : null;
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
