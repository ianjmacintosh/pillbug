import { isDoseStatus } from "../doses";
import { scheduledDoses } from "../scheduled-doses";
import { listPrescriptions } from "../prescriptions";
import { json, type Repos } from "../session";
import type { Env } from "../env";

export async function handleCreateDose(
  request: Request,
  _env: Env,
  repos: Repos,
  patientId: string,
): Promise<Response> {
  const body = await request.json<Record<string, unknown>>();
  if (!body.prescriptionId || !body.scheduledAt || !isDoseStatus(body.status)) {
    return json({ error: "missing_required_field" }, 400);
  }
  const now = new Date().toISOString();
  const dose = {
    id: crypto.randomUUID(),
    patientId,
    prescriptionId: String(body.prescriptionId),
    scheduledAt: String(body.scheduledAt),
    status: body.status,
    loggedAt: now,
    createdAt: now,
  };
  await repos.dose.createDose(dose);
  return json(dose, 201);
}

export async function handleListDoses(
  request: Request,
  _env: Env,
  repos: Repos,
  patientId: string,
): Promise<Response> {
  const url = new URL(request.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  if (!start || !end) return json({ error: "missing_required_param" }, 400);
  const doses = await repos.dose.listDoses(patientId, start, end);
  return json(doses);
}

export async function handlePatchDose(
  request: Request,
  _env: Env,
  repos: Repos,
  patientId: string,
): Promise<Response> {
  const doseId = new URL(request.url).pathname.split("/").pop()!;
  const body = await request.json<Record<string, unknown>>();
  const patchStatus = body.status;
  if (!isDoseStatus(patchStatus))
    return json({ error: "missing_required_field" }, 400);
  const updated = await repos.dose.updateDoseStatus(
    doseId,
    patientId,
    patchStatus,
  );
  if (!updated) return json({ error: "not_found" }, 404);
  return json(updated);
}

export async function handleDeleteDose(
  request: Request,
  _env: Env,
  repos: Repos,
  patientId: string,
): Promise<Response> {
  const doseId = new URL(request.url).pathname.split("/").pop()!;
  const deleted = await repos.dose.deleteDose(doseId, patientId);
  if (!deleted) return json({ error: "not_found" }, 404);
  return json({ ok: true });
}

export async function handleGetScheduledDoses(
  request: Request,
  _env: Env,
  repos: Repos,
  patientId: string,
): Promise<Response> {
  const url = new URL(request.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  if (!start || !end) return json({ error: "missing_required_param" }, 400);
  const patientTimezone = await repos.auth.findPatientTimezone(patientId);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: patientTimezone ?? "UTC",
  }).format(new Date());
  const prescriptions = await listPrescriptions(
    patientId,
    ["active"],
    repos.prescription,
  );
  const doses = await repos.dose.listDoses(patientId, start, end);
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
