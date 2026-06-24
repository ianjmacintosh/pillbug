import { listPrescriptions } from "../prescriptions";
import { handleFillSessionPdf } from "../fill-session-pdf";
import { type Repos } from "../session";
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
