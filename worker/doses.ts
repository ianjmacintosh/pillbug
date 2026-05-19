export type DoseStatus = "taken";

const DOSE_STATUSES: readonly DoseStatus[] = ["taken"];

export function isDoseStatus(s: unknown): s is DoseStatus {
  return (
    typeof s === "string" && (DOSE_STATUSES as readonly string[]).includes(s)
  );
}

export interface Dose {
  id: string;
  patientId: string;
  prescriptionId: string;
  scheduledAt: string; // "YYYY-MM-DDThh:mm:00Z" (local clock time stored as UTC)
  status: DoseStatus;
  loggedAt: string; // ISO timestamp (UTC)
  createdAt: string;
}

export interface DoseRepository {
  createDose(dose: Dose): Promise<void>;
  listDoses(patientId: string, start: string, end: string): Promise<Dose[]>;
  updateDoseStatus(
    id: string,
    patientId: string,
    status: DoseStatus,
  ): Promise<Dose | null>;
  deleteDose(id: string, patientId: string): Promise<boolean>;
}
