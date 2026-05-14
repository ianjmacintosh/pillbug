import { execFileSync } from "child_process";

const EMAIL = "test-user-alice@pillbug.ianjmacintosh.com";
const env = process.argv.includes("--env")
  ? process.argv[process.argv.indexOf("--env") + 1]
  : "local";

const isStaging = env === "staging";
const baseUrl = isStaging
  ? "https://staging.pillbug.ianjmacintosh.com"
  : "http://localhost:8787";
const d1Flags = isStaging
  ? ["--env", "staging", "--remote"]
  : ["--env", "staging", "--local"];

await fetch(`${baseUrl}/api/login/silent`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL }),
});

const output = execFileSync(
  "wrangler",
  [
    "d1",
    "execute",
    "pillbug-staging",
    ...d1Flags,
    "--command",
    "SELECT token FROM magic_link_tokens WHERE used_at IS NULL ORDER BY rowid DESC LIMIT 1",
    "--json",
  ],
  { encoding: "utf8" },
);

const token = JSON.parse(output)[0].results[0].token;
console.log(`${baseUrl}/api/auth/verify?token=${token}`);
