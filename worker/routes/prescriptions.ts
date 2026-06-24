import {
  createPrescription,
  deletePrescription,
  listPrescriptions,
  toPrescriptionResponse,
  updatePrescription,
  validateSchedule,
} from "../prescriptions";
import { json, type Repos } from "../session";
import type { Env } from "../env";

export async function handleCreatePrescription(
  request: Request,
  _env: Env,
  repos: Repos,
  patientId: string,
): Promise<Response> {
  const body = await request.json<Record<string, unknown>>();
  const required = ["drugName", "dosage", "schedule", "startDate"];
  for (const field of required) {
    if (!body[field]) return json({ error: "missing_required_field" }, 400);
  }
  const scheduleError = validateSchedule(body.schedule);
  if (scheduleError) return json(scheduleError, 422);
  const result = await createPrescription(
    {
      doseForm: body.doseForm != null ? String(body.doseForm) : undefined,
      drugName: String(body.drugName),
      dosage: String(body.dosage),
      schedule: body.schedule as never,
      startDate: String(body.startDate),
      endDate: body.endDate != null ? String(body.endDate) : null,
      prescribingDoctor:
        body.prescribingDoctor != null ? String(body.prescribingDoctor) : null,
      instructions:
        body.instructions != null ? String(body.instructions) : null,
    },
    patientId,
    repos.prescription,
  );
  if ("error" in result) return json(result, 422);
  return json(toPrescriptionResponse(result), 201);
}

export async function handleListPrescriptions(
  request: Request,
  _env: Env,
  repos: Repos,
  patientId: string,
): Promise<Response> {
  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status") ?? "active";
  const statusFilter = statusParam.split(",").map((s) => s.trim());
  const prescriptions = await listPrescriptions(
    patientId,
    statusFilter,
    repos.prescription,
  );
  return json(prescriptions.map(toPrescriptionResponse));
}

export async function handleGetPrescription(
  request: Request,
  _env: Env,
  repos: Repos,
  patientId: string,
): Promise<Response> {
  const prescriptionId = new URL(request.url).pathname.split("/").pop()!;
  const prescription = await repos.prescription.getPrescription(
    prescriptionId,
    patientId,
  );
  if (!prescription) return json({ error: "not_found" }, 404);
  return json(toPrescriptionResponse(prescription));
}

export async function handlePatchPrescription(
  request: Request,
  _env: Env,
  repos: Repos,
  patientId: string,
): Promise<Response> {
  const prescriptionId = new URL(request.url).pathname.split("/").pop()!;
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
    if (scheduleError) return json(scheduleError, 422);
  }
  const result = await updatePrescription(
    prescriptionId,
    patientId,
    fields as never,
    repos.prescription,
  );
  if ("error" in result)
    return json(result, result.error === "not_found" ? 404 : 422);
  return json(toPrescriptionResponse(result));
}

export async function handleDeletePrescription(
  request: Request,
  _env: Env,
  repos: Repos,
  patientId: string,
): Promise<Response> {
  const prescriptionId = new URL(request.url).pathname.split("/").pop()!;
  const result = await deletePrescription(
    prescriptionId,
    patientId,
    repos.prescription,
  );
  if ("error" in result) return json(result, 404);
  return json({ ok: true });
}
