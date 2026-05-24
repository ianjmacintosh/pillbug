export type DayOfWeek =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

const VALID_WEEKDAYS: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface PerSlotDose {
  time: string;
  quantity: number;
}

export interface Schedule {
  days: Partial<Record<DayOfWeek, PerSlotDose[]>>;
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
  doseForm: string;
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
  const s = schedule as { days?: unknown };

  if (typeof s.days !== "object" || s.days === null || Array.isArray(s.days)) {
    return { error: "invalid_days" };
  }

  for (const [key, slots] of Object.entries(
    s.days as Record<string, unknown>,
  )) {
    if (!VALID_WEEKDAYS.includes(key as DayOfWeek)) {
      return { error: "invalid_days" };
    }
    if (!Array.isArray(slots)) {
      return { error: "invalid_time_format" };
    }
    for (const slot of slots) {
      if (
        typeof slot !== "object" ||
        slot === null ||
        typeof (slot as Record<string, unknown>).time !== "string" ||
        !HH_MM.test((slot as Record<string, unknown>).time as string)
      ) {
        return { error: "invalid_time_format" };
      }
    }
  }

  return null;
}

export async function createPrescription(
  input: {
    doseForm?: string;
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
    doseForm: input.doseForm ?? "tablet",
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
    doseForm: p.doseForm,
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
