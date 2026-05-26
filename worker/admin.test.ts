import { describe, expect, test } from "vitest";
import { renderAdminHtml, getAdminStats } from "./admin";
import type { D1Database } from "@cloudflare/workers-types";

describe("renderAdminHtml", () => {
  test("renders all three counts in the page", () => {
    const html = renderAdminHtml({
      totalPatients: 42,
      unverifiedPatients: 5,
      activeSessions: 17,
    });
    expect(html).toContain("42");
    expect(html).toContain("5");
    expect(html).toContain("17");
  });
});

function makeDb(counts: {
  total: number;
  unverified: number;
  sessions: number;
}): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: () => ({
        first: () => {
          if (sql.includes("expires_at"))
            return Promise.resolve({ count: counts.sessions });
          return Promise.resolve({ count: 0 });
        },
      }),
      first: () => {
        if (sql.includes("last_login_at IS NULL"))
          return Promise.resolve({ count: counts.unverified });
        return Promise.resolve({ count: counts.total });
      },
    }),
  } as unknown as D1Database;
}

describe("getAdminStats", () => {
  test("returns aggregate counts from the database", async () => {
    const db = makeDb({ total: 10, unverified: 3, sessions: 7 });
    const stats = await getAdminStats(db);
    expect(stats).toEqual({
      totalPatients: 10,
      unverifiedPatients: 3,
      activeSessions: 7,
    });
  });

  test("returns zeros when tables are empty", async () => {
    const db = makeDb({ total: 0, unverified: 0, sessions: 0 });
    const stats = await getAdminStats(db);
    expect(stats).toEqual({
      totalPatients: 0,
      unverifiedPatients: 0,
      activeSessions: 0,
    });
  });
});
