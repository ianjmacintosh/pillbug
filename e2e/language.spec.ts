import { expect, test } from "@playwright/test";
import { hashEmail } from "../worker/email-crypto";
import { ALICE_EMAIL, ALICE_AUTH_FILE } from "./test-accounts";
import { getDB, disposeDB } from "./db";

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

test.describe("Auto language detection (logged out)", () => {
  test.describe("Brazilian user (pt-BR browser)", () => {
    test.use({ locale: "pt-BR" });

    test("register page shows in pt-BR automatically", async ({ page }) => {
      await page.goto("/register");
      await expect(
        page.getByRole("heading", { name: /criar sua conta/i }),
      ).toBeVisible();
    });
  });

  test.describe("American user (en-US browser)", () => {
    test.use({ locale: "en-US" });

    test("register page shows in en-US automatically", async ({ page }) => {
      await page.goto("/register");
      await expect(
        page.getByRole("heading", { name: /create your account/i }),
      ).toBeVisible();
    });
  });
});

test.describe("Auto language detection (logged in, no stored language)", () => {
  test.beforeEach(async () => {
    await resetAliceLanguage();
  });

  test.describe("Brazilian user (pt-BR browser)", () => {
    test.use({ storageState: ALICE_AUTH_FILE, locale: "pt-BR" });

    test("prescriptions page shows in pt-BR automatically", async ({
      page,
    }) => {
      await page.goto("/prescriptions");
      await expect(
        page.getByRole("heading", { name: /prescrições/i }),
      ).toBeVisible();
    });
  });

  test.describe("American user (en-US browser)", () => {
    test.use({ storageState: ALICE_AUTH_FILE, locale: "en-US" });

    test("prescriptions page shows in en-US automatically", async ({
      page,
    }) => {
      await page.goto("/prescriptions");
      await expect(
        page.getByRole("heading", { name: /prescriptions/i }),
      ).toBeVisible();
    });
  });
});

test.describe("Language switching (logged out)", () => {
  test("switching to pt-BR from header dropdown translates the page", async ({
    page,
  }) => {
    await page.goto("/register");
    await expect(
      page.getByRole("heading", { name: /create your account/i }),
    ).toBeVisible();

    await page.locator("header").getByRole("combobox").selectOption("pt-BR");

    await expect(
      page.getByRole("heading", { name: /criar sua conta/i }),
    ).toBeVisible();
  });
});

test.describe("Language switching (logged in)", () => {
  test.use({ storageState: ALICE_AUTH_FILE });

  test.beforeEach(async () => {
    await resetAliceLanguage();
  });

  test("saving pt-BR in Settings translates the UI and formats home page dates in DD/MM/YYYY", async ({
    page,
  }) => {
    await page.goto("/settings");
    await page
      .getByRole("combobox", { name: /time zone/i })
      .selectOption("America/Chicago");
    await page
      .getByRole("combobox", { name: /language/i })
      .selectOption("pt-BR");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(
      page.getByRole("combobox", { name: /time zone/i }),
    ).not.toBeVisible();

    await page.goto("/weekly-doses");
    const heading = await page.locator("h2.week-range").textContent();
    expect(heading).toMatch(/^\d{2}\/\d{2}\/\d{4}–\d{2}\/\d{2}\/\d{4}$/);

    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: /configurações/i }),
    ).toBeVisible();
  });
});
