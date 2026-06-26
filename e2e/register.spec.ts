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
  // Regression: on mobile the register card (flex-shrink:0 in a column flex)
  // overflowed its container and visually covered the footer. The footer was
  // present in the DOM but hidden behind the card's opaque background.

  test("register card does not overlap the footer on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/register");
    const cardBox = await page.locator(".register-card").boundingBox();
    const footerBox = await page.getByRole("contentinfo").boundingBox();
    expect(cardBox).not.toBeNull();
    expect(footerBox).not.toBeNull();
    expect(cardBox!.y + cardBox!.height).toBeLessThanOrEqual(footerBox!.y);
  });
});
