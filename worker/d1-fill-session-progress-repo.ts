import type { D1Database } from "@cloudflare/workers-types";
import type {
  FillSessionProgress,
  FillSessionProgressRepository,
} from "./fill-session-progress";

type ProgressRow = {
  patient_id: string;
  step: string;
  organizer_type: string;
  start_date: string;
  current_index: number;
  updated_at: string;
};

function rowToProgress(row: ProgressRow): FillSessionProgress {
  return {
    patientId: row.patient_id,
    step: row.step,
    organizerType: row.organizer_type,
    startDate: row.start_date,
    currentIndex: row.current_index,
    updatedAt: row.updated_at,
  };
}

export function makeD1FillSessionProgressRepo(
  db: D1Database,
): FillSessionProgressRepository {
  return {
    async upsertProgress(progress) {
      await db
        .prepare(
          `INSERT INTO fill_session_progress
             (patient_id, step, organizer_type, start_date, current_index, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(patient_id) DO UPDATE SET
             step = excluded.step,
             organizer_type = excluded.organizer_type,
             start_date = excluded.start_date,
             current_index = excluded.current_index,
             updated_at = excluded.updated_at`,
        )
        .bind(
          progress.patientId,
          progress.step,
          progress.organizerType,
          progress.startDate,
          progress.currentIndex,
          progress.updatedAt,
        )
        .run();
    },

    async getProgress(patientId) {
      const row = await db
        .prepare(
          `SELECT patient_id, step, organizer_type, start_date, current_index, updated_at
           FROM fill_session_progress WHERE patient_id = ?`,
        )
        .bind(patientId)
        .first<ProgressRow>();
      return row ? rowToProgress(row) : null;
    },

    async deleteProgress(patientId) {
      await db
        .prepare(`DELETE FROM fill_session_progress WHERE patient_id = ?`)
        .bind(patientId)
        .run();
    },
  };
}
