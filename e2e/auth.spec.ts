import { getPlatformProxy } from "wrangler";
import type { D1Database } from "@cloudflare/workers-types";
import { expect, test } from "@playwright/test";

// Cloudflare Turnstile dummy token produced by the always-passes test sitekey.
// Only validates against the test secret key (1x0000000000000000000000000000000AA).
const TURNSTILE_DUMMY_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

interface Env {
  DB: D1Database;
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

async function silentLogin(
  email: string,
  request: Parameters<Parameters<typeof test>[1]>[0]["request"],
): Promise<{ token: string; pin: string }> {
  const res = await request.post("/api/v1/login/silent", { data: { email } });
  return res.json() as Promise<{ token: string; pin: string }>;
}

test.describe("POST /api/v1/register", () => {
  test("returns 200 with a token for a new email", async ({ request }) => {
    const email = `delivered+e2e-${Date.now()}@resend.dev`;
    const res = await request.post("/api/v1/register", {
      data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok: boolean; token: string };
    expect(body.ok).toBe(true);
    expect(body.token).toMatch(/^[0-9a-f-]{36}$/);
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

test.describe("POST /api/v1/auth/verify-pin", () => {
  test("correct PIN entered manually creates a session and navigates to /", async ({
    page,
    request,
  }) => {
    const email = `delivered+manual-pin-${Date.now()}@resend.dev`;
    await request.post("/api/v1/register", {
      data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
    });
    const { token, pin } = await silentLogin(email, request);

    await page.goto(`/enter-code?token=${token}`); // no pin= → no auto-submit
    await page.getByLabel(/4-digit code/i).fill(pin);
    await page.getByRole("button", { name: /verify/i }).click();

    await expect(page).toHaveURL("/");
  });

  test("wrong PIN entered manually shows error alert", async ({
    page,
    request,
  }) => {
    const email = `delivered+wrong-pin-${Date.now()}@resend.dev`;
    await request.post("/api/v1/register", {
      data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
    });
    const { token, pin } = await silentLogin(email, request);
    const wrongPin = pin === "0000" ? "1111" : "0000";

    await page.goto(`/enter-code?token=${token}`);
    await page.getByLabel(/4-digit code/i).fill(wrongPin);
    await page.getByRole("button", { name: /verify/i }).click();

    await expect(page.getByRole("alert")).toContainText(/incorrect code/i);
  });

  test("correct PIN via fallback link auto-submits and navigates to /", async ({
    page,
    request,
  }) => {
    const email = `delivered+verify-pin-${Date.now()}@resend.dev`;
    await request.post("/api/v1/register", {
      data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
    });
    const { token, pin } = await silentLogin(email, request);

    await page.goto(`/enter-code?token=${token}&pin=${pin}`);

    await expect(page).toHaveURL("/");
  });

  test("invalid token shows error on the enter-code page", async ({ page }) => {
    await page.goto("/enter-code?token=not-a-real-token&pin=1234");

    await expect(page).toHaveURL("/enter-code?token=not-a-real-token&pin=1234");
    await expect(page.getByRole("alert")).toBeVisible();
  });

  test("used token shows 'already been used' error in the UI", async ({
    page,
    request,
  }) => {
    const email = `delivered+verify-used-${Date.now()}@resend.dev`;
    await request.post("/api/v1/register", {
      data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
    });
    const { token, pin } = await silentLogin(email, request);

    await request.post("/api/v1/auth/verify-pin", { data: { token, pin } });

    await page.goto(`/enter-code?token=${token}`);
    await page.getByLabel(/4-digit code/i).fill(pin);
    await page.getByRole("button", { name: /verify/i }).click();

    await expect(page.getByRole("alert")).toContainText(/already been used/i);
  });

  test("expired token shows error on the enter-code page", async ({
    page,
    request,
  }) => {
    const email = `delivered+verify-exp-${Date.now()}@resend.dev`;
    await request.post("/api/v1/register", {
      data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
    });
    const { token, pin } = await silentLogin(email, request);
    await expireToken(token);

    await page.goto(`/enter-code?token=${token}&pin=${pin}`);

    await expect(page).toHaveURL(`/enter-code?token=${token}&pin=${pin}`);
    await expect(page.getByRole("alert")).toBeVisible();
  });
});

test("registration form submits via UI and navigates to /enter-code", async ({
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
  await expect(page).toHaveURL(/\/enter-code\?token=/);
});

test("login form submits via UI and navigates to /enter-code", async ({
  page,
  request,
}) => {
  const email = `delivered+ui-login-${Date.now()}@resend.dev`;
  await request.post("/api/v1/register", {
    data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
  });

  await page.goto("/login");
  await page.getByRole("textbox", { name: /email/i }).fill(email);
  const responseInput = page.locator('input[name="cf-turnstile-response"]');
  await expect(responseInput).toHaveValue(TURNSTILE_DUMMY_TOKEN);
  await page.getByRole("button", { name: /email me a login link/i }).click();

  await expect(page).toHaveURL(/\/enter-code\?token=/);
});

test("login for unregistered email navigates to /enter-code with a token that returns invalid", async ({
  page,
}) => {
  const unknownEmail = `delivered+unknown-${Date.now()}@resend.dev`;

  await page.goto("/login");
  await page.getByRole("textbox", { name: /email/i }).fill(unknownEmail);
  const responseInput = page.locator('input[name="cf-turnstile-response"]');
  await expect(responseInput).toHaveValue(TURNSTILE_DUMMY_TOKEN);
  await page.getByRole("button", { name: /email me a login link/i }).click();

  await expect(page).toHaveURL(/\/enter-code\?token=/);

  // Entering any PIN for this token returns invalid — no patient was registered
  await page.getByLabel(/4-digit code/i).fill("1234");
  await page.getByRole("button", { name: /verify/i }).click();
  await expect(page.getByRole("alert")).toContainText(/incorrect code/i);
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
  const { token, pin } = await silentLogin(email, request);
  await page.goto(`/enter-code?token=${token}&pin=${pin}`);
  await expect(page).toHaveURL("/");

  await page.getByRole("button", { name: /log out/i }).click();

  await expect(page).toHaveURL("/register");
});
