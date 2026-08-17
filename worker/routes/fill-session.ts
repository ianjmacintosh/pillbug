import { listPrescriptions } from "../prescriptions";
import { handleFillSessionPdf } from "../fill-session-pdf";
import { json, type Repos } from "../session";
import type { Env } from "../env";

export async function handleGetFillSessionPdf(
  request: Request,
  env: Env,
  repos: Repos,
  patientId: string,
): Promise<Response> {
  const [patientTimezone, patientLanguage] = await Promise.all([
    repos.auth.findPatientTimezone(patientId),
    repos.auth.findPatientLanguage(patientId),
  ]);
  const prescriptions = await listPrescriptions(
    patientId,
    ["active"],
    repos.prescription,
  );
  return handleFillSessionPdf(
    request,
    env,
    prescriptions,
    patientTimezone,
    patientLanguage,
  );
}

export async function handleCreateFillSession(
  _request: Request,
  _env: Env,
  repos: Repos,
  patientId: string,
): Promise<Response> {
  const fillSession = {
    id: crypto.randomUUID(),
    patientId,
    completedAt: new Date().toISOString(),
  };
  await repos.fillSession.createFillSession(fillSession);
  return json(fillSession, 201);
}
