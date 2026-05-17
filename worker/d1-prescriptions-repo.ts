import type { D1Database } from "@cloudflare/workers-types";
import type {
  DayOfWeek,
  Prescription,
  PrescriptionRepository,
  Schedule,
} from "./prescriptions";

const ALL_DAYS: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

type LegacySchedule = {
  days: "daily" | string[];
  times: string[];
  timezoneMode: "local" | "fixed_utc";
};

export function parseScheduleJson(raw: string): Schedule {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  if ("times" in parsed) {
    const legacy = parsed as unknown as LegacySchedule;
    const selectedDays: DayOfWeek[] =
      legacy.days === "daily" ? ALL_DAYS : (legacy.days as DayOfWeek[]);
    const days: Partial<Record<DayOfWeek, string[]>> = {};
    for (const day of selectedDays) {
      days[day] = [...legacy.times];
    }
    return { days, timezoneMode: legacy.timezoneMode };
  }
  return parsed as unknown as Schedule;
}

type PrescriptionRow = {
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
};

function rowToPrescription(row: PrescriptionRow): Prescription {
  return {
    id: row.id,
    patientId: row.patient_id,
    drugName: row.drug_name,
    dosage: row.dosage,
    schedule: parseScheduleJson(row.schedule),
    startDate: row.start_date,
    endDate: row.end_date,
    prescribingDoctor: row.prescribing_doctor,
    instructions: row.instructions,
    status: row.status as Prescription["status"],
    createdAt: row.created_at,
  };
}

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
        .all<PrescriptionRow>();
      return result.results.map(rowToPrescription);
    },

    async getPrescription(id, patientId) {
      const result = await db
        .prepare(
          `SELECT id, patient_id, drug_name, dosage, schedule, start_date,
                  end_date, prescribing_doctor, instructions, status, created_at
           FROM prescriptions
           WHERE id = ? AND patient_id = ?`,
        )
        .bind(id, patientId)
        .first<PrescriptionRow>();
      return result ? rowToPrescription(result) : null;
    },

    async updatePrescription(id, patientId, fields) {
      const columnMap: Record<string, string> = {
        drugName: "drug_name",
        dosage: "dosage",
        schedule: "schedule",
        startDate: "start_date",
        endDate: "end_date",
        prescribingDoctor: "prescribing_doctor",
        instructions: "instructions",
        status: "status",
      };
      const setClauses: string[] = [];
      const values: unknown[] = [];
      for (const [key, col] of Object.entries(columnMap)) {
        if (key in fields) {
          setClauses.push(`${col} = ?`);
          const v = fields[key as keyof typeof fields];
          values.push(key === "schedule" ? JSON.stringify(v) : v);
        }
      }
      if (setClauses.length === 0) {
        return this.getPrescription(id, patientId);
      }
      await db
        .prepare(
          `UPDATE prescriptions SET ${setClauses.join(", ")} WHERE id = ? AND patient_id = ?`,
        )
        .bind(...values, id, patientId)
        .run();
      return this.getPrescription(id, patientId);
    },

    async deletePrescription(id, patientId) {
      const result = await db
        .prepare(`DELETE FROM prescriptions WHERE id = ? AND patient_id = ?`)
        .bind(id, patientId)
        .run();
      return (result.meta.changes ?? 0) > 0;
    },
  };
}
