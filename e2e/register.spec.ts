import { expect, test } from "@playwright/test";

test("register page loads the Simple Analytics script", async ({ page }) => {
  await page.goto("/register");
  await expect(
    page.locator(
      'script[src="https://scripts.simpleanalyticscdn.com/latest.js"]',
    ),
  ).toHaveCount(1);
});

test("register page has editorial split layout with story panel and form column", async ({
  page,
}) => {
  await page.goto("/register");
  await expect(page.locator(".register-story")).toBeVisible();
  await expect(page.locator(".register-form-col")).toBeVisible();
  await expect(page.locator(".register-eyebrow")).toHaveText("Pillbug");
  await expect(page.locator(".register-headline")).toBeVisible();
  await expect(page.locator(".register-features li")).toHaveCount(3);
});

test("register page h1 is the form heading", async ({ page }) => {
  await page.goto("/register");
  await expect(page.locator("h1")).toBeVisible();
  // story headline is h2, not h1
  await expect(page.locator("h2.register-headline")).toBeVisible();
});

test("register page story panel appears before form column in DOM order", async ({
  page,
}) => {
  await page.goto("/register");
  const story = page.locator(".register-story");
  const formCol = page.locator(".register-form-col");
  const storyBox = await story.boundingBox();
  const formBox = await formCol.boundingBox();
  // On mobile (single column) story must be above form; on desktop story is
  // to the left. Either way the story element must precede the form in the DOM.
  const storyIndex = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll(".register > *"));
    return all.indexOf(document.querySelector(".register-story")!);
  });
  const formIndex = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll(".register > *"));
    return all.indexOf(document.querySelector(".register-form-col")!);
  });
  expect(storyIndex).toBeLessThan(formIndex);
  // suppress unused warning
  void storyBox;
  void formBox;
});

test("submitting without accepting terms shows an error", async ({ page }) => {
  await page.goto("/register");
  await page.fill(
    'input[type="email"]',
    "delivered+e2e-register-terms@resend.dev",
  );
  await page.click('button[type="submit"]');
  await expect(page.locator('[role="alert"]')).toBeVisible();
});
