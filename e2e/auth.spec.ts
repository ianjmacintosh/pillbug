import { getPlatformProxy } from "wrangler";
import type { D1Database } from "@cloudflare/workers-types";
import { expect, test } from "@playwright/test";
import { hashEmail } from "../worker/email-crypto";

// Cloudflare Turnstile dummy token produced by the always-passes test sitekey.
// Only validates against the test secret key (1x0000000000000000000000000000000AA).
const TURNSTILE_DUMMY_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

interface Env {
  DB: D1Database;
}

async function getLatestToken(email: string): Promise<string> {
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

async function expireToken(token: string): Promise<void> {
  const { env, dispose } = await getPlatformProxy<Env>({
    environment: "staging",
  });
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

test.describe("POST /api/v1/register", () => {
  test("returns 200 for a new email", async ({ request }) => {
    const email = `delivered+e2e-${Date.now()}@resend.dev`;
    const res = await request.post("/api/v1/register", {
      data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
    });
    expect(res.status()).toBe(200);
  });

  test("returns 200 for an already-registered email", async ({ request }) => {
    const email = `delivered+e2e-dup-${Date.now()}@resend.dev`;
    await request.post("/api/v1/register", {
      data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
    });
    const res = await request.post("/api/v1/register", {
      data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
    });
    expect(res.status()).toBe(200);
  });
});

test.describe("GET /api/v1/auth/verify", () => {
  test("valid token creates a session and navigates to /", async ({
    page,
    request,
  }) => {
    const email = `delivered+verify-${Date.now()}@resend.dev`;
    await request.post("/api/v1/register", {
      data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
    });
    const token = await getLatestToken(email);

    await page.goto(`/verify?token=${token}`);

    await expect(page).toHaveURL("/");
  });

  test("invalid token shows error on the verify page", async ({ page }) => {
    await page.goto("/verify?token=not-a-real-token");

    await expect(page).toHaveURL("/verify?token=not-a-real-token");
    await expect(
      page.getByRole("heading", { name: /invalid or expired/i }),
    ).toBeVisible();
  });

  test("unauthenticated user with used token sees error on the verify page", async ({
    page,
    request,
  }) => {
    const email = `delivered+verify-used-unauth-${Date.now()}@resend.dev`;
    await request.post("/api/v1/register", {
      data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
    });
    const token = await getLatestToken(email);

    await request.get(`/api/v1/auth/verify?token=${token}`);
    await page.goto(`/verify?token=${token}`);

    await expect(page).toHaveURL(`/verify?token=${token}`);
    await expect(
      page.getByRole("heading", { name: /invalid or expired/i }),
    ).toBeVisible();
  });

  test("authenticated user with used token is redirected to /", async ({
    page,
    request,
  }) => {
    const email = `delivered+verify-used-auth-${Date.now()}@resend.dev`;
    await request.post("/api/v1/register", {
      data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
    });
    const token = await getLatestToken(email);

    await page.goto(`/verify?token=${token}`);
    await expect(page).toHaveURL("/"); // wait for async verification + navigation to complete

    await page.goto(`/verify?token=${token}`);

    await expect(page).toHaveURL("/");
  });

  test("expired token shows error on the verify page", async ({
    page,
    request,
  }) => {
    const email = `delivered+verify-exp-${Date.now()}@resend.dev`;
    await request.post("/api/v1/register", {
      data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
    });
    const token = await getLatestToken(email);
    await expireToken(token);

    await page.goto(`/verify?token=${token}`);

    await expect(page).toHaveURL(`/verify?token=${token}`);
    await expect(
      page.getByRole("heading", { name: /invalid or expired/i }),
    ).toBeVisible();
  });
});

test("registration form submits via UI and navigates to /check-your-email", async ({
  page,
}) => {
  const email = `delivered+ui-register-${Date.now()}@resend.dev`;

  await page.goto("/register");
  await page.getByRole("textbox", { name: /email/i }).fill(email);
  await page.getByRole("checkbox", { name: /terms/i }).check();

  // The always-passes test sitekey (1x00000000000000000000AA) auto-resolves
  // Turnstile and sets the hidden response input to XXXX.DUMMY.TOKEN.XXXX.
  const responseInput = page.locator('input[name="cf-turnstile-response"]');
  await expect(responseInput).toHaveValue(TURNSTILE_DUMMY_TOKEN);

  await page.getByRole("button", { name: /email me a login link/i }).click();
  await expect(page).toHaveURL("/check-your-email");
});

test("/register?challenge loads the registration form with the Turnstile interactive challenge", async ({
  page,
}) => {
  await page.goto("/register?challenge");
  await expect(page.getByRole("heading")).toBeVisible();
  await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /terms/i })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /email me a login link/i }),
  ).toBeVisible();
  // With the interactive challenge sitekey, the Turnstile widget initializes but
  // does not auto-resolve — the response stays empty until the user clicks.
  // (The always-passes sitekey would immediately set value="XXXX.DUMMY.TOKEN.XXXX".)
  const responseInput = page.locator('input[name="cf-turnstile-response"]');
  await expect(responseInput).toBeAttached();
  await expect(responseInput).toHaveValue("");
});

test("/register renders the registration page", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByRole("heading")).toBeVisible();
  await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /terms/i })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /email me a login link/i }),
  ).toBeVisible();
});

test("/login renders the login page", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading")).toBeVisible();
  await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /email me a login link/i }),
  ).toBeVisible();
});

test("/login?email= pre-fills the email input", async ({ page }) => {
  await page.goto("/login?email=delivered%40resend.dev");
  await expect(page.getByRole("textbox", { name: /email/i })).toHaveValue(
    "delivered@resend.dev",
  );
});

test("/check-your-email renders the confirmation page", async ({ page }) => {
  await page.goto("/check-your-email");
  await expect(
    page.getByRole("heading", { name: /you've got mail/i }),
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

test("logout button ends the session and redirects to /register", async ({
  page,
  request,
}) => {
  const email = `delivered+logout-${Date.now()}@resend.dev`;
  await request.post("/api/v1/register", {
    data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
  });
  const token = await getLatestToken(email);
  await page.goto(`/verify?token=${token}`);
  await expect(page).toHaveURL("/");

  await page.getByRole("button", { name: /log out/i }).click();

  await expect(page).toHaveURL("/register");
});
