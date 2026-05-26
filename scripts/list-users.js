import { DatabaseSync } from "node:sqlite";
import { readdirSync, existsSync } from "node:fs";

if (process.env.CI) {
  console.error(
    "Error: For user privacy reasons, this script may not run in CI.",
  );
  process.exit(1);
}

const D1_DIR = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";

if (!process.env.EMAIL_SECRET) {
  console.error("Error: EMAIL_SECRET must be set (run with --env-file=.env)");
  process.exit(1);
}

if (!existsSync(D1_DIR)) {
  console.error(
    "Error: local database not found. Run npm run db:migrate:local first.",
  );
  process.exit(1);
}

const sqliteFiles = readdirSync(D1_DIR).filter((f) => f.endsWith(".sqlite"));
if (sqliteFiles.length === 0) {
  console.error(
    "Error: no SQLite file found. Run npm run db:migrate:local first.",
  );
  process.exit(1);
}

const db = new DatabaseSync(`${D1_DIR}/${sqliteFiles[0]}`);

const rows = db
  .prepare(
    `SELECT
       p.id,
       p.email_encrypted,
       p.last_login_at,
       COUNT(s.id) AS active_sessions
     FROM patients p
     LEFT JOIN sessions s
       ON s.patient_id = p.id AND s.expires_at > datetime('now')
     GROUP BY p.id
     ORDER BY (p.last_login_at IS NULL) ASC, p.created_at ASC`,
  )
  .all();

db.close();

if (rows.length === 0) {
  console.log("No patients found.");
  process.exit(0);
}

const emails = await Promise.all(
  rows.map((r) => decryptEmail(r.email_encrypted, process.env.EMAIL_SECRET)),
);

const data = rows.map((r, i) => ({
  email: emails[i],
  sessions: r.active_sessions,
  verified: r.last_login_at !== null ? "yes" : "no",
}));

const emailWidth = Math.max("email".length, ...data.map((r) => r.email.length));
const sessionsWidth = "sessions".length;
const verifiedWidth = "verified".length;

const rule = `+${"-".repeat(emailWidth + 2)}+${"-".repeat(sessionsWidth + 2)}+${"-".repeat(verifiedWidth + 2)}+`;

console.log(rule);
console.log(
  `| ${"email".padEnd(emailWidth)} | ${"sessions".padEnd(sessionsWidth)} | ${"verified".padEnd(verifiedWidth)} |`,
);
console.log(rule);

for (const row of data) {
  console.log(
    `| ${row.email.padEnd(emailWidth)} | ${String(row.sessions).padEnd(sessionsWidth)} | ${row.verified.padEnd(verifiedWidth)} |`,
  );
}

console.log(rule);
console.log(`${data.length} patient${data.length === 1 ? "" : "s"}`);

async function decryptEmail(ciphertext, secret) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HKDF" },
    false,
    ["deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32),
      info: new TextEncoder().encode("email-encrypt"),
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: combined.slice(0, 12) },
    key,
    combined.slice(12),
  );
  return new TextDecoder().decode(plaintext);
}
