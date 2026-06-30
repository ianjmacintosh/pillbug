import { expect, test, type APIRequestContext } from "@playwright/test";
import { hashEmail } from "../worker/email-crypto";
import { setKnownPin, TURNSTILE_DUMMY_TOKEN, TEST_PIN } from "./helpers";
import { getDB, disposeDB } from "./db";

async function expireToken(token: string): Promise<void> {
  const db = await getDB();
  await db
    .prepare(
      "UPDATE magic_link_tokens SET expires_at = '2020-01-01T00:00:00.000Z' WHERE token = ?",
    )
    .bind(token)
    .run();
}

test.afterAll(async () => {
  await disposeDB();
});

async function silentLogin(
  email: string,
  request: APIRequestContext,
): Promise<{ token: string; pin: string }> {
  const res = await request.post("/api/v1/login", {
    data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
  });
  const { token } = (await res.json()) as { token: string };
  await setKnownPin(token);
  return { token, pin: TEST_PIN };
}

test.describe("POST /api/v1/register", () => {
  test("returns token, stores language, and accepts duplicate registration", async ({
    request,
  }) => {
    const email = `delivered+e2e-${Date.now()}@resend.dev`;

    const res = await request.post("/api/v1/register", {
      data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN, language: "en-US" },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok: boolean; token: string };
    expect(body.ok).toBe(true);
    expect(body.token).toMatch(/^[0-9a-f-]{36}$/);

    const db = await getDB();
    const emailLookup = await hashEmail(email, process.env.EMAIL_SECRET!);
    const result = await db
      .prepare("SELECT language FROM patients WHERE email_lookup = ?")
      .bind(emailLookup)
      .first<{ language: string }>();
    expect(result?.language).toBe("en-US");

    const res2 = await request.post("/api/v1/register", {
      data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
    });
    expect(res2.status()).toBe(200);
  });
});

test.describe("POST /api/v1/auth/verify-pin", () => {
  test.describe("new account (no timezone configured yet)", () => {
    test("correct PIN entered manually creates a session and navigates to /finish-setup", async ({
      page,
      request,
    }) => {
      const email = `delivered+manual-pin-${Date.now()}@resend.dev`;
      await request.post("/api/v1/register", {
        data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
      });
      const { token, pin } = await silentLogin(email, request);

      await page.goto(`/enter-code?token=${token}`);
      await page.getByLabel(/4-digit code/i).fill(pin);
      await page.getByRole("button", { name: /verify/i }).click();

      await expect(page).toHaveURL("/finish-setup");
    });

    test("correct PIN via fallback link auto-submits and navigates to /finish-setup", async ({
      page,
      request,
    }) => {
      const email = `delivered+verify-pin-${Date.now()}@resend.dev`;
      await request.post("/api/v1/register", {
        data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
      });
      const { token, pin } = await silentLogin(email, request);

      await page.goto(`/enter-code?token=${token}&pin=${pin}`);

      await expect(page).toHaveURL("/finish-setup");
    });
  });

  test("invalid token and wrong PIN both show error alerts", async ({
    page,
    request,
  }) => {
    await page.goto("/enter-code?token=not-a-real-token&pin=1234");
    await expect(page).toHaveURL("/enter-code?token=not-a-real-token&pin=1234");
    await expect(page.getByRole("alert")).toBeVisible();

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

test("completing onboarding stores language in the account and logout redirects to /register", async ({
  page,
  request,
}) => {
  const email = `delivered+e2e-onboard-${Date.now()}@resend.dev`;
  await request.post("/api/v1/register", {
    data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
  });
  const { token, pin } = await silentLogin(email, request);

  await page.goto(`/enter-code?token=${token}&pin=${pin}`);
  await expect(page).toHaveURL("/finish-setup");

  const accountRes = await page.request.get("/api/v1/account");
  const account = (await accountRes.json()) as { language: string | null };
  expect(account.language).toBe("en-US");

  await page.getByRole("button", { name: /log out/i }).click();
  await expect(page).toHaveURL("/register");
});

test("/register renders the page, shows language selector, and links to /login", async ({
  page,
}) => {
  await page.goto("/register");
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /terms/i })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /email me a login link/i }),
  ).toBeVisible();
  await expect(
    page.locator("footer").getByRole("combobox", { name: /language/i }),
  ).toBeVisible();
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(
    TURNSTILE_DUMMY_TOKEN,
  );
  const loginLink = page
    .getByRole("main")
    .getByRole("link", { name: /log in/i });
  await loginLink.scrollIntoViewIfNeeded();
  await loginLink.click();
  await expect(page).toHaveURL("/login");
});

test("/register?challenge loads the registration form with the Turnstile interactive challenge", async ({
  page,
}) => {
  await page.goto("/register?challenge");
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /terms/i })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /email me a login link/i }),
  ).toBeVisible();
  const responseInput = page.locator('input[name="cf-turnstile-response"]');
  await expect(responseInput).toBeAttached();
  await expect(responseInput).toHaveValue("");
});

test("registration form submits via UI and navigates to /enter-code", async ({
  page,
}) => {
  const email = `delivered+ui-register-${Date.now()}@resend.dev`;

  await page.goto("/register");
  await page.getByRole("textbox", { name: /email/i }).fill(email);
  await page.getByRole("checkbox", { name: /terms/i }).check();

  const responseInput = page.locator('input[name="cf-turnstile-response"]');
  await expect(responseInput).toHaveValue(TURNSTILE_DUMMY_TOKEN);

  await page.getByRole("button", { name: /email me a login link/i }).click();
  await expect(page).toHaveURL(/\/enter-code\?token=/);
});

test("/login renders the page, pre-fills email from query param, shows language selector, and links to /register", async ({
  page,
  request,
}) => {
  const email = `delivered+ui-login-${Date.now()}@resend.dev`;
  await request.post("/api/v1/register", {
    data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
  });

  await page.goto("/login");
  await expect(page.getByRole("heading")).toBeVisible();
  await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /email me a login link/i }),
  ).toBeVisible();
  await expect(
    page.locator("footer").getByRole("combobox", { name: /language/i }),
  ).toBeVisible();
  await page.getByRole("link", { name: /create an account/i }).click();
  await expect(page).toHaveURL("/register");

  await page.goto("/login?email=delivered%40resend.dev");
  await expect(page.getByRole("textbox", { name: /email/i })).toHaveValue(
    "delivered@resend.dev",
  );
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

test("login for unregistered email navigates to /enter-code with a token that returns incorrect code", async ({
  page,
}) => {
  const unknownEmail = `delivered+unknown-${Date.now()}@resend.dev`;

  await page.goto("/login");
  await page.getByRole("textbox", { name: /email/i }).fill(unknownEmail);
  const responseInput = page.locator('input[name="cf-turnstile-response"]');
  await expect(responseInput).toHaveValue(TURNSTILE_DUMMY_TOKEN);
  await page.getByRole("button", { name: /email me a login link/i }).click();

  await expect(page).toHaveURL(/\/enter-code\?token=/);

  await page.getByLabel(/4-digit code/i).fill("1234");
  await page.getByRole("button", { name: /verify/i }).click();
  await expect(page.getByRole("alert")).toContainText(/incorrect code/i);
});
