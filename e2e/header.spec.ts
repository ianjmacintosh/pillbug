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

  test("prescriptions tab is marked active when on /prescriptions", async ({
    page,
  }) => {
    await page.goto("/prescriptions");
    await expect(
      page.getByRole("link", { name: /prescriptions/i }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("fill session tab is marked active when on /fill-session", async ({
    page,
  }) => {
    await page.goto("/fill-session");
    await expect(
      page.getByRole("link", { name: /fill session/i }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("settings tab is marked active when on /settings", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("link", { name: /settings/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("active tab has pill chip class applied", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("link", { name: /settings/i })).toHaveClass(
      /bottom-nav-tab--active/,
    );
  });

  test("only the active tab has the active class", async ({ page }) => {
    await page.goto("/settings");
    await expect(
      page.getByRole("link", { name: /prescriptions/i }),
    ).not.toHaveClass(/bottom-nav-tab--active/);
    await expect(
      page.getByRole("link", { name: /fill session/i }),
    ).not.toHaveClass(/bottom-nav-tab--active/);
    await expect(page.getByRole("link", { name: /settings/i })).toHaveClass(
      /bottom-nav-tab--active/,
    );
  });

  test("clicking prescriptions tab navigates to /prescriptions", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /prescriptions/i }).click();
    await expect(page).toHaveURL("/prescriptions");
  });

  test("clicking fill session tab navigates to /fill-session", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /fill session/i }).click();
    await expect(page).toHaveURL("/fill-session");
  });

  test("clicking settings tab navigates to /settings", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /settings/i }).click();
    await expect(page).toHaveURL("/settings");
  });
});

test.describe("Bottom nav — not authenticated", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test("tab bar is not shown when not logged in", async ({ page }) => {
    await page.goto("/register");
    await expect(
      page.getByRole("navigation", { name: /main navigation/i }),
    ).not.toBeVisible();
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
