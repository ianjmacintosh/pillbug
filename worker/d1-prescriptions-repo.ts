import type { D1Database } from "@cloudflare/workers-types";
import type {
  Prescription,
  PrescriptionRepository,
  Schedule,
} from "./prescriptions";

export function makeD1PrescriptionRepo(db: D1Database): PrescriptionRepository {
  return {
    async createPrescription(p) {
      await db
        .prepare(
          `INSERT INTO prescriptions
            (id, patient_id, drug_name, dosage, schedule, start_date, end_date,
             prescribing_doctor, instructions, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          p.id,
          p.patientId,
          p.drugName,
          p.dosage,
          JSON.stringify(p.schedule),
          p.startDate,
          p.endDate,
          p.prescribingDoctor,
          p.instructions,
          p.status,
          p.createdAt,
        )
        .run();
    },

    async listPrescriptions(patientId, statusFilter) {
      const placeholders = statusFilter.map(() => "?").join(", ");
      const result = await db
        .prepare(
          `SELECT id, patient_id, drug_name, dosage, schedule, start_date,
                  end_date, prescribing_doctor, instructions, status, created_at
           FROM prescriptions
           WHERE patient_id = ? AND status IN (${placeholders})`,
        )
        .bind(patientId, ...statusFilter)
        .all<{
          id: string;
          patient_id: string;
          drug_name: string;
          dosage: string;
          schedule: string;
          start_date: string;
          end_date: string | null;
          prescribing_doctor: string | null;
          instructions: string | null;
          status: string;
          created_at: string;
        }>();
      return result.results.map((row) => ({
        id: row.id,
        patientId: row.patient_id,
        drugName: row.drug_name,
        dosage: row.dosage,
        schedule: JSON.parse(row.schedule) as Schedule,
        startDate: row.start_date,
        endDate: row.end_date,
        prescribingDoctor: row.prescribing_doctor,
        instructions: row.instructions,
        status: row.status as Prescription["status"],
        createdAt: row.created_at,
      }));
    },
  };
}
