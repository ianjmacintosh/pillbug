import {
  generateLoginToken,
  registerPatient,
  sendLoginLink,
  verifyToken,
  createSession,
  getSession,
  deleteSession,
} from "./auth";
import { deleteStaleUnverifiedPatients } from "./cron";
import { Resend } from "resend";
import { makeD1AuthRepo } from "./d1-auth-repo";
import { checkHealth } from "./health";
import { makeResendEmailSender } from "./resend-email-sender";
import { verifyTurnstileToken } from "./turnstile";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  RESEND_API_KEY: string;
  APP_URL: string;
  TURNSTILE_SECRET_KEY: string;
  EMAIL_SECRET: string;
  EMAIL_MOCK?: string;
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
    "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; frame-src 'self' https://challenges.cloudflare.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
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
    const cutoffDate = new Date(
      controller.scheduledTime - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const repo = makeD1AuthRepo(env.DB, env.EMAIL_SECRET);
    await deleteStaleUnverifiedPatients(repo, cutoffDate);
  },
};

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const secure = url.protocol === "https:";
  const repo = makeD1AuthRepo(env.DB, env.EMAIL_SECRET);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (url.pathname === "/api/health") {
    const resend = new Resend(env.RESEND_API_KEY);
    const health = await checkHealth(env.DB, resend);
    return new Response(JSON.stringify(health), {
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  if (url.pathname === "/api/register" && request.method === "POST") {
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
    const emailSender =
      env.EMAIL_MOCK === "true"
        ? {
            sendVerificationEmail: async () => {},
            sendLoginEmail: async () => {},
          }
        : makeResendEmailSender(env.RESEND_API_KEY, env.APP_URL);
    await registerPatient(email, repo, emailSender);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/api/login/silent" && request.method === "POST") {
    const { email } = await request.json<{ email: string }>();
    await generateLoginToken(email, repo);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/api/login" && request.method === "POST") {
    const { email } = await request.json<{ email: string }>();
    const emailSender =
      env.EMAIL_MOCK === "true"
        ? {
            sendVerificationEmail: async () => {},
            sendLoginEmail: async () => {},
          }
        : makeResendEmailSender(env.RESEND_API_KEY, env.APP_URL);
    await sendLoginLink(email, repo, emailSender);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/api/auth/verify" && request.method === "GET") {
    const token = url.searchParams.get("token") ?? "";
    const result = await verifyToken(token, repo);
    if ("error" in result) {
      return new Response(null, {
        status: 302,
        headers: { Location: `/register?error=${result.error}` },
      });
    }
    const sessionId = await createSession(result.patientId, repo);
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        "Set-Cookie": sessionCookie(sessionId, secure),
      },
    });
  }

  if (url.pathname === "/api/session" && request.method === "GET") {
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

  if (url.pathname === "/api/logout" && request.method === "POST") {
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
