export interface Dose {
  id: string;
  patientId: string;
  prescriptionId: string;
  scheduledAt: string; // "YYYY-MM-DDThh:mm:00Z" (local clock time stored as UTC)
  status: "taken" | "missed";
  loggedAt: string; // ISO timestamp (UTC)
  createdAt: string;
}

export interface DoseRepository {
  createDose(dose: Dose): Promise<void>;
  listDoses(patientId: string, start: string, end: string): Promise<Dose[]>;
  updateDoseStatus(
    id: string,
    patientId: string,
    status: "taken" | "missed",
  ): Promise<Dose | null>;
  deleteDose(id: string, patientId: string): Promise<boolean>;
}
