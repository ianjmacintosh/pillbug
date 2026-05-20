import { execFileSync } from "child_process";

// Keep in sync with ALICE_EMAIL in e2e/test-accounts.ts.
const EMAIL = "test-user-alice@pillbug.ianjmacintosh.com";
const TEST_PIN = "1234";

const env = process.argv.includes("--env")
  ? process.argv[process.argv.indexOf("--env") + 1]
  : "local";

const isStaging = env === "staging";
const baseUrl = isStaging
  ? "https://staging.pillbug.ianjmacintosh.com"
  : "http://localhost:5173";
const d1Flags = isStaging
  ? ["--env", "staging", "--remote"]
  : ["--env", "staging", "--local"];

const response = await fetch(`${baseUrl}/api/v1/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: EMAIL,
    turnstileToken: "XXXX.DUMMY.TOKEN.XXXX",
  }),
});
if (!response.ok) {
  const body = await response.text();
  throw new Error(`POST /api/v1/login failed: ${response.status} ${body}`);
}
const { token } = await response.json();

if (!process.env.PIN_SECRET) {
  throw new Error("PIN_SECRET must be set in your environment");
}
const pinHash = await hashPin(TEST_PIN, process.env.PIN_SECRET);

execFileSync(
  "wrangler",
  [
    "d1",
    "execute",
    "pillbug-staging",
    ...d1Flags,
    "--command",
    `UPDATE magic_link_tokens SET pin_hash = '${pinHash}' WHERE token = '${token}'`,
  ],
  { encoding: "utf8" },
);

console.log(`${baseUrl}/enter-code?token=${token}`);
console.log(`PIN: ${TEST_PIN}`);

async function hashPin(pin, secret) {
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
      info: new TextEncoder().encode("pin-verification"),
    },
    keyMaterial,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(pin),
  );
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
