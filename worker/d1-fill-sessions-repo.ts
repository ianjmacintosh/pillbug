import type { D1Database } from "@cloudflare/workers-types";
import type { FillSessionRepository } from "./fill-sessions";

export function makeD1FillSessionRepo(db: D1Database): FillSessionRepository {
  return {
    async createFillSession(fillSession) {
      await db
        .prepare(
          `INSERT INTO fill_sessions (id, patient_id, completed_at)
           VALUES (?, ?, ?)`,
        )
        .bind(fillSession.id, fillSession.patientId, fillSession.completedAt)
        .run();
    },

    async findLastCompletedAt(patientId) {
      const row = await db
        .prepare(
          `SELECT MAX(completed_at) AS last_completed_at
           FROM fill_sessions WHERE patient_id = ?`,
        )
        .bind(patientId)
        .first<{ last_completed_at: string | null }>();
      return row?.last_completed_at ?? null;
    },
  };
}
