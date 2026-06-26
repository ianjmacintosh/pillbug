import { expect, test } from "@playwright/test";

test("register page loads the Simple Analytics script", async ({ page }) => {
  await page.goto("/register");
  await expect(
    page.locator(
      'script[src="https://scripts.simpleanalyticscdn.com/latest.js"]',
    ),
  ).toHaveCount(1);
});

test.describe("footer layout on /register", () => {
  // Regression: footer was visually overlapping the register section instead of
  // sitting below it. Fixed by switching .layout from display:flex to
  // display:grid (grid-template-rows: auto minmax(0,1fr) auto).

  async function assertFooterBelowMain(page: import("@playwright/test").Page) {
    const footerBox = await page.getByRole("contentinfo").boundingBox();
    const mainBox = await page.getByRole("main").boundingBox();
    expect(footerBox).not.toBeNull();
    expect(mainBox).not.toBeNull();
    expect(footerBox!.y).toBeGreaterThanOrEqual(mainBox!.y + mainBox!.height);
  }

  test("footer sits below register content at standard desktop viewport", async ({
    page,
  }) => {
    await page.goto("/register");
    await assertFooterBelowMain(page);
  });

  test("footer sits below register content at short desktop viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.goto("/register");
    await assertFooterBelowMain(page);
  });
});
