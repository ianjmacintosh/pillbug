import { expect, test } from "@playwright/test";

test.describe("POST /api/register", () => {
  test("returns 200 for a new email", async ({ request }) => {
    const email = `delivered+e2e-${Date.now()}@resend.dev`;
    const res = await request.post("/api/register", { data: { email } });
    expect(res.status()).toBe(200);
  });

  test("returns 200 for an already-registered email", async ({ request }) => {
    const email = `delivered+e2e-dup-${Date.now()}@resend.dev`;
    await request.post("/api/register", { data: { email } });
    const res = await request.post("/api/register", { data: { email } });
    expect(res.status()).toBe(200);
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
