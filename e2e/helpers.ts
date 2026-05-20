import { getPlatformProxy } from "wrangler";
import type { D1Database } from "@cloudflare/workers-types";
import { hashPin } from "../worker/email-crypto";

interface Env {
  DB: D1Database;
}

export const TURNSTILE_DUMMY_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";
export const TEST_PIN = "1234";

export async function setKnownPin(token: string): Promise<void> {
  const { env, dispose } = await getPlatformProxy<Env>({
    environment: "staging",
  });
  try {
    const pinHash = await hashPin(TEST_PIN, process.env.PIN_SECRET!);
    await env.DB.prepare(
      "UPDATE magic_link_tokens SET pin_hash = ? WHERE token = ?",
    )
      .bind(pinHash, token)
      .run();
  } finally {
    await dispose();
  }
}
