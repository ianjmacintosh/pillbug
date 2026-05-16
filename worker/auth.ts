export interface AuthRepository {
  createPatient(
    id: string,
    email: string,
    termsAcceptedAt: string,
  ): Promise<void>;
  findPatientByEmail(
    email: string,
  ): Promise<{ id: string; lastLoginAt: string | null } | null>;
  updateLastLoginAt(patientId: string, lastLoginAt: string): Promise<void>;
  createToken(
    token: string,
    patientId: string,
    expiresAt: string,
  ): Promise<void>;
  findToken(token: string): Promise<{
    patientId: string;
    expiresAt: string;
    usedAt: string | null;
  } | null>;
  markTokenUsed(token: string, usedAt: string): Promise<void>;
  createSession(
    id: string,
    patientId: string,
    expiresAt: string,
  ): Promise<void>;
  findSession(
    id: string,
  ): Promise<{ patientId: string; expiresAt: string } | null>;
  deleteSession(id: string): Promise<void>;
  findUnverifiedPatientsBefore(cutoff: string): Promise<{ id: string }[]>;
  deletePatient(patientId: string): Promise<void>;
}

export interface EmailSender {
  sendVerificationEmail(to: string, token: string): Promise<void>;
  sendLoginEmail(to: string, token: string): Promise<void>;
}

export interface SentEmail {
  to: string;
  token: string;
  type: "verification" | "login";
}

const TOKEN_TTL_MS = 20 * 60 * 1000; // 20 minutes
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function generateId(): string {
  return crypto.randomUUID();
}

async function createPatientToken(
  patientId: string,
  repo: AuthRepository,
): Promise<string> {
  const token = generateId();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  await repo.createToken(token, patientId, expiresAt);
  return token;
}

export async function generateLoginToken(
  email: string,
  repo: AuthRepository,
): Promise<{ token: string }> {
  const existing = await repo.findPatientByEmail(email);
  const patientId = existing?.id ?? generateId();
  if (!existing) {
    await repo.createPatient(patientId, email, new Date().toISOString());
  }
  const token = await createPatientToken(patientId, repo);
  return { token };
}

export async function registerPatient(
  email: string,
  repo: AuthRepository,
  emailSender: EmailSender,
): Promise<{ ok: true }> {
  const { token } = await generateLoginToken(email, repo);
  await emailSender.sendVerificationEmail(email, token);
  return { ok: true };
}

export async function sendLoginLink(
  email: string,
  repo: AuthRepository,
  emailSender: EmailSender,
): Promise<{ ok: true }> {
  const patient = await repo.findPatientByEmail(email);
  if (patient) {
    const token = await createPatientToken(patient.id, repo);
    await emailSender.sendLoginEmail(email, token);
  }
  return { ok: true };
}

export async function verifyToken(
  token: string,
  repo: AuthRepository,
): Promise<
  { ok: true; patientId: string } | { error: "expired" | "used" | "invalid" }
> {
  const record = await repo.findToken(token);
  if (!record) return { error: "invalid" };
  if (record.usedAt) return { error: "used" };
  if (new Date(record.expiresAt) < new Date()) return { error: "expired" };

  const now = new Date().toISOString();
  await repo.markTokenUsed(token, now);
  await repo.updateLastLoginAt(record.patientId, now);
  return { ok: true, patientId: record.patientId };
}

export async function createSession(
  patientId: string,
  repo: AuthRepository,
): Promise<string> {
  const id = generateId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await repo.createSession(id, patientId, expiresAt);
  return id;
}

export async function getSession(
  sessionId: string,
  repo: AuthRepository,
): Promise<{ patientId: string } | null> {
  const session = await repo.findSession(sessionId);
  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) return null;
  return { patientId: session.patientId };
}

export async function deleteSession(
  sessionId: string,
  repo: AuthRepository,
): Promise<void> {
  await repo.deleteSession(sessionId);
}
