import { getPlatformProxy } from "wrangler";
import type { D1Database } from "@cloudflare/workers-types";
import { expect, test, type Page } from "@playwright/test";
import { hashEmail } from "../worker/email-crypto";
import { getLatestToken } from "./helpers";
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
  await page.request.post("/api/v1/login/silent", {
    data: { email: PRESCRIPTIONS_PATIENT_EMAIL },
  });
  const token = await getLatestToken(PRESCRIPTIONS_PATIENT_EMAIL);
  await page.goto(`/verify?token=${token}`);
  await expect(page).toHaveURL("/");
  await page.goto("/prescriptions");
}

const BASE_PRESCRIPTION = {
  drugName: "Metformin",
  dosage: "500mg",
  schedule: { days: { monday: ["08:00"] }, timezoneMode: "local" },
  startDate: "2024-01-01",
};

test.beforeEach(async () => {
  await clearPrescriptions();
});

test.describe("Prescription list", () => {
  test("list is hidden by default and shows empty state when patient has no prescriptions", async ({
    page,
  }) => {
    await login(page);

    await expect(
      page.getByRole("button", { name: /show all prescriptions/i }),
    ).toBeVisible();
    await expect(page.getByRole("table")).not.toBeAttached();

    await page.getByRole("button", { name: /show all prescriptions/i }).click();
    await expect(page.getByText(/no active prescriptions/i)).toBeVisible();
  });

  test("Hide button collapses the list", async ({ page }) => {
    await login(page);

    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });

    await page.getByRole("button", { name: /show all prescriptions/i }).click();
    await expect(page.getByRole("cell", { name: "Metformin" })).toBeVisible();

    await page.getByRole("button", { name: /hide/i }).click();
    await expect(page.getByRole("table")).not.toBeAttached();
    await expect(
      page.getByRole("button", { name: /show all prescriptions/i }),
    ).toBeVisible();
  });

  test("list resets to hidden after navigating away and back", async ({
    page,
  }) => {
    await login(page);

    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });

    await page.getByRole("button", { name: /show all prescriptions/i }).click();
    await expect(page.getByRole("cell", { name: "Metformin" })).toBeVisible();

    await page.goto("/settings");
    await page.goto("/prescriptions");

    await expect(page.getByRole("table")).not.toBeAttached();
    await expect(
      page.getByRole("button", { name: /show all prescriptions/i }),
    ).toBeVisible();
  });
});

test.describe("Prescription create", () => {
  test("add prescription form creates prescription and it appears in list", async ({
    page,
  }) => {
    await login(page);

    await page.getByRole("button", { name: /add prescription/i }).click();
    await page.getByLabel(/drug name/i).fill("Metformin");
    await page.getByLabel("Dosage").fill("500mg");
    await page.getByLabel(/start date/i).fill("2024-01-01");
    await page.getByRole("button", { name: /save prescription/i }).click();

    await page.getByRole("button", { name: /show all prescriptions/i }).click();
    await expect(page.getByRole("cell", { name: "Metformin" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "500mg" })).toBeVisible();
  });
});

test.describe("Prescription edit", () => {
  test("edit form pre-populates fields and updates prescription on save", async ({
    page,
  }) => {
    await login(page);

    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });

    await page.getByRole("button", { name: /show all prescriptions/i }).click();
    await expect(page.getByRole("cell", { name: "Metformin" })).toBeVisible();

    await page.getByRole("button", { name: /edit/i }).click();
    await expect(page.getByLabel(/drug name/i)).toHaveValue("Metformin");
    await expect(page.getByLabel("Dosage")).toHaveValue("500mg");
    await expect(page.getByLabel(/start date/i)).toHaveValue("2024-01-01");

    await page.getByLabel("Dosage").clear();
    await page.getByLabel("Dosage").fill("1000mg");
    await page.getByRole("button", { name: /save prescription/i }).click();

    await expect(page.getByRole("cell", { name: "1000mg" })).toBeVisible();
    await expect(page.getByLabel(/drug name/i)).not.toBeAttached();
  });

  test("cancel closes edit form without modifying the prescription", async ({
    page,
  }) => {
    await login(page);

    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });

    await page.getByRole("button", { name: /show all prescriptions/i }).click();
    await page.getByRole("button", { name: /edit/i }).click();
    await page.getByRole("button", { name: /cancel/i }).click();

    await expect(page.getByLabel(/drug name/i)).not.toBeAttached();
    await expect(page.getByRole("cell", { name: "Metformin" })).toBeVisible();
  });
});

test.describe("Prescription delete", () => {
  test("confirmation dialog warns about permanence and dose history; confirm removes prescription", async ({
    page,
  }) => {
    await login(page);

    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });

    await page.getByRole("button", { name: /show all prescriptions/i }).click();
    await expect(page.getByRole("cell", { name: "Metformin" })).toBeVisible();

    await page.getByRole("button", { name: /delete/i }).click();
    await expect(page.getByText(/permanent/i)).toBeVisible();
    await expect(page.getByText(/dose history/i)).toBeVisible();

    await page.getByRole("button", { name: /yes, delete/i }).click();
    await expect(
      page.getByRole("cell", { name: "Metformin" }),
    ).not.toBeAttached();
  });

  test("cancel closes delete confirmation without removing prescription", async ({
    page,
  }) => {
    await login(page);

    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });

    await page.getByRole("button", { name: /show all prescriptions/i }).click();
    await page.getByRole("button", { name: /delete/i }).click();
    await expect(page.getByText(/permanent/i)).toBeVisible();

    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByText(/permanent/i)).not.toBeVisible();
    await expect(page.getByRole("cell", { name: "Metformin" })).toBeVisible();
  });
});
