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

test("GET /api/v1/health reports all subsystems as ok", async ({ request }) => {
  const response = await request.get("/api/v1/health");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.db).toBe("ok");
  expect(body.email).toBe("ok");
});

test("/ redirects unauthenticated visitors to /register", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/register");
});

test("/ redirects unauthenticated visitors to /register after the service worker is active", async ({
  page,
}) => {
  // Load a page first so the service worker installs and becomes active.
  // This is the scenario that previously returned 200 — the SW served cached
  // HTML and bypassed the Worker's session check entirely.
  await page.goto("/register");
  await page.evaluate(() => navigator.serviceWorker.ready);

  await page.goto("/");

  await expect(page).toHaveURL("/register");
});

test("unknown path renders a 404 page", async ({ page }) => {
  await page.goto("/does-not-exist");
  await expect(page.getByRole("heading", { name: /not found/i })).toBeVisible();
});

test("GET /admin without a JWT returns 401", async ({ request }) => {
  const response = await request.get("/admin");
  expect(response.status()).toBe(401);
});
