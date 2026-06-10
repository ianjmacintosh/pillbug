import { getPlatformProxy } from "wrangler";
import type { D1Database } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
}

let instance: { env: Env; dispose: () => Promise<void> } | null = null;

export async function getDB(): Promise<D1Database> {
  if (!instance) {
    instance = await getPlatformProxy<Env>({ environment: "staging" });
  }
  return instance.env.DB;
}

export async function disposeDB(): Promise<void> {
  if (instance) {
    await instance.dispose();
    instance = null;
  }
}
