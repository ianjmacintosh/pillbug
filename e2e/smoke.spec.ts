import { expect, test } from "@playwright/test";

test("app loads: title, PWA manifest, service worker, and unauthenticated redirect", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL("/register");
  await expect(page).toHaveTitle("Pillbug");
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);

  const registered = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return !!registration.active;
  });
  expect(registered).toBe(true);

  // Service worker already active — verify redirect still works after SW install
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.goto("/");
  await expect(page).toHaveURL("/register");
});

test("GET /api/v1/health reports db as ok", async ({ request }) => {
  const response = await request.get("/api/v1/health");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.db).toBe("ok");
});

test("unknown path renders a 404 page", async ({ page }) => {
  await page.goto("/does-not-exist");
  await expect(page.getByRole("heading", { name: /not found/i })).toBeVisible();
});

test("GET /admin without a JWT returns 401", async ({ request }) => {
  test.skip(
    process.env.CF_ACCESS_MOCK === "true",
    "CF_ACCESS_MOCK bypasses admin auth — only meaningful in CI/staging",
  );
  const response = await request.get("/admin");
  expect(response.status()).toBe(401);
});
