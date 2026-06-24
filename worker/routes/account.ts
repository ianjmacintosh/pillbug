import { json, resolveLanguage, type Repos } from "../session";
import type { Env } from "../env";

export async function handleGetAccount(
  _request: Request,
  _env: Env,
  repos: Repos,
  patientId: string,
): Promise<Response> {
  const [createdAt, timezone, language] = await Promise.all([
    repos.auth.findPatientCreatedAt(patientId),
    repos.auth.findPatientTimezone(patientId),
    repos.auth.findPatientLanguage(patientId),
  ]);
  const registrationDate = createdAt ? createdAt.slice(0, 10) : null;
  return json({ timezone, registrationDate, language });
}

export async function handlePatchAccount(
  request: Request,
  _env: Env,
  repos: Repos,
  patientId: string,
): Promise<Response> {
  const body = await request.json<Record<string, unknown>>();
  const { timezone, language } = body;
  if (typeof timezone === "string") {
    const validZones = new Set(Intl.supportedValuesOf("timeZone"));
    if (!validZones.has(timezone))
      return json({ error: "invalid_timezone" }, 422);
    await repos.auth.updatePatientTimezone(patientId, timezone);
  }
  if (typeof language === "string") {
    await repos.auth.updatePatientLanguage(
      patientId,
      resolveLanguage(language),
    );
  }
  return json({ ok: true });
}
