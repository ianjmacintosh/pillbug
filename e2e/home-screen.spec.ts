import { expect, test, type Browser } from "@playwright/test";
import { hashEmail } from "../worker/email-crypto";
import {
  PRESCRIPTIONS_PATIENT_EMAIL,
  PRESCRIPTIONS_PATIENT_AUTH_FILE,
} from "./test-accounts";
import { getDB, disposeDB } from "./db";

let emailLookup: string;

test.beforeAll(async () => {
  emailLookup = await hashEmail(
    PRESCRIPTIONS_PATIENT_EMAIL,
    process.env.EMAIL_SECRET!,
  );
});

test.afterAll(async () => {
  await disposeDB();
});

test.use({ storageState: PRESCRIPTIONS_PATIENT_AUTH_FILE });

async function resetState(
  browser: Browser,
  ...prescriptions: object[]
): Promise<void> {
  const db = await getDB();
  await db
    .prepare("UPDATE patients SET timezone = ? WHERE email_lookup = ?")
    .bind("America/Chicago", emailLookup)
    .run();
  await db
    .prepare(
      "DELETE FROM prescriptions WHERE patient_id IN (SELECT id FROM patients WHERE email_lookup = ?)",
    )
    .bind(emailLookup)
    .run();
  await db
    .prepare(
      "DELETE FROM fill_sessions WHERE patient_id IN (SELECT id FROM patients WHERE email_lookup = ?)",
    )
    .bind(emailLookup)
    .run();
  if (prescriptions.length === 0) return;
  const context = await browser.newContext({
    storageState: PRESCRIPTIONS_PATIENT_AUTH_FILE,
  });
  try {
    for (const data of prescriptions) {
      await context.request.post("/api/v1/prescriptions", { data });
    }
  } finally {
    await context.close();
  }
}

const METFORMIN = {
  drugName: "Metformin",
  dosage: "500 mg",
  doseForm: "tablet",
  schedule: { days: { monday: [{ time: "08:00", quantity: 1 }] } },
  startDate: "2024-01-01",
};

test.describe("Home Screen", () => {
  test.describe("patient with prescriptions and no completed Fill Session", () => {
    test.beforeEach(async ({ browser }) => {
      await resetState(browser, METFORMIN);
    });

    test("shows a Start Fill Session CTA and an Edit Prescriptions link, no Last filled text", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(page).toHaveURL("/");

      await expect(
        page.getByRole("link", { name: /start fill session/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /edit prescriptions/i }),
      ).toBeVisible();
      await expect(page.getByText(/last filled/i)).not.toBeVisible();
    });

    test("the Fill Session bottom nav tab is active on the Home Screen", async ({
      browser,
    }) => {
      // BottomNav only renders on mobile viewports.
      const context = await browser.newContext({
        storageState: PRESCRIPTIONS_PATIENT_AUTH_FILE,
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      await page.goto("/");
      const nav = page.getByRole("navigation", { name: /main navigation/i });
      await expect(
        nav.getByRole("link", { name: /fill session/i }),
      ).toHaveAttribute("aria-current", "page");
      await context.close();
    });

    test("Edit Prescriptions navigates to /prescriptions", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("link", { name: /edit prescriptions/i }).click();
      await expect(page).toHaveURL("/prescriptions");
    });

    test("shows drug names in the prescription list", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByText("Metformin")).toBeVisible();
    });

    test("completing a Fill Session returns to the Home Screen and shows a Last filled date", async ({
      page,
    }) => {
      await page.goto("/");
      await page.getByRole("link", { name: /start fill session/i }).click();
      await expect(page).toHaveURL(/\/fill-session\/step1$/);

      await page.getByRole("button", { name: /continue/i }).click(); // step1 -> step2
      await page.getByRole("button", { name: /i'm ready/i }).click(); // step2 -> step3
      await page.getByRole("button", { name: /continue/i }).click(); // step3 -> step4 (Check your supply)
      await page.getByRole("button", { name: /continue/i }).click(); // step4 -> step5 (Fill)
      await expect(page.getByText("Metformin")).toBeVisible();
      await page.getByRole("button", { name: /done filling/i }).click();
      await page.getByRole("button", { name: /^done$/i }).click();

      await expect(page).toHaveURL("/");
      await expect(page.getByText(/last filled/i)).toBeVisible();
    });
  });

  test.describe("patient with zero prescriptions", () => {
    test.beforeEach(async ({ browser }) => {
      await resetState(browser);
    });

    test("shows an Add your first prescription CTA instead of Start Fill Session", async ({
      page,
    }) => {
      await page.goto("/");

      await expect(
        page.getByRole("link", { name: /add your first prescription/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /start fill session/i }),
      ).not.toBeVisible();
    });

    test("Add your first prescription navigates to /prescriptions/new", async ({
      page,
    }) => {
      await page.goto("/");
      await page
        .getByRole("link", { name: /add your first prescription/i })
        .click();
      await expect(page).toHaveURL("/prescriptions/new");
    });
  });
});
