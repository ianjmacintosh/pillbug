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
  dosage: "500 mg",
  schedule: { days: { monday: ["08:00"] }, timezoneMode: "local" },
  startDate: "2024-01-01",
  doseCount: 1,
  doseForm: "tablet",
};

test.beforeEach(async () => {
  await clearPrescriptions();
});

test.describe("Prescription list — on mount", () => {
  test("empty state: add form is shown and list is empty", async ({ page }) => {
    await login(page);

    await expect(page.getByRole("heading", { level: 2 })).toHaveText(
      /add prescription/i,
    );
    await expect(page.getByRole("list")).toBeEmpty();
  });

  test("prescriptions load automatically without any button click", async ({
    page,
  }) => {
    await login(page);
    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    await page.goto("/prescriptions");

    await expect(page.getByRole("button", { name: "Metformin" })).toBeVisible();
  });

  test("first prescription is auto-selected and its edit form is shown", async ({
    page,
  }) => {
    await login(page);
    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    await page.goto("/prescriptions");

    await expect(page.getByRole("heading", { level: 2 })).toHaveText(
      /edit prescription/i,
    );
    await expect(page.getByLabel(/drug name/i)).toHaveValue("Metformin");
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

  test("clicking a prescription in the list loads its edit form", async ({
    page,
  }) => {
    await login(page);
    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    await page.request.post("/api/v1/prescriptions", {
      data: { ...BASE_PRESCRIPTION, drugName: "Lisinopril" },
    });
    await page.goto("/prescriptions");

    await page.getByRole("button", { name: "Lisinopril" }).click();

    await expect(page.getByLabel(/drug name/i)).toHaveValue("Lisinopril");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(
      /edit prescription/i,
    );
  });
});

test.describe("Prescription create", () => {
  async function fillAndSave(page: Page) {
    await page.getByLabel(/drug name/i).fill("Aspirin");
    await page.getByLabel("Strength").fill("100");
    await page.getByRole("combobox", { name: /unit/i }).selectOption("mg");
    await page.getByLabel(/start date/i).fill("2024-06-01");
    await page.getByRole("checkbox", { name: "Monday" }).locator("..").click();
    await page.getByLabel(/time 1/i).fill("08:00");
    await page.getByRole("button", { name: /save prescription/i }).click();
  }

  test("add prescription form creates prescription and it appears in the list", async ({
    page,
  }) => {
    await login(page);
    await fillAndSave(page);

    await expect(page.getByRole("button", { name: "Aspirin" })).toBeVisible();
  });

  test("after create, edit form is shown with the new prescription", async ({
    page,
  }) => {
    await login(page);
    await fillAndSave(page);

    await expect(page.getByRole("heading", { level: 2 })).toHaveText(
      /edit prescription/i,
    );
    await expect(page.getByLabel(/drug name/i)).toHaveValue("Aspirin");
  });

  test("count in heading increments after create", async ({ page }) => {
    await login(page);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("(0)");

    await fillAndSave(page);

    await expect(page.getByRole("heading", { level: 1 })).toContainText("(1)");
  });

  test("clicking '+ Add Prescription' switches to the add form with empty fields", async ({
    page,
  }) => {
    await login(page);
    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    await page.goto("/prescriptions");

    await expect(page.getByRole("heading", { level: 2 })).toHaveText(
      /edit prescription/i,
    );
    await page.getByRole("button", { name: /add prescription/i }).click();

    await expect(page.getByRole("heading", { level: 2 })).toHaveText(
      /add prescription/i,
    );
    await expect(page.getByLabel(/drug name/i)).toHaveValue("");
  });

  test("Days fieldset gets aria-invalid when submitted without a day selected", async ({
    page,
  }) => {
    await login(page);
    await page.getByLabel(/drug name/i).fill("Aspirin");
    await page.getByLabel("Strength").fill("100");
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
    await page.getByLabel(/drug name/i).fill("Aspirin");
    await page.getByLabel("Strength").fill("100");
    await page.getByLabel(/start date/i).fill("2024-06-01");
    await page.getByRole("checkbox", { name: "Monday" }).locator("..").click();
    await page.getByLabel(/time 1/i).clear();

    await page.getByRole("button", { name: /save prescription/i }).click();

    await expect(
      page.getByRole("group", { name: /dose times/i }),
    ).toHaveAttribute("aria-invalid", "true");
  });

  test("Select all checks every day; Unselect all clears them", async ({
    page,
  }) => {
    await login(page);
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
    const monday = page.getByRole("checkbox", { name: "Monday" });
    const mondayPill = monday.locator("..");

    await expect(monday).not.toBeChecked();
    await mondayPill.click();
    await expect(monday).toBeChecked();
    await mondayPill.click();
    await expect(monday).not.toBeChecked();
  });

  test("Remove button is disabled when only one dose time is shown", async ({
    page,
  }) => {
    await login(page);
    await expect(page.getByRole("button", { name: /remove/i })).toBeDisabled();
  });

  test("Remove button is enabled after a second dose time is added", async ({
    page,
  }) => {
    await login(page);
    await page.getByRole("button", { name: /add new dose time/i }).click();

    const removeButtons = page.getByRole("button", { name: /remove/i });
    await expect(removeButtons.nth(0)).toBeEnabled();
    await expect(removeButtons.nth(1)).toBeEnabled();
  });
});

test.describe("Prescription edit", () => {
  test("edit form pre-populates fields from the selected prescription", async ({
    page,
  }) => {
    await login(page);
    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    await page.goto("/prescriptions");

    await expect(page.getByLabel(/drug name/i)).toHaveValue("Metformin");
    await expect(page.getByLabel("Strength")).toHaveValue("500");
    await expect(page.getByRole("combobox", { name: /unit/i })).toHaveValue(
      "mg",
    );
    await expect(page.getByLabel(/start date/i)).toHaveValue("2024-01-01");
  });

  test("saving an edit keeps the edit form open with updated values", async ({
    page,
  }) => {
    await login(page);
    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    await page.goto("/prescriptions");

    await page.getByLabel(/drug name/i).fill("Metformin XR");
    await page.getByRole("button", { name: /save prescription/i }).click();

    await expect(page.getByRole("heading", { level: 2 })).toHaveText(
      /edit prescription/i,
    );
    await expect(page.getByLabel(/drug name/i)).toHaveValue("Metformin XR");
    await expect(
      page.getByRole("button", { name: "Metformin XR" }),
    ).toBeVisible();
  });

  test("cancel returns to the add form with empty fields", async ({ page }) => {
    await login(page);
    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    await page.goto("/prescriptions");

    await page.getByRole("button", { name: /cancel/i }).click();

    await expect(page.getByRole("heading", { level: 2 })).toHaveText(
      /add prescription/i,
    );
    await expect(page.getByLabel(/drug name/i)).toHaveValue("");
    await expect(page.getByRole("button", { name: "Metformin" })).toBeVisible();
  });

  test("edit form pre-populates scheduled days and times", async ({ page }) => {
    await login(page);
    await page.request.post("/api/v1/prescriptions", {
      data: {
        ...BASE_PRESCRIPTION,
        schedule: {
          days: { monday: ["08:00"], friday: ["08:00", "20:00"] },
          timezoneMode: "local",
        },
      },
    });
    await page.goto("/prescriptions");

    await expect(page.getByRole("checkbox", { name: "Monday" })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Friday" })).toBeChecked();
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

test.describe("Prescription delete", () => {
  test("delete button has an accessible label that includes the drug name", async ({
    page,
  }) => {
    await login(page);
    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    await page.goto("/prescriptions");

    await expect(
      page.getByRole("button", { name: /delete metformin/i }),
    ).toBeAttached();
  });

  test("clicking Delete shows a modal overlay with permanence and dose history warnings", async ({
    page,
  }) => {
    await login(page);
    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    await page.goto("/prescriptions");

    await page.getByRole("button", { name: /delete metformin/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/permanent/i)).toBeVisible();
    await expect(dialog.getByText(/dose history/i)).toBeVisible();
  });

  test("confirming delete removes the prescription from the list", async ({
    page,
  }) => {
    await login(page);
    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    await page.goto("/prescriptions");

    await page.getByRole("button", { name: /delete metformin/i }).click();
    await page.getByRole("button", { name: /yes, delete/i }).click();

    await expect(
      page.getByRole("button", { name: "Metformin" }),
    ).not.toBeAttached();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("(0)");
  });

  test("cancelling delete closes the dialog and keeps the prescription", async ({
    page,
  }) => {
    await login(page);
    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    await page.goto("/prescriptions");

    await page.getByRole("button", { name: /delete metformin/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page
      .getByRole("dialog")
      .getByRole("button", { name: /cancel/i })
      .click();

    await expect(page.getByRole("dialog")).not.toBeAttached();
    await expect(page.getByRole("button", { name: "Metformin" })).toBeVisible();
  });
});

test.describe("Mobile navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("clicking a prescription switches to the form panel", async ({
    page,
  }) => {
    await login(page);
    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    await page.goto("/prescriptions");

    const listPanel = page.locator(".prescriptions-list-panel");
    const formPanel = page.locator(".prescriptions-form-panel");

    await expect(listPanel).toBeVisible();
    await expect(formPanel).not.toBeVisible();

    await page.getByRole("button", { name: "Metformin" }).click();

    await expect(formPanel).toBeVisible();
    await expect(listPanel).not.toBeVisible();
  });

  test("back button returns to the list panel", async ({ page }) => {
    await login(page);
    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    await page.goto("/prescriptions");

    await page.getByRole("button", { name: "Metformin" }).click();
    await expect(page.locator(".prescriptions-form-panel")).toBeVisible();

    await page.getByRole("button", { name: /back to list/i }).click();

    await expect(page.locator(".prescriptions-list-panel")).toBeVisible();
    await expect(page.locator(".prescriptions-form-panel")).not.toBeVisible();
  });
});
