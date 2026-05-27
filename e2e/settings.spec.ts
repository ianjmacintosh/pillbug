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

test.describe("Settings screen", () => {
  test.use({ storageState: ALICE_AUTH_FILE });

  test.beforeEach(async () => {
    await resetAliceTimezone();
  });

  test("renders a timezone select with options", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("combobox")).toBeVisible();
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
    await page.getByRole("combobox").selectOption("Pacific/Auckland");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/settings");
    await expect(page.getByRole("combobox")).toHaveValue("Pacific/Auckland");
  });
});
