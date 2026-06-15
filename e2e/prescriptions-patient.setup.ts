import { expect, test as setup } from "@playwright/test";
import { hashEmail } from "../worker/email-crypto";
import { setKnownPin, TURNSTILE_DUMMY_TOKEN, TEST_PIN } from "./helpers";
import {
  PRESCRIPTIONS_PATIENT_EMAIL,
  PRESCRIPTIONS_PATIENT_AUTH_FILE,
} from "./test-accounts";
import { getDB, disposeDB } from "./db";

setup("authenticate as prescriptions patient", async ({ page }) => {
  const db = await getDB();
  const emailLookup = await hashEmail(
    PRESCRIPTIONS_PATIENT_EMAIL,
    process.env.EMAIL_SECRET!,
  );
  await db
    .prepare("UPDATE patients SET timezone = ? WHERE email_lookup = ?")
    .bind("America/Chicago", emailLookup)
    .run();
  await disposeDB();

  const res = await page.request.post("/api/v1/login", {
    data: {
      email: PRESCRIPTIONS_PATIENT_EMAIL,
      turnstileToken: TURNSTILE_DUMMY_TOKEN,
    },
  });
  const { token } = (await res.json()) as { token: string };
  await setKnownPin(token);
  await page.goto(`/enter-code?token=${token}&pin=${TEST_PIN}`);
  await page.waitForURL("/prescriptions");
  const session = await page.request.get("/api/v1/session");
  expect(session.ok()).toBe(true);
  await page.context().storageState({ path: PRESCRIPTIONS_PATIENT_AUTH_FILE });
});
