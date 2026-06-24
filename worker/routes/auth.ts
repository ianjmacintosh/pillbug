import {
  registerPatient,
  sendLoginLink,
  verifyPin,
  createSession,
  deleteSession,
} from "../auth";
import { hashPin as hashPinFn } from "../email-crypto";
import { makeEmailSender } from "../email-sender";
import { verifyTurnstileToken } from "../turnstile";
import {
  sessionCookie,
  clearSessionCookie,
  getSessionId,
} from "../cookie-utils";
import { json, resolveLanguage, type Repos } from "../session";
import type { Env } from "../env";

export async function handleRegister(
  request: Request,
  env: Env,
  repos: Repos,
): Promise<Response> {
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
  if (!tokenValid) return json({ error: "invalid_turnstile_token" }, 403);
  const language = resolveLanguage(rawLanguage);
  const url = new URL(request.url);
  const emailSender = makeEmailSender(
    env.EMAIL_MOCK,
    env.RESEND_API_KEY,
    url.origin,
  );
  const hashPin = (pin: string) => hashPinFn(pin, env.PIN_SECRET);
  const { token } = await registerPatient(
    email.trim(),
    repos.auth,
    emailSender,
    hashPin,
    language,
  );
  return json({ ok: true, token });
}

export async function handleLogin(
  request: Request,
  env: Env,
  repos: Repos,
): Promise<Response> {
  const { email, turnstileToken } = await request.json<{
    email: string;
    turnstileToken: string;
  }>();
  const tokenValid = await verifyTurnstileToken(
    turnstileToken,
    env.TURNSTILE_SECRET_KEY,
  );
  if (!tokenValid) return json({ error: "invalid_turnstile_token" }, 403);
  const url = new URL(request.url);
  const emailSender = makeEmailSender(
    env.EMAIL_MOCK,
    env.RESEND_API_KEY,
    url.origin,
  );
  const hashPin = (pin: string) => hashPinFn(pin, env.PIN_SECRET);
  const { token } = await sendLoginLink(
    email.trim(),
    repos.auth,
    emailSender,
    hashPin,
  );
  return json({ ok: true, token });
}

export async function handleVerifyPin(
  request: Request,
  env: Env,
  repos: Repos,
): Promise<Response> {
  const url = new URL(request.url);
  const secure = url.protocol === "https:";
  const { token, pin } = await request.json<{ token: string; pin: string }>();
  const hashPin = (p: string) => hashPinFn(p, env.PIN_SECRET);
  const result = await verifyPin(token, pin, repos.auth, hashPin);
  if ("error" in result) return json({ error: result.error }, 400);
  const sessionId = await createSession(result.patientId, repos.auth);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": sessionCookie(sessionId, secure),
    },
  });
}

export async function handleGetSession(
  _request: Request,
  _env: Env,
  _repos: Repos,
  patientId: string,
): Promise<Response> {
  return json({ ok: true, patientId });
}

export async function handleLogout(
  request: Request,
  _env: Env,
  repos: Repos,
): Promise<Response> {
  const url = new URL(request.url);
  const secure = url.protocol === "https:";
  const sessionId = getSessionId(request);
  if (sessionId) await deleteSession(sessionId, repos.auth);
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/register",
      "Set-Cookie": clearSessionCookie(secure),
    },
  });
}
