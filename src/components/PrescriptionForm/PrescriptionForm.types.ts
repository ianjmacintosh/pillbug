import type { Schedule } from "../../../shared/schedule";

export interface PrescriptionFormData {
  id: string;
  doseForm: string;
  drugName: string;
  dosage: string;
  schedule: Schedule;
  startDate: string;
  endDate: string | null;
  prescribingDoctor: string | null;
  instructions: string | null;
  status: string;
}
