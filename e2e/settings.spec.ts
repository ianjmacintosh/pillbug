import { expect, test, type Page } from "@playwright/test";
import { hashEmail } from "../worker/email-crypto";
import { ALICE_EMAIL, ALICE_AUTH_FILE } from "./test-accounts";
import { getDB, disposeDB } from "./db";

async function resetAliceTimezone(): Promise<void> {
  const db = await getDB();
  const emailLookup = await hashEmail(ALICE_EMAIL, process.env.EMAIL_SECRET!);
  await db
    .prepare("UPDATE patients SET timezone = NULL WHERE email_lookup = ?")
    .bind(emailLookup)
    .run();
}

async function resetAliceLanguage(): Promise<void> {
  const db = await getDB();
  const emailLookup = await hashEmail(ALICE_EMAIL, process.env.EMAIL_SECRET!);
  await db
    .prepare("UPDATE patients SET language = NULL WHERE email_lookup = ?")
    .bind(emailLookup)
    .run();
}

test.afterAll(async () => {
  await disposeDB();
});

test.describe("Settings — log out", () => {
  test.use({ storageState: ALICE_AUTH_FILE });

  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: ALICE_AUTH_FILE });
    sharedPage = await context.newPage();
    await sharedPage.goto("/settings");
  });

  test.afterAll(async () => {
    await sharedPage.context().close();
  });

  test("log out button is visible on the settings page", async () => {
    await expect(
      sharedPage.getByRole("main").getByRole("button", { name: /log out/i }),
    ).toBeVisible();
  });

  test("clicking log out redirects to /register", async ({ page }) => {
    let afterLogout = false;
    await page.route("/api/v1/logout", async (route) => {
      afterLogout = true;
      await route.fulfill({ status: 200 });
    });
    await page.route("/api/v1/session", async (route) => {
      if (afterLogout) {
        await route.fulfill({ status: 401 });
      } else {
        await route.continue();
      }
    });
    await page.goto("/settings");
    await page
      .getByRole("main")
      .getByRole("button", { name: /log out/i })
      .click();
    await expect(page).toHaveURL("/register");
  });
});

test.describe("Settings screen", () => {
  test.use({ storageState: ALICE_AUTH_FILE });

  test.beforeEach(async () => {
    await resetAliceTimezone();
    await resetAliceLanguage();
  });

  test("settings page layout: timezone select, no header language selector, form language selector", async ({
    page,
  }) => {
    await page.goto("/settings");
    await expect(
      page.getByRole("combobox", { name: /time zone/i }),
    ).toBeVisible();
    await expect(page.getByRole("option").first()).toBeAttached();
    await expect(
      page.locator("header").getByRole("combobox", { name: /language/i }),
    ).not.toBeAttached();
    await expect(
      page.getByRole("combobox", { name: /language/i }),
    ).toBeVisible();
  });

  test("redirects to /finish-setup when accessing / without a timezone set", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/finish-setup");
  });

  test("saving a timezone navigates away from settings and persists on return", async ({
    page,
  }) => {
    await page.goto("/settings");
    await page
      .getByRole("combobox", { name: /time zone/i })
      .selectOption("Pacific/Auckland");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(
      page.getByRole("combobox", { name: /time zone/i }),
    ).not.toBeVisible();

    await page.goto("/settings");
    await expect(
      page.getByRole("combobox", { name: /time zone/i }),
    ).toHaveValue("Pacific/Auckland");
  });

  test("saving language persists to account and pre-populates on return", async ({
    page,
  }) => {
    await page.goto("/settings");
    await page
      .getByRole("combobox", { name: /time zone/i })
      .selectOption("America/Chicago");
    await page
      .getByRole("combobox", { name: /language/i })
      .selectOption("en-US");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(
      page.getByRole("combobox", { name: /time zone/i }),
    ).not.toBeVisible();

    const accountRes = await page.request.get("/api/v1/account");
    const account = (await accountRes.json()) as { language: string | null };
    expect(account.language).toBe("en-US");

    await page.goto("/settings");
    await expect(page.getByRole("combobox", { name: /language/i })).toHaveValue(
      "en-US",
    );
  });
});
