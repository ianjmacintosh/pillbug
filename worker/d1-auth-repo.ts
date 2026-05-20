import type { D1Database } from "@cloudflare/workers-types";
import type { AuthRepository } from "./auth";
import { hashEmail, encryptEmail } from "./email-crypto";

export function makeD1AuthRepo(
  db: D1Database,
  emailSecret: string,
): AuthRepository {
  return {
    async createPatient(id, email, termsAcceptedAt) {
      const emailLookup = await hashEmail(email, emailSecret);
      const emailEncrypted = await encryptEmail(email, emailSecret);
      await db
        .prepare(
          "INSERT INTO patients (id, email_lookup, email_encrypted, terms_accepted_at, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(
          id,
          emailLookup,
          emailEncrypted,
          termsAcceptedAt,
          new Date().toISOString(),
        )
        .run();
    },

    async findPatientByEmail(email) {
      const emailLookup = await hashEmail(email, emailSecret);
      return db
        .prepare(
          "SELECT id, last_login_at as lastLoginAt FROM patients WHERE email_lookup = ?",
        )
        .bind(emailLookup)
        .first<{ id: string; lastLoginAt: string | null }>();
    },

    async updateLastLoginAt(patientId, lastLoginAt) {
      await db
        .prepare("UPDATE patients SET last_login_at = ? WHERE id = ?")
        .bind(lastLoginAt, patientId)
        .run();
    },

    async createToken(token, patientId, expiresAt, pinHash) {
      await db
        .prepare(
          "INSERT INTO magic_link_tokens (token, patient_id, expires_at, pin_hash) VALUES (?, ?, ?, ?)",
        )
        .bind(token, patientId, expiresAt, pinHash)
        .run();
    },

    async findToken(token) {
      return db
        .prepare(
          "SELECT patient_id as patientId, expires_at as expiresAt, used_at as usedAt, failed_attempts as failedAttempts, pin_hash as pinHash FROM magic_link_tokens WHERE token = ?",
        )
        .bind(token)
        .first<{
          patientId: string;
          expiresAt: string;
          usedAt: string | null;
          failedAttempts: number;
          pinHash: string;
        }>();
    },

    async incrementFailedAttempts(token) {
      await db
        .prepare(
          "UPDATE magic_link_tokens SET failed_attempts = failed_attempts + 1 WHERE token = ?",
        )
        .bind(token)
        .run();
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

    async findPatientCreatedAt(patientId) {
      const row = await db
        .prepare("SELECT created_at as createdAt FROM patients WHERE id = ?")
        .bind(patientId)
        .first<{ createdAt: string }>();
      return row?.createdAt ?? null;
    },

    async deleteSession(id) {
      await db.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run();
    },

    async findUnverifiedPatientsBefore(cutoff) {
      const result = await db
        .prepare(
          "SELECT id FROM patients WHERE last_login_at IS NULL AND created_at <= ?",
        )
        .bind(cutoff)
        .all<{ id: string }>();
      return result.results;
    },

    async deletePatient(patientId) {
      await db
        .prepare("DELETE FROM patients WHERE id = ?")
        .bind(patientId)
        .run();
    },
    async deleteUnusedTokensForPatient(patientId) {
      await db
        .prepare(
          "DELETE FROM magic_link_tokens WHERE patient_id = ? AND used_at IS NULL",
        )
        .bind(patientId)
        .run();
    },
    async deleteExpiredAndUsedTokens(cutoff) {
      await db
        .prepare(
          "DELETE FROM magic_link_tokens WHERE expires_at < ? OR used_at IS NOT NULL",
        )
        .bind(cutoff)
        .run();
    },
  };
}
