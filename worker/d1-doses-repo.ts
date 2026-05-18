import type { D1Database } from "@cloudflare/workers-types";
import type { Dose, DoseRepository } from "./doses";

type DoseRow = {
  id: string;
  patient_id: string;
  prescription_id: string;
  scheduled_at: string;
  status: string;
  logged_at: string;
  created_at: string;
};

function rowToDose(row: DoseRow): Dose {
  return {
    id: row.id,
    patientId: row.patient_id,
    prescriptionId: row.prescription_id,
    scheduledAt: row.scheduled_at,
    status: row.status as Dose["status"],
    loggedAt: row.logged_at,
    createdAt: row.created_at,
  };
}

export function makeD1DoseRepo(db: D1Database): DoseRepository {
  return {
    async createDose(dose) {
      await db
        .prepare(
          `INSERT INTO doses (id, patient_id, prescription_id, scheduled_at, status, logged_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          dose.id,
          dose.patientId,
          dose.prescriptionId,
          dose.scheduledAt,
          dose.status,
          dose.loggedAt,
          dose.createdAt,
        )
        .run();
    },

    async listDoses(patientId, start, end) {
      const result = await db
        .prepare(
          `SELECT id, patient_id, prescription_id, scheduled_at, status, logged_at, created_at
           FROM doses
           WHERE patient_id = ?
             AND substr(scheduled_at, 1, 10) >= ?
             AND substr(scheduled_at, 1, 10) <= ?`,
        )
        .bind(patientId, start, end)
        .all<DoseRow>();
      return result.results.map(rowToDose);
    },
  };
}
