import { expect, test as setup } from "@playwright/test";
import { hashEmail } from "../worker/email-crypto";
import { setKnownPin, TURNSTILE_DUMMY_TOKEN, TEST_PIN } from "./helpers";
import { ALICE_EMAIL, ALICE_AUTH_FILE } from "./test-accounts";
import { getDB, disposeDB } from "./db";

setup("authenticate as Alice", async ({ page }) => {
  // Seed Alice's account before logging in so the app's timezone gate doesn't
  // redirect her. Also backdates registration so backward week navigation is
  // always testable. Temporary workaround until a proper seed script exists:
  // see issue #113.
  const db = await getDB();
  const emailLookup = await hashEmail(ALICE_EMAIL, process.env.EMAIL_SECRET!);
  await db
    .prepare(
      "UPDATE patients SET created_at = ?, timezone = ? WHERE email_lookup = ?",
    )
    .bind("2020-01-01T00:00:00.000Z", "America/Chicago", emailLookup)
    .run();
  await disposeDB();

  const res = await page.request.post("/api/v1/login", {
    data: { email: ALICE_EMAIL, turnstileToken: TURNSTILE_DUMMY_TOKEN },
  });
  const { token } = (await res.json()) as { token: string };
  await setKnownPin(token);
  await page.goto(`/enter-code?token=${token}&pin=${TEST_PIN}`);
  await page.waitForURL((url) => !url.pathname.startsWith("/enter-code"));
  const session = await page.request.get("/api/v1/session");
  expect(session.ok()).toBe(true);
  await page.context().storageState({ path: ALICE_AUTH_FILE });
});
