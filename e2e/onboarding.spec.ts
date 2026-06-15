import { devices, expect, test } from "@playwright/test";
import { disposeDB } from "./db";
import { setKnownPin, TEST_PIN, TURNSTILE_DUMMY_TOKEN } from "./helpers";

test.use({ ...devices["iPhone 14"], timezoneId: "America/Chicago" });

test.afterAll(async () => {
  await disposeDB();
});

test("new user: after verifying email and completing setup, lands on Create Prescription form", async ({
  page,
  request,
}) => {
  const email = `delivered+onboarding-mobile-${Date.now()}@resend.dev`;

  await request.post("/api/v1/register", {
    data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
  });
  const loginRes = await request.post("/api/v1/login", {
    data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
  });
  const { token } = (await loginRes.json()) as { token: string };
  await setKnownPin(token);

  // User taps the magic link in their email — auto-submits the PIN
  await page.goto(`/enter-code?token=${token}&pin=${TEST_PIN}`);

  // CompleteSetup patches timezone automatically, then / redirects to /prescriptions
  await expect(page).toHaveURL("/prescriptions");

  // New user with no prescriptions sees the Create Prescription form inline
  await expect(
    page.getByRole("heading", { name: /add prescription/i, level: 2 }),
  ).toBeVisible();
});
