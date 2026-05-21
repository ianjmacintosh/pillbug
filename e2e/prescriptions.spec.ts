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
    await page.getByLabel("Strength").fill("500");
    await page.getByRole("combobox", { name: /unit/i }).selectOption("mg");
    await page.getByLabel(/start date/i).fill("2024-01-01");
    await page.getByRole("checkbox", { name: "Monday" }).locator("..").click();
    await page.getByLabel(/time 1/i).fill("08:00");
    await page.getByRole("button", { name: /save prescription/i }).click();

    await page.getByRole("button", { name: /show all prescriptions/i }).click();
    await expect(page.getByRole("cell", { name: "Metformin" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "500 mg" })).toBeVisible();
  });

  test("time input is shown by default without clicking add", async ({
    page,
  }) => {
    await login(page);

    await page.getByRole("button", { name: /add prescription/i }).click();

    await expect(page.getByLabel(/time 1/i)).toBeVisible();
  });

  test("Remove button is disabled when only one dose time is shown", async ({
    page,
  }) => {
    await login(page);

    await page.getByRole("button", { name: /add prescription/i }).click();

    await expect(page.getByRole("button", { name: /remove/i })).toBeDisabled();
  });

  test("Remove button is enabled after a second dose time is added", async ({
    page,
  }) => {
    await login(page);

    await page.getByRole("button", { name: /add prescription/i }).click();
    await page.getByRole("button", { name: /add new dose time/i }).click();

    const removeButtons = page.getByRole("button", { name: /remove/i });
    await expect(removeButtons.nth(0)).toBeEnabled();
    await expect(removeButtons.nth(1)).toBeEnabled();
  });

  test("Select all checks every day; Unselect all clears them", async ({
    page,
  }) => {
    await login(page);

    await page.getByRole("button", { name: /add prescription/i }).click();

    await page.getByRole("button", { name: /select all/i }).click();
    for (const day of [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ]) {
      await expect(page.getByRole("checkbox", { name: day })).toBeChecked();
    }

    await page.getByRole("button", { name: /unselect all/i }).click();
    for (const day of [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ]) {
      await expect(page.getByRole("checkbox", { name: day })).not.toBeChecked();
    }
  });

  test("clicking a day pill checks and unchecks it", async ({ page }) => {
    await login(page);

    await page.getByRole("button", { name: /add prescription/i }).click();
    const monday = page.getByRole("checkbox", { name: "Monday" });
    const mondayPill = monday.locator("..");

    await expect(monday).not.toBeChecked();
    await mondayPill.click();
    await expect(monday).toBeChecked();
    await mondayPill.click();
    await expect(monday).not.toBeChecked();
  });

  test("Days fieldset gets aria-invalid when submitted without a day selected", async ({
    page,
  }) => {
    await login(page);

    await page.getByRole("button", { name: /add prescription/i }).click();
    await page.getByLabel(/drug name/i).fill("Aspirin");
    await page.getByLabel("Strength").fill("100");
    await page.getByRole("combobox", { name: /unit/i }).selectOption("mg");
    await page.getByLabel(/start date/i).fill("2024-06-01");
    await page.getByLabel(/time 1/i).fill("08:00");

    await page.getByRole("button", { name: /save prescription/i }).click();

    await expect(page.getByRole("group", { name: /days/i })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("Dose times fieldset gets aria-invalid when submitted with a blank time", async ({
    page,
  }) => {
    await login(page);

    await page.getByRole("button", { name: /add prescription/i }).click();
    await page.getByLabel(/drug name/i).fill("Aspirin");
    await page.getByLabel("Strength").fill("100");
    await page.getByRole("combobox", { name: /unit/i }).selectOption("mg");
    await page.getByLabel(/start date/i).fill("2024-06-01");
    await page.getByRole("checkbox", { name: "Monday" }).locator("..").click();
    await page.getByLabel(/time 1/i).clear();

    await page.getByRole("button", { name: /save prescription/i }).click();

    await expect(
      page.getByRole("group", { name: /dose times/i }),
    ).toHaveAttribute("aria-invalid", "true");
  });

  test("creates prescription with multiple dose times on multiple days", async ({
    page,
  }) => {
    await login(page);

    await page.getByRole("button", { name: /add prescription/i }).click();
    await page.getByLabel(/drug name/i).fill("Lisinopril");
    await page.getByLabel("Strength").fill("10");
    await page.getByRole("combobox", { name: /unit/i }).selectOption("mg");
    await page.getByLabel(/start date/i).fill("2024-03-01");
    await page.getByRole("checkbox", { name: "Monday" }).locator("..").click();
    await page
      .getByRole("checkbox", { name: "Thursday" })
      .locator("..")
      .click();
    await page.getByLabel(/time 1/i).fill("08:00");
    await page.getByRole("button", { name: /add new dose time/i }).click();
    await page.getByLabel(/time 2/i).fill("20:00");
    await page.getByRole("button", { name: /save prescription/i }).click();

    // verify the prescription was saved by opening edit and checking schedule
    await page.getByRole("button", { name: /show all prescriptions/i }).click();
    await expect(page.getByRole("cell", { name: "Lisinopril" })).toBeVisible();
    await page.getByRole("button", { name: /edit/i }).click();
    await expect(page.getByRole("checkbox", { name: "Monday" })).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "Thursday" }),
    ).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "Tuesday" }),
    ).not.toBeChecked();
    const times = [
      await page.getByLabel(/time 1/i).inputValue(),
      await page.getByLabel(/time 2/i).inputValue(),
    ].sort();
    expect(times).toEqual(["08:00", "20:00"]);
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
    await expect(page.getByLabel("Strength")).toHaveValue("500mg");
    await expect(page.getByLabel(/start date/i)).toHaveValue("2024-01-01");

    await page.getByLabel("Strength").clear();
    await page.getByLabel("Strength").fill("1000mg");
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
