import {
  registerPatient,
  sendLoginLink,
  verifyToken,
  createSession,
  getSession,
  deleteSession,
} from "./auth";
import { Resend } from "resend";
import { makeD1AuthRepo } from "./d1-auth-repo";
import { checkHealth } from "./health";
import { makeResendEmailSender } from "./resend-email-sender";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  RESEND_API_KEY: string;
  APP_URL: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

function getSessionId(request: Request): string | null {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)session=([^;]+)/);
  return match?.[1] ?? null;
}

function sessionCookie(value: string): string {
  return `${SESSION_COOKIE}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}`;
}

function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    console.log(
      "[debug] RESEND_API_KEY present:",
      !!env.RESEND_API_KEY,
      "length:",
      env.RESEND_API_KEY?.length ?? 0,
    );
    const resend = new Resend(env.RESEND_API_KEY);
    const repo = makeD1AuthRepo(env.DB);
    const emailSender = makeResendEmailSender(env.RESEND_API_KEY, env.APP_URL);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === "/api/health") {
      const health = await checkHealth(env.DB, resend);
      return new Response(JSON.stringify(health), {
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    if (url.pathname === "/api/register" && request.method === "POST") {
      const { email } = await request.json<{ email: string }>();
      const result = await registerPatient(email, repo, emailSender);
      if ("error" in result) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/login" && request.method === "POST") {
      const { email } = await request.json<{ email: string }>();
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
          "Set-Cookie": sessionCookie(sessionId),
        },
      });
    }

    if (url.pathname === "/api/logout" && request.method === "POST") {
      const sessionId = getSessionId(request);
      if (sessionId) await deleteSession(sessionId, repo);
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/register",
          "Set-Cookie": clearSessionCookie(),
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

    return env.ASSETS.fetch(request);
  },
};
