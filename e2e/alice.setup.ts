import { expect, test as setup } from "@playwright/test";
import { getPlatformProxy } from "wrangler";
import type { D1Database } from "@cloudflare/workers-types";
import { hashEmail } from "../worker/email-crypto";
import { ALICE_EMAIL, ALICE_AUTH_FILE } from "./test-accounts";

setup("authenticate as Alice", async ({ page }) => {
  const res = await page.request.post("/api/v1/login/silent", {
    data: { email: ALICE_EMAIL },
  });
  const { token, pin } = (await res.json()) as { token: string; pin: string };
  await page.goto(`/enter-code?token=${token}&pin=${pin}`);
  await expect(page).toHaveURL("/");
  await page.context().storageState({ path: ALICE_AUTH_FILE });

  // Backdate Alice's registration so backward week navigation is always testable.
  // Temporary workaround until a proper seed script exists: see issue #113.
  const { env, dispose } = await getPlatformProxy<{ DB: D1Database }>({
    environment: "staging",
  });
  try {
    const emailLookup = await hashEmail(ALICE_EMAIL, process.env.EMAIL_SECRET!);
    await env.DB.prepare(
      "UPDATE patients SET created_at = ? WHERE email_lookup = ?",
    )
      .bind("2020-01-01T00:00:00.000Z", emailLookup)
      .run();
  } finally {
    await dispose();
  }
});
