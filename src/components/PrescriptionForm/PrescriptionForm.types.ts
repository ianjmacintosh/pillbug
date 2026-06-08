import type { DayOfWeek } from "../../lib/days";

export interface PrescriptionFormData {
  id: string;
  doseForm: string;
  drugName: string;
  dosage: string;
  schedule: {
    days: Partial<Record<DayOfWeek, { time: string; quantity: number }[]>>;
  };
  startDate: string;
  endDate: string | null;
  prescribingDoctor: string | null;
  instructions: string | null;
  status: string;
}
