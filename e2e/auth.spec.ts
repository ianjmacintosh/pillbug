import { getPlatformProxy } from "wrangler";
import type { D1Database } from "@cloudflare/workers-types";
import { expect, test } from "@playwright/test";

const INVITE_CODE = process.env.INVITE_CODE ?? "";

interface Env {
  DB: D1Database;
}

async function getLatestToken(email: string): Promise<string> {
  const { env, dispose } = await getPlatformProxy<Env>();
  try {
    const row = await env.DB.prepare(
      "SELECT t.token FROM magic_link_tokens t JOIN patients p ON t.patient_id = p.id WHERE p.email = ? ORDER BY t.rowid DESC LIMIT 1",
    )
      .bind(email)
      .first<{ token: string }>();
    if (!row) throw new Error(`No token found for ${email}`);
    return row.token;
  } finally {
    await dispose();
  }
}

async function expireToken(token: string): Promise<void> {
  const { env, dispose } = await getPlatformProxy<Env>();
  try {
    await env.DB.prepare(
      "UPDATE magic_link_tokens SET expires_at = '2020-01-01T00:00:00.000Z' WHERE token = ?",
    )
      .bind(token)
      .run();
  } finally {
    await dispose();
  }
}

test.describe("POST /api/register", () => {
  test("returns 200 for a new email", async ({ request }) => {
    const email = `delivered+e2e-${Date.now()}@resend.dev`;
    const res = await request.post("/api/register", {
      data: { email, inviteCode: INVITE_CODE },
    });
    expect(res.status()).toBe(200);
  });

  test("returns 200 for an already-registered email", async ({ request }) => {
    const email = `delivered+e2e-dup-${Date.now()}@resend.dev`;
    await request.post("/api/register", {
      data: { email, inviteCode: INVITE_CODE },
    });
    const res = await request.post("/api/register", {
      data: { email, inviteCode: INVITE_CODE },
    });
    expect(res.status()).toBe(200);
  });
});

test.describe("GET /api/auth/verify", () => {
  test("valid token creates a session and redirects to /", async ({
    page,
    request,
  }) => {
    const email = `delivered+verify-${Date.now()}@resend.dev`;
    await request.post("/api/register", {
      data: { email, inviteCode: INVITE_CODE },
    });
    const token = await getLatestToken(email);

    await page.goto(`/api/auth/verify?token=${token}`);

    await expect(page).toHaveURL("/");
  });

  test("invalid token redirects to /register with error", async ({ page }) => {
    await page.goto("/api/auth/verify?token=not-a-real-token");

    await expect(page).toHaveURL("/register?error=invalid");
  });

  test("used token redirects to /register with error", async ({
    page,
    request,
  }) => {
    const email = `delivered+verify-used-${Date.now()}@resend.dev`;
    await request.post("/api/register", {
      data: { email, inviteCode: INVITE_CODE },
    });
    const token = await getLatestToken(email);

    await page.goto(`/api/auth/verify?token=${token}`);
    await page.goto(`/api/auth/verify?token=${token}`);

    await expect(page).toHaveURL("/register?error=used");
  });

  test("expired token redirects to /register with error", async ({
    page,
    request,
  }) => {
    const email = `delivered+verify-exp-${Date.now()}@resend.dev`;
    await request.post("/api/register", {
      data: { email, inviteCode: INVITE_CODE },
    });
    const token = await getLatestToken(email);
    await expireToken(token);

    await page.goto(`/api/auth/verify?token=${token}`);

    await expect(page).toHaveURL("/register?error=expired");
  });
});

test("/register renders the registration page", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByRole("heading")).toBeVisible();
  await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /terms/i })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /send magic link/i }),
  ).toBeVisible();
});

test("/login renders the login page", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading")).toBeVisible();
  await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /send magic link/i }),
  ).toBeVisible();
});

test("/check-your-email renders the confirmation page", async ({ page }) => {
  await page.goto("/check-your-email");
  await expect(
    page.getByRole("heading", { name: /check your email/i }),
  ).toBeVisible();
});

test("/register links to /login", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("link", { name: /log in/i }).click();
  await expect(page).toHaveURL("/login");
});

test("/login links to /register", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: /create an account/i }).click();
  await expect(page).toHaveURL("/register");
});
