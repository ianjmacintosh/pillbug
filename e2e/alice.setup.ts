import { expect, test as setup } from "@playwright/test";
import { getLatestToken } from "./helpers";
import { ALICE_EMAIL, ALICE_AUTH_FILE } from "./test-accounts";

setup("authenticate as Alice", async ({ page }) => {
  await page.request.post("/api/v1/login/silent", {
    data: { email: ALICE_EMAIL },
  });
  const token = await getLatestToken(ALICE_EMAIL);
  await page.goto(`/verify?token=${token}`);
  await expect(page).toHaveURL("/");
  await page.context().storageState({ path: ALICE_AUTH_FILE });
});
