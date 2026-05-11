import type { AuthRepository, EmailSender, SentEmail } from "./auth";

export function makeInMemoryRepo(): AuthRepository {
  const patients = new Map<
    string,
    { id: string; email: string; termsAcceptedAt: string; createdAt: string }
  >();
  const tokens = new Map<
    string,
    { patientId: string; expiresAt: string; usedAt: string | null }
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
      });
    },
    async findPatientByEmail(email) {
      return [...patients.values()].find((p) => p.email === email) ?? null;
    },
    async createToken(token, patientId, expiresAt) {
      tokens.set(token, { patientId, expiresAt, usedAt: null });
    },
    async findToken(token) {
      return tokens.get(token) ?? null;
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
  };
}

export function makeEmailSpy(): { sender: EmailSender; sent: SentEmail[] } {
  const sent: SentEmail[] = [];
  const sender: EmailSender = {
    async sendMagicLink(to, token) {
      sent.push({ to, token });
    },
  };
  return { sender, sent };
}
