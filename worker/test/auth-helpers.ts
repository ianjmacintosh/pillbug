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
    }
  >();
  const tokens = new Map<
    string,
    {
      patientId: string;
      expiresAt: string;
      usedAt: string | null;
      pinHash: string;
      failedAttempts: number;
    }
  >();
  const sessions = new Map<string, { patientId: string; expiresAt: string }>();

  return {
    async createPatient(id, email, termsAcceptedAt) {
      if ([...patients.values()].some((p) => p.email === email)) {
        throw new Error("email_taken");
      }
      patients.set(id, {
        id,
        email,
        termsAcceptedAt,
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
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
