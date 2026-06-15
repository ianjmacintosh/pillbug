import { expect, test, type Page } from "@playwright/test";
import { ALICE_AUTH_FILE } from "./test-accounts";

const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.describe("Bottom nav — mobile", () => {
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

  test("tab bar is visible", async () => {
    await expect(
      sharedPage.getByRole("navigation", { name: /main navigation/i }),
    ).toBeVisible();
  });

  test("prescriptions tab links to /prescriptions", async () => {
    await expect(
      sharedPage.getByRole("link", { name: /prescriptions/i }),
    ).toHaveAttribute("href", "/prescriptions");
  });

  test("fill session tab links to /fill-session", async () => {
    await expect(
      sharedPage.getByRole("link", { name: /fill session/i }),
    ).toHaveAttribute("href", "/fill-session");
  });

  test("settings tab links to /settings", async () => {
    await expect(
      sharedPage.getByRole("link", { name: /settings/i }),
    ).toHaveAttribute("href", "/settings");
  });

  test("settings tab is marked active when on /settings", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("link", { name: /settings/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
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

  test("bottom tab bar is not visible on desktop", async () => {
    await expect(
      sharedPage.getByRole("navigation", { name: /main navigation/i }),
    ).not.toBeVisible();
  });

  test("nav links are visible in the header", async () => {
    await expect(
      sharedPage.getByRole("link", { name: /settings/i }),
    ).toBeVisible();
  });
});
