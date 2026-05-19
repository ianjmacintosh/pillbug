import { expect, test } from "@playwright/test";
import { ALICE_AUTH_FILE } from "./test-accounts";

test.use({ storageState: ALICE_AUTH_FILE });

test.describe("Home screen week navigation", () => {
  test("Previous week button is enabled after reveal", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /show doses/i }).click();
    await expect(
      page.getByRole("button", { name: /previous week/i }),
    ).toBeEnabled();
  });

  test("Next week button is disabled on the current week", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /show doses/i }).click();
    await expect(
      page.getByRole("button", { name: /next week/i }),
    ).toBeDisabled();
  });

  test("navigating back one week enables Next week, navigating forward disables it again", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /show doses/i }).click();

    await page.getByRole("button", { name: /previous week/i }).click();
    await expect(
      page.getByRole("button", { name: /next week/i }),
    ).toBeEnabled();

    await page.getByRole("button", { name: /next week/i }).click();
    await expect(
      page.getByRole("button", { name: /next week/i }),
    ).toBeDisabled();
  });
});
