import { getPlatformProxy } from "wrangler";
import type { D1Database } from "@cloudflare/workers-types";
import { expect, test } from "@playwright/test";
import { hashEmail } from "../worker/email-crypto";
import { ALICE_EMAIL, ALICE_AUTH_FILE } from "./test-accounts";

interface Env {
  DB: D1Database;
}

async function resetAliceLanguage(): Promise<void> {
  const { env, dispose } = await getPlatformProxy<Env>({
    environment: "staging",
  });
  try {
    const emailLookup = await hashEmail(ALICE_EMAIL, process.env.EMAIL_SECRET!);
    await env.DB.prepare(
      "UPDATE patients SET language = NULL WHERE email_lookup = ?",
    )
      .bind(emailLookup)
      .run();
  } finally {
    await dispose();
  }
}

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

  test("saving pt-BR in Settings translates the UI", async ({ page }) => {
    await page.goto("/settings");
    // Select a valid timezone — the machine default ("UTC") fails validation.
    await page
      .getByRole("combobox", { name: /time zone/i })
      .selectOption("America/Chicago");
    await page
      .getByRole("combobox", { name: /language/i })
      .selectOption("pt-BR");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: /configurações/i }),
    ).toBeVisible();
  });

  test("home page dates render in pt-BR format (DD/MM/YYYY) when language is pt-BR", async ({
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
    await expect(page).toHaveURL("/");

    // Week range heading should use DD/MM/YYYY format, not M/D/YYYY
    const heading = await page.locator("h2.week-range").textContent();
    expect(heading).toMatch(/^\d{2}\/\d{2}\/\d{4}–\d{2}\/\d{2}\/\d{4}$/);
  });
});
