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
    pinHash: string,
  ): Promise<void>;
  findToken(token: string): Promise<{
    patientId: string;
    expiresAt: string;
    usedAt: string | null;
    failedAttempts: number;
    pinHash: string;
  } | null>;
  incrementFailedAttempts(token: string): Promise<void>;
  markTokenUsed(token: string, usedAt: string): Promise<void>;
  createSession(
    id: string,
    patientId: string,
    expiresAt: string,
  ): Promise<void>;
  findSession(
    id: string,
  ): Promise<{ patientId: string; expiresAt: string } | null>;
  findPatientCreatedAt(patientId: string): Promise<string | null>;
  deleteSession(id: string): Promise<void>;
  findUnverifiedPatientsBefore(cutoff: string): Promise<{ id: string }[]>;
  deletePatient(patientId: string): Promise<void>;
  deleteUnusedTokensForPatient(patientId: string): Promise<void>;
  deleteExpiredAndUsedTokens(cutoff: string): Promise<void>;
}

export interface EmailSender {
  sendVerificationEmail(to: string, token: string, pin: string): Promise<void>;
  sendLoginEmail(to: string, token: string, pin: string): Promise<void>;
}

export interface SentEmail {
  to: string;
  token: string;
  pin: string;
  type: "verification" | "login";
}

const TOKEN_TTL_MS = 20 * 60 * 1000; // 20 minutes
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function generateId(): string {
  return crypto.randomUUID();
}

function generatePin(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 10000).padStart(4, "0");
}

async function findOrCreatePatient(
  email: string,
  repo: AuthRepository,
): Promise<string> {
  const existing = await repo.findPatientByEmail(email);
  if (existing) return existing.id;
  const patientId = generateId();
  await repo.createPatient(patientId, email, new Date().toISOString());
  return patientId;
}

async function createPatientToken(
  patientId: string,
  repo: AuthRepository,
  hashPin: (pin: string) => Promise<string>,
): Promise<{ token: string; pin: string }> {
  const token = generateId();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  const pin = generatePin();
  const pinHash = await hashPin(pin);
  await repo.createToken(token, patientId, expiresAt, pinHash);
  return { token, pin };
}

export async function generateLoginToken(
  email: string,
  repo: AuthRepository,
  hashPin: (pin: string) => Promise<string>,
): Promise<{ token: string; pin: string }> {
  const patientId = await findOrCreatePatient(email, repo);
  const { token, pin } = await createPatientToken(patientId, repo, hashPin);
  return { token, pin };
}

export async function registerPatient(
  email: string,
  repo: AuthRepository,
  emailSender: EmailSender,
  hashPin: (pin: string) => Promise<string>,
): Promise<{ ok: true; token: string }> {
  const patientId = await findOrCreatePatient(email, repo);
  const { token, pin } = await createPatientToken(patientId, repo, hashPin);
  await emailSender.sendVerificationEmail(email, token, pin);
  return { ok: true, token };
}

export async function sendLoginLink(
  email: string,
  repo: AuthRepository,
  emailSender: EmailSender,
  hashPin: (pin: string) => Promise<string>,
): Promise<{ ok: true; token: string }> {
  const patient = await repo.findPatientByEmail(email);
  if (patient) {
    const { token, pin } = await createPatientToken(patient.id, repo, hashPin);
    await emailSender.sendLoginEmail(email, token, pin);
    return { ok: true, token };
  }
  return { ok: true, token: generateId() };
}

export async function verifyPin(
  token: string,
  pin: string,
  repo: AuthRepository,
  hashPin: (pin: string) => Promise<string>,
): Promise<
  | { ok: true; patientId: string }
  | { error: "invalid" | "expired" | "used" | "locked" }
> {
  const record = await repo.findToken(token);
  if (!record) return { error: "expired" };
  if (record.failedAttempts >= 5) return { error: "locked" };
  if (record.usedAt) return { error: "used" };
  if (new Date(record.expiresAt) < new Date()) return { error: "expired" };
  const submittedHash = await hashPin(pin);
  if (submittedHash !== record.pinHash) {
    await repo.incrementFailedAttempts(token);
    return { error: "invalid" };
  }
  const now = new Date().toISOString();
  await repo.markTokenUsed(token, now);
  await repo.updateLastLoginAt(record.patientId, now);
  await repo.deleteUnusedTokensForPatient(record.patientId);
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
