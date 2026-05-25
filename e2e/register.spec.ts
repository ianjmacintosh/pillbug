import { expect, test } from "@playwright/test";

test("register page loads the Simple Analytics script", async ({ page }) => {
  await page.goto("/register");
  await expect(
    page.locator(
      'script[src="https://scripts.simpleanalyticscdn.com/latest.js"]',
    ),
  ).toHaveCount(1);
});
