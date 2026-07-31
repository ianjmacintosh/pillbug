import { getSession, type AuthRepository } from "./auth";
import type { PrescriptionRepository } from "./prescriptions";
import type { DoseRepository } from "./doses";
import type { FillSessionProgressRepository } from "./fill-session-progress";
import { getSessionId } from "./cookie-utils";
import type { Env } from "./env";

export type Repos = {
  auth: AuthRepository;
  prescription: PrescriptionRepository;
  dose: DoseRepository;
  fillSessionProgress: FillSessionProgressRepository;
};

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function resolveLanguage(raw: unknown): string {
  if (typeof raw !== "string") return "en-US";
  try {
    return new Intl.Locale(raw).toString();
  } catch {
    return "en-US";
  }
}

export async function withSession(
  handler: (
    request: Request,
    env: Env,
    repos: Repos,
    patientId: string,
  ) => Promise<Response>,
  request: Request,
  env: Env,
  repos: Repos,
): Promise<Response> {
  const sessionId = getSessionId(request);
  const session = sessionId ? await getSession(sessionId, repos.auth) : null;
  if (!session) return json({ error: "not_authenticated" }, 401);
  return handler(request, env, repos, session.patientId);
}
