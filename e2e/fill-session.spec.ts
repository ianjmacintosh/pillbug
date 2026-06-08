import { getPlatformProxy } from "wrangler";
import type { D1Database } from "@cloudflare/workers-types";
import { expect, test, type Browser } from "@playwright/test";
import { hashEmail } from "../worker/email-crypto";
import {
  PRESCRIPTIONS_PATIENT_EMAIL,
  PRESCRIPTIONS_PATIENT_AUTH_FILE,
} from "./test-accounts";

let db: D1Database;
let emailLookup: string;
let proxyDispose: () => Promise<void>;

test.beforeAll(async () => {
  const { env, dispose } = await getPlatformProxy<{ DB: D1Database }>({
    environment: "staging",
  });
  db = env.DB;
  emailLookup = await hashEmail(
    PRESCRIPTIONS_PATIENT_EMAIL,
    process.env.EMAIL_SECRET!,
  );
  proxyDispose = dispose;
});

test.afterAll(async () => {
  await proxyDispose();
});

test.use({ storageState: PRESCRIPTIONS_PATIENT_AUTH_FILE });

// Clears DB state and seeds the given prescriptions via authenticated API calls.
// Each describe block calls this in beforeAll so it owns its state regardless
// of what ran before or in what order.
async function resetState(
  browser: Browser,
  ...prescriptions: object[]
): Promise<void> {
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
  if (prescriptions.length === 0) return;
  const context = await browser.newContext({
    storageState: PRESCRIPTIONS_PATIENT_AUTH_FILE,
    baseURL: "http://localhost:5173",
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
  schedule: {
    days: Object.fromEntries(
      [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ].map((d) => [d, [{ time: "08:00", quantity: 1 }]]),
    ),
    timezoneMode: "local",
  },
  startDate: "2024-01-01",
  doseForm: "tablet",
};

const LISINOPRIL = {
  drugName: "Lisinopril",
  dosage: "10 mg",
  schedule: {
    days: Object.fromEntries(
      [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ].map((d) => [
        d,
        [
          { time: "08:00", quantity: 1 },
          { time: "20:00", quantity: 1 },
        ],
      ]),
    ),
    timezoneMode: "local",
  },
  startDate: "2024-01-01",
  doseForm: "tablet",
};

test.describe("Fill Session", () => {
  test.describe("empty state", () => {
    test.beforeAll(async ({ browser }) => {
      await resetState(browser);
    });

    test("shows heading", async ({ page }) => {
      await page.goto("/fill-session");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });

    test("shows no active prescriptions message", async ({ page }) => {
      await page.goto("/fill-session");
      await expect(page.getByText(/no active prescriptions/i)).toBeVisible();
    });
  });

  test.describe("card list", () => {
    test.beforeAll(async ({ browser }) => {
      await resetState(browser, METFORMIN, LISINOPRIL);
    });

    test("shows one card per active prescription", async ({ page }) => {
      await page.goto("/fill-session");
      await expect(page.getByText("Metformin")).toBeVisible();
      await expect(page.getByText("Lisinopril")).toBeVisible();
    });

    test("card header shows drug name, dosage, and weekly pill count", async ({
      page,
    }) => {
      await page.goto("/fill-session");
      await expect(page.getByText("Metformin")).toBeVisible();
      await expect(page.getByText("500 mg")).toBeVisible();
      await expect(page.getByText(/7 pills/)).toBeVisible();
    });

    test("drug name and dosage are visible on closed cards", async ({
      page,
    }) => {
      await page.goto("/fill-session");
      await page.getByRole("button", { name: /metformin/i }).click();
      await expect(page.getByText("Metformin")).toBeVisible();
      await expect(page.getByText("Lisinopril")).toBeVisible();
    });
  });

  test.describe("accordion", () => {
    test.beforeAll(async ({ browser }) => {
      await resetState(browser, METFORMIN, LISINOPRIL);
    });

    test("first card is open on load", async ({ page }) => {
      await page.goto("/fill-session");
      await expect(
        page.getByRole("button", { name: /metformin/i }),
      ).toHaveAttribute("aria-expanded", "true");
    });

    test("subsequent cards are closed on load", async ({ page }) => {
      await page.goto("/fill-session");
      await expect(
        page.getByRole("button", { name: /lisinopril/i }),
      ).toHaveAttribute("aria-expanded", "false");
    });

    test("open card shows the organizer grid with day headers", async ({
      page,
    }) => {
      await page.goto("/fill-session");
      for (const day of ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]) {
        await expect(page.getByText(day)).toBeVisible();
      }
    });

    test("clicking a closed card opens it and closes the previously open card", async ({
      page,
    }) => {
      await page.goto("/fill-session");
      await page.getByRole("button", { name: /lisinopril/i }).click();
      await expect(
        page.getByRole("button", { name: /lisinopril/i }),
      ).toHaveAttribute("aria-expanded", "true");
      await expect(
        page.getByRole("button", { name: /metformin/i }),
      ).toHaveAttribute("aria-expanded", "false");
    });

    test("clicking an open card closes it", async ({ page }) => {
      await page.goto("/fill-session");
      const header = page.getByRole("button", { name: /metformin/i });
      await header.click();
      await expect(header).toHaveAttribute("aria-expanded", "false");
    });
  });

  test.describe("organizer selector", () => {
    test.beforeAll(async ({ browser }) => {
      await resetState(browser, METFORMIN, LISINOPRIL);
    });

    test("defaults to Simple 7-day organizer", async ({ page }) => {
      await page.goto("/fill-session");
      await expect(
        page.getByRole("combobox", { name: /pill organizer/i }),
      ).toHaveValue("1");
    });

    test("switching to AM/PM shows AM and PM slot labels", async ({ page }) => {
      await page.goto("/fill-session");
      await page
        .getByRole("combobox", { name: /pill organizer/i })
        .selectOption("2");
      await expect(page.getByText("AM", { exact: true })).toBeVisible();
      await expect(page.getByText("PM", { exact: true })).toBeVisible();
    });

    test("switching to Morn/Noon/Night shows three slot labels", async ({
      page,
    }) => {
      await page.goto("/fill-session");
      await page
        .getByRole("combobox", { name: /pill organizer/i })
        .selectOption("3");
      await expect(page.getByText("Morn", { exact: true })).toBeVisible();
      await expect(page.getByText("Noon", { exact: true })).toBeVisible();
      await expect(page.getByText("Night", { exact: true })).toBeVisible();
    });
  });
});
