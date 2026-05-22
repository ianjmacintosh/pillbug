import { expect, test, type Page } from "@playwright/test";
import { getPlatformProxy } from "wrangler";
import type { D1Database } from "@cloudflare/workers-types";
import { hashEmail } from "../worker/email-crypto";
import { setKnownPin, TURNSTILE_DUMMY_TOKEN, TEST_PIN } from "./helpers";
import { ALICE_AUTH_FILE, PRESCRIPTIONS_PATIENT_EMAIL } from "./test-accounts";

interface Env {
  DB: D1Database;
}

async function clearPrescriptions(): Promise<void> {
  const { env, dispose } = await getPlatformProxy<Env>({
    environment: "staging",
  });
  try {
    const emailLookup = await hashEmail(
      PRESCRIPTIONS_PATIENT_EMAIL,
      process.env.EMAIL_SECRET!,
    );
    await env.DB.prepare(
      "DELETE FROM prescriptions WHERE patient_id IN (SELECT id FROM patients WHERE email_lookup = ?)",
    )
      .bind(emailLookup)
      .run();
  } finally {
    await dispose();
  }
}

async function login(page: Page): Promise<void> {
  const res = await page.request.post("/api/v1/login", {
    data: {
      email: PRESCRIPTIONS_PATIENT_EMAIL,
      turnstileToken: TURNSTILE_DUMMY_TOKEN,
    },
  });
  const { token } = (await res.json()) as { token: string };
  await setKnownPin(token);
  await page.goto(`/enter-code?token=${token}&pin=${TEST_PIN}`);
  await expect(page).toHaveURL("/");
}

test.describe("Home screen week navigation", () => {
  test.use({ storageState: ALICE_AUTH_FILE });

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

test.describe("Home screen doses", () => {
  test.beforeEach(async () => {
    await clearPrescriptions();
  });

  test("dose label shows 'count form × drug dosage'", async ({ page }) => {
    await login(page);
    await page.request.post("/api/v1/prescriptions", {
      data: {
        drugName: "Metformin",
        dosage: "500 mg",
        doseCount: 2,
        doseForm: "tablet",
        schedule: { days: { monday: ["08:00"] }, timezoneMode: "local" },
        startDate: "2024-01-01",
      },
    });
    await page.goto("/");
    await page.getByRole("button", { name: /show doses/i }).click();

    await expect(page.getByText("2 tablet ×")).toBeVisible();
    await expect(page.getByText("Metformin 500 mg")).toBeVisible();
  });

  test("two prescriptions at the same time are grouped under one time header", async ({
    page,
  }) => {
    await login(page);
    await page.request.post("/api/v1/prescriptions", {
      data: {
        drugName: "Metformin",
        dosage: "500 mg",
        doseCount: 1,
        doseForm: "tablet",
        schedule: { days: { monday: ["08:00"] }, timezoneMode: "local" },
        startDate: "2024-01-01",
      },
    });
    await page.request.post("/api/v1/prescriptions", {
      data: {
        drugName: "Lisinopril",
        dosage: "10 mg",
        doseCount: 1,
        doseForm: "tablet",
        schedule: { days: { monday: ["08:00"] }, timezoneMode: "local" },
        startDate: "2024-01-01",
      },
    });
    await page.goto("/");
    await page.getByRole("button", { name: /show doses/i }).click();

    const mondaySection = page.locator("section").filter({
      has: page.getByRole("heading", { level: 2, name: "Monday" }),
    });
    await expect(mondaySection.getByText("8:00 AM")).toHaveCount(1);
    await expect(mondaySection.getByText(/Metformin/)).toBeVisible();
    await expect(mondaySection.getByText(/Lisinopril/)).toBeVisible();
  });

  test("two prescriptions at different times each get their own time header", async ({
    page,
  }) => {
    await login(page);
    await page.request.post("/api/v1/prescriptions", {
      data: {
        drugName: "Metformin",
        dosage: "500 mg",
        doseCount: 1,
        doseForm: "tablet",
        schedule: { days: { monday: ["08:00"] }, timezoneMode: "local" },
        startDate: "2024-01-01",
      },
    });
    await page.request.post("/api/v1/prescriptions", {
      data: {
        drugName: "Lisinopril",
        dosage: "10 mg",
        doseCount: 1,
        doseForm: "tablet",
        schedule: { days: { monday: ["20:00"] }, timezoneMode: "local" },
        startDate: "2024-01-01",
      },
    });
    await page.goto("/");
    await page.getByRole("button", { name: /show doses/i }).click();

    const mondaySection = page.locator("section").filter({
      has: page.getByRole("heading", { level: 2, name: "Monday" }),
    });
    await expect(mondaySection.getByText("8:00 AM")).toBeVisible();
    await expect(mondaySection.getByText("8:00 PM")).toBeVisible();
  });
});
