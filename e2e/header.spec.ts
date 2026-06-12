import { expect, test, type Page } from "@playwright/test";
import { ALICE_AUTH_FILE } from "./test-accounts";

const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.describe("Header — mobile nav", () => {
  test.use({ storageState: ALICE_AUTH_FILE, viewport: MOBILE_VIEWPORT });

  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: ALICE_AUTH_FILE,
      viewport: MOBILE_VIEWPORT,
    });
    sharedPage = await context.newPage();
    await sharedPage.goto("/");
  });

  test.afterAll(async () => {
    await sharedPage.context().close();
  });

  test("hamburger button is visible", async () => {
    await expect(
      sharedPage.getByRole("button", { name: /open menu/i }),
    ).toBeVisible();
  });

  test("nav links are hidden by default", async () => {
    await expect(
      sharedPage.getByRole("link", { name: /settings/i }),
    ).not.toBeVisible();
  });

  test("opening hamburger reveals nav links", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /open menu/i }).click();
    await expect(page.getByRole("link", { name: /settings/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /close menu/i }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  test("closing hamburger hides nav links again", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /open menu/i }).click();
    await page.getByRole("button", { name: /close menu/i }).click();
    await expect(
      page.getByRole("link", { name: /settings/i }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: /open menu/i }),
    ).toHaveAttribute("aria-expanded", "false");
  });
});

test.describe("Header — desktop nav", () => {
  test.use({ storageState: ALICE_AUTH_FILE });

  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: ALICE_AUTH_FILE });
    sharedPage = await context.newPage();
    await sharedPage.goto("/");
  });

  test.afterAll(async () => {
    await sharedPage.context().close();
  });

  test("hamburger button is not visible", async () => {
    await expect(
      sharedPage.getByRole("button", { name: /open menu/i }),
    ).not.toBeVisible();
  });

  test("nav links are visible without hamburger interaction", async () => {
    await expect(
      sharedPage.getByRole("link", { name: /settings/i }),
    ).toBeVisible();
  });
});
