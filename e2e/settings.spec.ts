import { getPlatformProxy } from "wrangler";
import type { D1Database } from "@cloudflare/workers-types";
import { expect, test } from "@playwright/test";
import { hashEmail } from "../worker/email-crypto";
import { ALICE_EMAIL, ALICE_AUTH_FILE } from "./test-accounts";

interface Env {
  DB: D1Database;
}

async function resetAliceTimezone(): Promise<void> {
  const { env, dispose } = await getPlatformProxy<Env>({
    environment: "staging",
  });
  try {
    const emailLookup = await hashEmail(ALICE_EMAIL, process.env.EMAIL_SECRET!);
    await env.DB.prepare(
      "UPDATE patients SET timezone = NULL WHERE email_lookup = ?",
    )
      .bind(emailLookup)
      .run();
  } finally {
    await dispose();
  }
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

test.describe("Settings screen", () => {
  test.use({ storageState: ALICE_AUTH_FILE });

  test.beforeEach(async () => {
    await resetAliceTimezone();
    await resetAliceLanguage();
  });

  test("renders a timezone select with options", async ({ page }) => {
    await page.goto("/settings");
    await expect(
      page.getByRole("combobox", { name: /time zone/i }),
    ).toBeVisible();
    await expect(page.getByRole("option").first()).toBeAttached();
  });

  test("redirects to /finish-setup when accessing / without a timezone set", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/finish-setup");
  });

  test("saving a timezone redirects to / and persists on return", async ({
    page,
  }) => {
    await page.goto("/settings");
    await page
      .getByRole("combobox", { name: /time zone/i })
      .selectOption("Pacific/Auckland");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/settings");
    await expect(
      page.getByRole("combobox", { name: /time zone/i }),
    ).toHaveValue("Pacific/Auckland");
  });

  test("header does not show a language selector when authenticated", async ({
    page,
  }) => {
    await page.goto("/settings");
    await expect(
      page.locator("header").getByRole("combobox", { name: /language/i }),
    ).not.toBeAttached();
  });

  test("Settings form shows a language selector", async ({ page }) => {
    await page.goto("/settings");
    await expect(
      page.getByRole("combobox", { name: /language/i }),
    ).toBeVisible();
  });

  test("saving language in Settings persists to the account", async ({
    page,
  }) => {
    await page.goto("/settings");
    // Explicitly select a valid timezone — the machine default ("UTC") is not in
    // Intl.supportedValuesOf("timeZone") and would cause the PATCH to return 422.
    await page
      .getByRole("combobox", { name: /time zone/i })
      .selectOption("America/Chicago");
    await page
      .getByRole("combobox", { name: /language/i })
      .selectOption("en-US");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page).toHaveURL("/");

    const accountRes = await page.request.get("/api/v1/account");
    const account = (await accountRes.json()) as { language: string | null };
    expect(account.language).toBe("en-US");
  });

  test("language selector is pre-populated with the stored language", async ({
    page,
  }) => {
    // Save language to the account, then reload settings to verify pre-population.
    // Select an explicit valid timezone — the machine default ("UTC") fails validation.
    await page.goto("/settings");
    await page
      .getByRole("combobox", { name: /time zone/i })
      .selectOption("America/Chicago");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/settings");
    await expect(page.getByRole("combobox", { name: /language/i })).toHaveValue(
      "en-US",
    );
  });
});
