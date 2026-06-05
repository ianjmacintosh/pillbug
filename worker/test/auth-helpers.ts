import type { AuthRepository, EmailSender, SentEmail } from "../auth";

export function makeInMemoryRepo(): AuthRepository {
  const patients = new Map<
    string,
    {
      id: string;
      email: string;
      termsAcceptedAt: string;
      createdAt: string;
      lastLoginAt: string | null;
      timezone: string | null;
      language: string | null;
    }
  >();
  const tokens = new Map<
    string,
    {
      patientId: string | null;
      expiresAt: string;
      usedAt: string | null;
      pinHash: string;
      failedAttempts: number;
    }
  >();
  const sessions = new Map<string, { patientId: string; expiresAt: string }>();

  return {
    async createPatient(id, email, termsAcceptedAt, language = null) {
      if ([...patients.values()].some((p) => p.email === email)) {
        throw new Error("email_taken");
      }
      patients.set(id, {
        id,
        email,
        termsAcceptedAt,
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
        timezone: null,
        language,
      });
    },
    async findPatientByEmail(email) {
      return [...patients.values()].find((p) => p.email === email) ?? null;
    },
    async updateLastLoginAt(patientId, lastLoginAt) {
      const p = patients.get(patientId);
      if (p) patients.set(patientId, { ...p, lastLoginAt });
    },
    async createToken(token, patientId, expiresAt, pinHash) {
      tokens.set(token, {
        patientId,
        expiresAt,
        usedAt: null,
        pinHash,
        failedAttempts: 0,
      });
    },
    async createDecoyToken(token, expiresAt) {
      tokens.set(token, {
        patientId: null,
        expiresAt,
        usedAt: null,
        pinHash: "",
        failedAttempts: 0,
      });
    },
    async findToken(token) {
      return tokens.get(token) ?? null;
    },
    async incrementFailedAttempts(token) {
      const t = tokens.get(token);
      if (t) tokens.set(token, { ...t, failedAttempts: t.failedAttempts + 1 });
    },
    async markTokenUsed(token, usedAt) {
      const t = tokens.get(token);
      if (t) tokens.set(token, { ...t, usedAt });
    },
    async createSession(id, patientId, expiresAt) {
      sessions.set(id, { patientId, expiresAt });
    },
    async findSession(id) {
      return sessions.get(id) ?? null;
    },
    async deleteSession(id) {
      sessions.delete(id);
    },
    async findPatientCreatedAt(patientId) {
      return patients.get(patientId)?.createdAt ?? null;
    },
    async findPatientTimezone(patientId) {
      return patients.get(patientId)?.timezone ?? null;
    },
    async updatePatientTimezone(patientId, timezone) {
      const p = patients.get(patientId);
      if (p) patients.set(patientId, { ...p, timezone });
    },
    async findPatientLanguage(patientId) {
      return patients.get(patientId)?.language ?? null;
    },
    async updatePatientLanguage(patientId, language) {
      const p = patients.get(patientId);
      if (p) patients.set(patientId, { ...p, language });
    },
    async findUnverifiedPatientsBefore(cutoff) {
      return [...patients.values()]
        .filter((p) => p.lastLoginAt === null && p.createdAt <= cutoff)
        .map((p) => ({ id: p.id }));
    },
    async deletePatient(patientId) {
      patients.delete(patientId);
      for (const [token, t] of tokens) {
        if (t.patientId === patientId) tokens.delete(token);
      }
      for (const [id, s] of sessions) {
        if (s.patientId === patientId) sessions.delete(id);
      }
    },
    async deleteUnusedTokensForPatient(patientId) {
      for (const [token, t] of tokens) {
        if (t.patientId === patientId && t.usedAt === null)
          tokens.delete(token);
      }
    },
    async deleteExpiredAndUsedTokens(cutoff) {
      for (const [token, t] of tokens) {
        if (t.expiresAt < cutoff || t.usedAt !== null) tokens.delete(token);
      }
    },
  };
}

export function makeEmailSpy(): { sender: EmailSender; sent: SentEmail[] } {
  const sent: SentEmail[] = [];
  const sender: EmailSender = {
    async sendVerificationEmail(to, token, pin) {
      sent.push({ to, token, pin, type: "verification" });
    },
    async sendLoginEmail(to, token, pin) {
      sent.push({ to, token, pin, type: "login" });
    },
  };
  return { sender, sent };
}
