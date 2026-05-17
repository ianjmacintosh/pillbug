const VALID_WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface Schedule {
  days: "daily" | string[];
  times: string[];
  timezoneMode: "local" | "fixed_utc";
}

export type PrescriptionStatus =
  | "active"
  | "completed"
  | "paused"
  | "discontinued";

export interface Prescription {
  id: string;
  patientId: string;
  drugName: string;
  dosage: string;
  schedule: Schedule;
  startDate: string;
  endDate: string | null;
  prescribingDoctor: string | null;
  instructions: string | null;
  status: PrescriptionStatus;
  createdAt: string;
}

type UpdatableFields = Partial<
  Omit<Prescription, "id" | "patientId" | "createdAt">
>;

export interface PrescriptionRepository {
  createPrescription(prescription: Prescription): Promise<void>;
  listPrescriptions(
    patientId: string,
    statusFilter: string[],
  ): Promise<Prescription[]>;
  getPrescription(id: string, patientId: string): Promise<Prescription | null>;
  updatePrescription(
    id: string,
    patientId: string,
    fields: UpdatableFields,
  ): Promise<Prescription | null>;
  deletePrescription(id: string, patientId: string): Promise<boolean>;
}

export function validateSchedule(schedule: unknown): { error: string } | null {
  const s = schedule as { days?: unknown; times?: unknown };

  if (Array.isArray(s.days)) {
    if (
      s.days.length === 0 ||
      !s.days.every((d: unknown) => VALID_WEEKDAYS.includes(String(d)))
    )
      return { error: "invalid_days" };
  } else if (s.days !== "daily") {
    return { error: "invalid_days" };
  }

  if (
    Array.isArray(s.times) &&
    !s.times.every((t: unknown) => HH_MM.test(String(t)))
  ) {
    return { error: "invalid_time_format" };
  }

  return null;
}

export async function createPrescription(
  input: {
    drugName: string;
    dosage: string;
    schedule: Schedule;
    startDate: string;
    endDate?: string | null;
    prescribingDoctor?: string | null;
    instructions?: string | null;
  },
  patientId: string,
  repo: PrescriptionRepository,
): Promise<Prescription | { error: string }> {
  if (input.endDate && input.endDate < input.startDate) {
    return { error: "end_date_before_start_date" };
  }

  const prescription: Prescription = {
    id: crypto.randomUUID(),
    patientId,
    drugName: input.drugName,
    dosage: input.dosage,
    schedule: input.schedule,
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    prescribingDoctor: input.prescribingDoctor ?? null,
    instructions: input.instructions ?? null,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  await repo.createPrescription(prescription);
  return prescription;
}

export function toPrescriptionResponse(p: Prescription) {
  return {
    id: p.id,
    drugName: p.drugName,
    dosage: p.dosage,
    schedule: p.schedule,
    startDate: p.startDate,
    endDate: p.endDate,
    prescribingDoctor: p.prescribingDoctor,
    instructions: p.instructions,
    status: p.status,
  };
}

export async function listPrescriptions(
  patientId: string,
  statusFilter: string[],
  repo: PrescriptionRepository,
): Promise<Prescription[]> {
  return repo.listPrescriptions(patientId, statusFilter);
}

export async function updatePrescription(
  id: string,
  patientId: string,
  fields: UpdatableFields,
  repo: PrescriptionRepository,
): Promise<Prescription | { error: string }> {
  const existing = await repo.getPrescription(id, patientId);
  if (!existing) return { error: "not_found" };

  const effectiveStartDate = fields.startDate ?? existing.startDate;
  const effectiveEndDate =
    "endDate" in fields ? fields.endDate : existing.endDate;
  if (effectiveEndDate && effectiveEndDate < effectiveStartDate) {
    return { error: "end_date_before_start_date" };
  }

  if (fields.schedule) {
    const scheduleError = validateSchedule(fields.schedule);
    if (scheduleError) return scheduleError;
  }

  const updated = await repo.updatePrescription(id, patientId, fields);
  if (!updated) return { error: "not_found" };
  return updated;
}

export async function deletePrescription(
  id: string,
  patientId: string,
  repo: PrescriptionRepository,
): Promise<{ ok: true } | { error: string }> {
  const deleted = await repo.deletePrescription(id, patientId);
  if (!deleted) return { error: "not_found" };
  return { ok: true };
}
