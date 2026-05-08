import { expect, test } from "@playwright/test";

test("app loads with Pillbug title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Pillbug");
});

test("PWA manifest is linked", async ({ page }) => {
  await page.goto("/");
  const manifestLink = page.locator('link[rel="manifest"]');
  await expect(manifestLink).toHaveCount(1);
});

test("service worker is registered", async ({ page }) => {
  await page.goto("/");
  const registered = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return !!registration.active;
  });
  expect(registered).toBe(true);
});

test("GET /api/health reports all subsystems as ok", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.db).toBe("ok");
  expect(body.email).toBe("ok");
});

test("/ redirects unauthenticated visitors to /register", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/register");
});

test("unknown path renders a 404 page", async ({ page }) => {
  await page.goto("/does-not-exist");
  await expect(page.getByRole("heading", { name: /not found/i })).toBeVisible();
});
