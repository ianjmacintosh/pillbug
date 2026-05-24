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

const BASE_PRESCRIPTION = {
  drugName: "Metformin",
  dosage: "500 mg",
  schedule: { days: { monday: ["08:00"] }, timezoneMode: "local" },
  startDate: "2024-01-01",
  doseCount: 1,
  doseForm: "tablet",
};

test.beforeEach(async () => {
  await clearPrescriptions();
});

async function fillCreateForm(page: Page) {
  await page.getByLabel(/drug name/i).fill("Aspirin");
  await page.getByLabel("Strength").fill("100");
  await page.getByRole("combobox", { name: /unit/i }).selectOption("mg");
  await page.getByLabel(/start date/i).fill("2024-06-01");
  await page.getByRole("checkbox", { name: "Monday" }).locator("..").click();
  await page.getByLabel(/time 1/i).fill("08:00");
  await page.getByRole("button", { name: /save prescription/i }).click();
}

test.describe("Prescription list", () => {
  test("empty state: list is empty and Add Prescription link is present", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/prescriptions");

    await expect(page.getByRole("list")).toBeEmpty();
    await expect(
      page.getByRole("link", { name: /add prescription/i }),
    ).toBeVisible();
  });

  test("prescriptions load as links", async ({ page }) => {
    await login(page);
    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    await page.goto("/prescriptions");

    await expect(
      page.getByRole("link", { name: "Metformin", exact: true }),
    ).toBeVisible();
  });

  test("heading shows prescription count", async ({ page }) => {
    await login(page);
    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    await page.request.post("/api/v1/prescriptions", {
      data: { ...BASE_PRESCRIPTION, drugName: "Lisinopril" },
    });
    await page.goto("/prescriptions");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("(2)");
  });

  test("Add Prescription link navigates to create form", async ({ page }) => {
    await login(page);
    await page.goto("/prescriptions");
    await page.getByRole("link", { name: /add prescription/i }).click();

    await expect(page).toHaveURL("/prescriptions/new");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(
      /add prescription/i,
    );
  });
});

test.describe("Prescription create", () => {
  test("fill and save navigates to the edit form for the new prescription", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/prescriptions/new");
    await fillCreateForm(page);

    await expect(page).toHaveURL(/\/prescriptions\/.+\/edit/);
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(
      /edit prescription/i,
    );
  });

  test("new prescription appears in the list after create", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/prescriptions/new");
    await fillCreateForm(page);

    await page.goto("/prescriptions");

    await expect(
      page.getByRole("link", { name: "Aspirin", exact: true }),
    ).toBeVisible();
  });

  test("Days and Times fieldset is aria-invalid when submitted without a day selected", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/prescriptions/new");
    await page.getByLabel(/drug name/i).fill("Aspirin");
    await page.getByLabel("Strength").fill("100");
    await page.getByLabel(/start date/i).fill("2024-06-01");
    await page.getByLabel(/time 1/i).fill("08:00");

    await page.getByRole("button", { name: /save prescription/i }).click();

    await expect(
      page.getByRole("group", { name: /days and times/i }),
    ).toHaveAttribute("aria-invalid", "true");
  });

  test("Days and Times fieldset is aria-invalid when submitted with a blank time", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/prescriptions/new");
    await page.getByLabel(/drug name/i).fill("Aspirin");
    await page.getByLabel("Strength").fill("100");
    await page.getByLabel(/start date/i).fill("2024-06-01");
    await page.getByRole("checkbox", { name: "Monday" }).locator("..").click();
    await page.getByLabel(/time 1/i).clear();

    await page.getByRole("button", { name: /save prescription/i }).click();

    await expect(
      page.getByRole("group", { name: /days and times/i }),
    ).toHaveAttribute("aria-invalid", "true");
  });

  test("clicking a day pill checks and unchecks it", async ({ page }) => {
    await login(page);
    await page.goto("/prescriptions/new");
    const monday = page.getByRole("checkbox", { name: "Monday" });
    const mondayPill = monday.locator("..");

    await expect(monday).not.toBeChecked();
    await mondayPill.click();
    await expect(monday).toBeChecked();
    await mondayPill.click();
    await expect(monday).not.toBeChecked();
  });

  test("Remove time button is disabled when only one dose time is shown", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/prescriptions/new");

    await expect(
      page.getByRole("button", { name: /remove time/i }),
    ).toBeDisabled();
  });

  test("Remove time button is enabled after a second dose time is added", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/prescriptions/new");
    await page.getByRole("button", { name: /add new dose time/i }).click();

    const removeButtons = page.getByRole("button", { name: /remove time/i });
    await expect(removeButtons.nth(0)).toBeEnabled();
    await expect(removeButtons.nth(1)).toBeEnabled();
  });
});

test.describe("Prescription edit", () => {
  test("edit form pre-populates fields from the prescription", async ({
    page,
  }) => {
    await login(page);
    const res = await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    const { id } = (await res.json()) as { id: string };
    await page.goto(`/prescriptions/${id}/edit`);

    await expect(page.getByLabel(/drug name/i)).toHaveValue("Metformin");
    await expect(page.getByLabel("Strength")).toHaveValue("500");
    await expect(page.getByRole("combobox", { name: /unit/i })).toHaveValue(
      "mg",
    );
    await expect(page.getByLabel(/start date/i)).toHaveValue("2024-01-01");
  });

  test("edit form pre-populates scheduled days and times", async ({ page }) => {
    await login(page);
    const res = await page.request.post("/api/v1/prescriptions", {
      data: {
        ...BASE_PRESCRIPTION,
        schedule: {
          days: { monday: ["08:00"], wednesday: ["08:00"] },
          timezoneMode: "local",
        },
      },
    });
    const { id } = (await res.json()) as { id: string };
    await page.goto(`/prescriptions/${id}/edit`);

    await expect(page.getByRole("checkbox", { name: "Monday" })).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "Wednesday" }),
    ).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "Tuesday" }),
    ).not.toBeChecked();
    await expect(page.getByLabel(/time 1/i)).toHaveValue("08:00");
  });

  test("saving an edit keeps the edit form open with updated drug name", async ({
    page,
  }) => {
    await login(page);
    const res = await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    const { id } = (await res.json()) as { id: string };
    await page.goto(`/prescriptions/${id}/edit`);

    await page.getByLabel(/drug name/i).fill("Metformin XR");
    await page.getByRole("button", { name: /save prescription/i }).click();

    await expect(page).toHaveURL(/\/prescriptions\/.+\/edit/);
    await expect(page.getByLabel(/drug name/i)).toHaveValue("Metformin XR");
  });
});
