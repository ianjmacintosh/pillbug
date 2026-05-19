import { getPlatformProxy } from "wrangler";
import type { D1Database } from "@cloudflare/workers-types";
import { hashEmail } from "../worker/email-crypto";

interface Env {
  DB: D1Database;
}

export async function getLatestToken(email: string): Promise<string> {
  const { env, dispose } = await getPlatformProxy<Env>({
    environment: "staging",
  });
  try {
    const emailLookup = await hashEmail(email, process.env.EMAIL_SECRET!);
    const row = await env.DB.prepare(
      "SELECT t.token FROM magic_link_tokens t JOIN patients p ON t.patient_id = p.id WHERE p.email_lookup = ? ORDER BY t.rowid DESC LIMIT 1",
    )
      .bind(emailLookup)
      .first<{ token: string }>();
    if (!row) throw new Error(`No token found for ${email}`);
    return row.token;
  } finally {
    await dispose();
  }
}
