import { execFileSync } from "child_process";

// Keep in sync with ALICE_EMAIL in e2e/test-accounts.ts.
const EMAIL = "test-user-alice@pillbug.ianjmacintosh.com";
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

const response = await fetch(`${baseUrl}/api/v1/login/silent`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL }),
});
if (!response.ok) {
  const body = await response.text();
  throw new Error(
    `POST /api/v1/login/silent failed: ${response.status} ${body}`,
  );
}

const output = execFileSync(
  "wrangler",
  [
    "d1",
    "execute",
    "pillbug-staging",
    ...d1Flags,
    "--command",
    "SELECT token, pin_hash FROM magic_link_tokens WHERE used_at IS NULL ORDER BY rowid DESC LIMIT 1",
    "--json",
  ],
  { encoding: "utf8" },
);

const { token, pin_hash: pinHash } = JSON.parse(output)[0].results[0];
console.log(`${baseUrl}/verify?token=${token}`);

if (pinHash && process.env.PIN_SECRET) {
  const pin = await findPin(pinHash, process.env.PIN_SECRET);
  if (pin) {
    console.log(`${baseUrl}/enter-code?token=${token}`);
    console.log(`PIN: ${pin}`);
  }
} else if (pinHash) {
  console.log("(set PIN_SECRET in your environment to also resolve the PIN)");
}

async function findPin(targetHash, secret) {
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
  for (let i = 0; i < 10000; i++) {
    const pin = String(i).padStart(4, "0");
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(pin),
    );
    const hash = [...new Uint8Array(sig)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (hash === targetHash) return pin;
  }
  return null;
}
