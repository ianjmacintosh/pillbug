import { describe, expect, test } from "vitest";
import { checkHealth } from "./health";
import type { D1Database } from "@cloudflare/workers-types";
import type { Resend } from "resend";

function makeDb(succeeds: boolean): D1Database {
  return {
    prepare: () => ({
      first: succeeds
        ? () => Promise.resolve({ 1: 1 })
        : () => Promise.reject(new Error("D1 error")),
    }),
  } as unknown as D1Database;
}

function makeResend(succeeds: boolean): Pick<Resend, "domains"> {
  return {
    domains: {
      list: succeeds
        ? () => Promise.resolve({ data: { data: [] }, error: null })
        : () =>
            Promise.resolve({
              data: null,
              error: { message: "Unauthorized", name: "validation_error" },
            }),
    } as unknown as Resend["domains"],
  };
}

function makeResendThrowing(): Pick<Resend, "domains"> {
  return {
    domains: {
      list: () => Promise.reject(new Error("network error")),
    } as unknown as Resend["domains"],
  };
}

describe("checkHealth", () => {
  test("returns ok for both when db and email are healthy", async () => {
    const result = await checkHealth(makeDb(true), makeResend(true));
    expect(result).toEqual({ db: "ok", email: "ok" });
  });

  test("returns error for db when SELECT 1 throws", async () => {
    const result = await checkHealth(makeDb(false), makeResend(true));
    expect(result).toEqual({ db: "error", email: "ok" });
  });

  test("returns error for email when Resend returns an error", async () => {
    const result = await checkHealth(makeDb(true), makeResend(false));
    expect(result).toEqual({ db: "ok", email: "error" });
  });

  test("returns error for email when Resend request throws", async () => {
    const result = await checkHealth(makeDb(true), makeResendThrowing());
    expect(result).toEqual({ db: "ok", email: "error" });
  });

  test("returns error for both when db and email both fail", async () => {
    const result = await checkHealth(makeDb(false), makeResend(false));
    expect(result).toEqual({ db: "error", email: "error" });
  });
});
