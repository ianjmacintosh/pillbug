import { hashPin } from "../worker/email-crypto";
import { getDB } from "./db";

export const TURNSTILE_DUMMY_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";
export const TEST_PIN = "1234";

export async function setKnownPin(token: string): Promise<void> {
  const db = await getDB();
  const pinHash = await hashPin(TEST_PIN, process.env.PIN_SECRET!);
  await db
    .prepare("UPDATE magic_link_tokens SET pin_hash = ? WHERE token = ?")
    .bind(pinHash, token)
    .run();
}
