import { getPlatformProxy } from "wrangler";
import { randomUUID } from "node:crypto";

// Standard accounts that must exist before E2E tests run.
// Keep in sync with e2e/test-accounts.ts.
const TEST_ACCOUNTS = [
  "test-user-alice@pillbug.ianjmacintosh.com",
  "delivered+e2e-prescriptions@resend.dev",
];

const isStaging =
  process.argv.includes("--env") &&
  process.argv[process.argv.indexOf("--env") + 1] === "staging";

if (isStaging) {
  await seedRemote();
} else {
  await seedLocal();
}

// Registers through the real deployed Worker instead of writing to D1
// directly. The Worker hashes/encrypts with its own live secrets, so this
// never runs into the local-vs-deployed EMAIL_SECRET mismatch that a
// direct D1 insert (computed with a local secret) would risk. Safe to
// call repeatedly — registerPatient finds the existing patient and just
// issues a fresh token instead of erroring or duplicating the account.
async function seedRemote() {
  const baseUrl = "https://pillbug-staging.ianjmacintosh.com";
  for (const email of TEST_ACCOUNTS) {
    const response = await fetch(`${baseUrl}/api/v1/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `POST /api/v1/register failed for ${email}: ${response.status} ${body}`,
      );
    }
    console.log(`Registered (or already existed) on staging: ${email}`);
  }
}

async function seedLocal() {
  if (!process.env.EMAIL_SECRET) {
    throw new Error("EMAIL_SECRET must be set in your environment");
  }

  const { env, dispose } = await getPlatformProxy({ environment: "staging" });

  try {
    for (const email of TEST_ACCOUNTS) {
      const emailLookup = await hashEmail(email, process.env.EMAIL_SECRET);
      const existing = await env.DB.prepare(
        "SELECT id FROM patients WHERE email_lookup = ?",
      )
        .bind(emailLookup)
        .first();

      if (existing) {
        console.log(`Already exists: ${email}`);
        continue;
      }

      const emailEncrypted = await encryptEmail(
        email,
        process.env.EMAIL_SECRET,
      );
      const now = new Date().toISOString();
      await env.DB.prepare(
        "INSERT INTO patients (id, email_lookup, email_encrypted, terms_accepted_at, created_at) VALUES (?, ?, ?, ?, ?)",
      )
        .bind(randomUUID(), emailLookup, emailEncrypted, now, now)
        .run();

      console.log(`Created: ${email}`);
    }
  } finally {
    await dispose();
  }
}

// Inline implementations matching worker/email-crypto.ts

async function deriveKey(secret, info, algorithm) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HKDF" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32),
      info: new TextEncoder().encode(info),
    },
    keyMaterial,
    algorithm,
    false,
    algorithm.name === "HMAC" ? ["sign"] : ["encrypt"],
  );
}

async function hashEmail(email, secret) {
  const key = await deriveKey(secret, "email-lookup", {
    name: "HMAC",
    hash: "SHA-256",
  });
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(email),
  );
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function encryptEmail(email, secret) {
  const key = await deriveKey(secret, "email-encrypt", {
    name: "AES-GCM",
    length: 256,
  });
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    new TextEncoder().encode(email),
  );
  const combined = new Uint8Array(nonce.length + ciphertext.byteLength);
  combined.set(nonce);
  combined.set(new Uint8Array(ciphertext), nonce.length);
  return btoa(String.fromCharCode(...combined));
}
