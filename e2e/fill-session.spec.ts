import { getPlatformProxy } from "wrangler";
import type { D1Database } from "@cloudflare/workers-types";
import { expect, test, type Page } from "@playwright/test";
import { hashEmail } from "../worker/email-crypto";
import { setKnownPin, TURNSTILE_DUMMY_TOKEN, TEST_PIN } from "./helpers";
import { PRESCRIPTIONS_PATIENT_EMAIL } from "./test-accounts";

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

test.beforeEach(async () => {
  await clearPrescriptions();
});

test.describe("Fill Session", () => {
  test.describe("empty state", () => {
    test("shows heading", async ({ page }) => {
      await login(page);
      await page.goto("/fill-session");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });

    test("shows no active prescriptions message", async ({ page }) => {
      await login(page);
      await page.goto("/fill-session");
      await expect(page.getByText(/no active prescriptions/i)).toBeVisible();
    });
  });

  test.describe("card list", () => {
    test("shows one card per active prescription", async ({ page }) => {
      await login(page);
      await page.request.post("/api/v1/prescriptions", { data: METFORMIN });
      await page.request.post("/api/v1/prescriptions", { data: LISINOPRIL });
      await page.goto("/fill-session");

      await expect(page.getByText("Metformin")).toBeVisible();
      await expect(page.getByText("Lisinopril")).toBeVisible();
    });

    test("card header shows drug name, dosage, and weekly pill count", async ({
      page,
    }) => {
      await login(page);
      await page.request.post("/api/v1/prescriptions", { data: METFORMIN });
      await page.goto("/fill-session");

      await expect(page.getByText("Metformin")).toBeVisible();
      await expect(page.getByText("500 mg")).toBeVisible();
      await expect(page.getByText(/7 pills/)).toBeVisible();
    });

    test("drug name and dosage are visible on closed cards", async ({
      page,
    }) => {
      await login(page);
      await page.request.post("/api/v1/prescriptions", { data: METFORMIN });
      await page.request.post("/api/v1/prescriptions", { data: LISINOPRIL });
      await page.goto("/fill-session");

      // Close the first card, then confirm both headers still visible
      await page.getByRole("button", { name: /metformin/i }).click();
      await expect(page.getByText("Metformin")).toBeVisible();
      await expect(page.getByText("Lisinopril")).toBeVisible();
    });
  });

  test.describe("accordion", () => {
    test("first card is open on load", async ({ page }) => {
      await login(page);
      await page.request.post("/api/v1/prescriptions", { data: METFORMIN });
      await page.request.post("/api/v1/prescriptions", { data: LISINOPRIL });
      await page.goto("/fill-session");

      await expect(
        page.getByRole("button", { name: /metformin/i }),
      ).toHaveAttribute("aria-expanded", "true");
    });

    test("subsequent cards are closed on load", async ({ page }) => {
      await login(page);
      await page.request.post("/api/v1/prescriptions", { data: METFORMIN });
      await page.request.post("/api/v1/prescriptions", { data: LISINOPRIL });
      await page.goto("/fill-session");

      await expect(
        page.getByRole("button", { name: /lisinopril/i }),
      ).toHaveAttribute("aria-expanded", "false");
    });

    test("open card shows the organizer grid with day headers", async ({
      page,
    }) => {
      await login(page);
      await page.request.post("/api/v1/prescriptions", { data: METFORMIN });
      await page.goto("/fill-session");

      for (const day of ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]) {
        await expect(page.getByText(day)).toBeVisible();
      }
    });

    test("clicking a closed card opens it and closes the previously open card", async ({
      page,
    }) => {
      await login(page);
      await page.request.post("/api/v1/prescriptions", { data: METFORMIN });
      await page.request.post("/api/v1/prescriptions", { data: LISINOPRIL });
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
      await login(page);
      await page.request.post("/api/v1/prescriptions", { data: METFORMIN });
      await page.goto("/fill-session");

      const header = page.getByRole("button", { name: /metformin/i });
      await header.click();

      await expect(header).toHaveAttribute("aria-expanded", "false");
    });
  });

  test.describe("organizer selector", () => {
    test("defaults to Simple 7-day organizer", async ({ page }) => {
      await login(page);
      await page.request.post("/api/v1/prescriptions", { data: METFORMIN });
      await page.goto("/fill-session");

      await expect(
        page.getByRole("combobox", { name: /pill organizer/i }),
      ).toHaveValue("1");
    });

    test("switching to AM/PM shows AM and PM slot labels", async ({ page }) => {
      await login(page);
      await page.request.post("/api/v1/prescriptions", { data: LISINOPRIL });
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
      await login(page);
      await page.request.post("/api/v1/prescriptions", { data: METFORMIN });
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
