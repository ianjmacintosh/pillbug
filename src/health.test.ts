import { describe, expect, test, vi, afterEach } from "vitest";
import { checkHealth } from "./health";
import type { D1Database } from "@cloudflare/workers-types";

function makeDb(succeeds: boolean): D1Database {
  return {
    prepare: () => ({
      first: succeeds
        ? () => Promise.resolve({ 1: 1 })
        : () => Promise.reject(new Error("D1 error")),
    }),
  } as unknown as D1Database;
}

function mockFetch(status: number) {
  vi.stubGlobal("fetch", () => Promise.resolve(new Response(null, { status })));
}

function mockFetchThrows() {
  vi.stubGlobal("fetch", () => Promise.reject(new Error("network error")));
}

afterEach(() => vi.unstubAllGlobals());

describe("checkHealth", () => {
  test("returns ok for both when db and email are healthy", async () => {
    mockFetch(200);
    const result = await checkHealth(makeDb(true), "valid-key");
    expect(result).toEqual({ db: "ok", email: "ok" });
  });

  test("returns error for db when SELECT 1 throws", async () => {
    mockFetch(200);
    const result = await checkHealth(makeDb(false), "valid-key");
    expect(result).toEqual({ db: "error", email: "ok" });
  });

  test("returns error for email when Resend returns non-2xx", async () => {
    mockFetch(401);
    const result = await checkHealth(makeDb(true), "bad-key");
    expect(result).toEqual({ db: "ok", email: "error" });
  });

  test("returns error for email when Resend request throws", async () => {
    mockFetchThrows();
    const result = await checkHealth(makeDb(true), "valid-key");
    expect(result).toEqual({ db: "ok", email: "error" });
  });

  test("returns error for both when db and email both fail", async () => {
    mockFetch(401);
    const result = await checkHealth(makeDb(false), "bad-key");
    expect(result).toEqual({ db: "error", email: "error" });
  });
});
