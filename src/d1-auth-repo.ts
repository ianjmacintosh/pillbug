import type { D1Database } from "@cloudflare/workers-types";
import type { AuthRepository } from "./auth";

export function makeD1AuthRepo(db: D1Database): AuthRepository {
  return {
    async createPatient(id, email, termsAcceptedAt) {
      await db
        .prepare(
          "INSERT INTO patients (id, email, terms_accepted_at, created_at) VALUES (?, ?, ?, ?)",
        )
        .bind(id, email, termsAcceptedAt, new Date().toISOString())
        .run();
    },

    async findPatientByEmail(email) {
      return db
        .prepare("SELECT id FROM patients WHERE email = ?")
        .bind(email)
        .first<{ id: string }>();
    },

    async createToken(token, patientId, expiresAt) {
      await db
        .prepare(
          "INSERT INTO magic_link_tokens (token, patient_id, expires_at) VALUES (?, ?, ?)",
        )
        .bind(token, patientId, expiresAt)
        .run();
    },

    async findToken(token) {
      return db
        .prepare(
          "SELECT patient_id as patientId, expires_at as expiresAt, used_at as usedAt FROM magic_link_tokens WHERE token = ?",
        )
        .bind(token)
        .first<{
          patientId: string;
          expiresAt: string;
          usedAt: string | null;
        }>();
    },

    async markTokenUsed(token, usedAt) {
      await db
        .prepare("UPDATE magic_link_tokens SET used_at = ? WHERE token = ?")
        .bind(usedAt, token)
        .run();
    },

    async createSession(id, patientId, expiresAt) {
      await db
        .prepare(
          "INSERT INTO sessions (id, patient_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
        )
        .bind(id, patientId, new Date().toISOString(), expiresAt)
        .run();
    },

    async findSession(id) {
      return db
        .prepare(
          "SELECT patient_id as patientId, expires_at as expiresAt FROM sessions WHERE id = ?",
        )
        .bind(id)
        .first<{ patientId: string; expiresAt: string }>();
    },

    async deleteSession(id) {
      await db.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run();
    },
  };
}
