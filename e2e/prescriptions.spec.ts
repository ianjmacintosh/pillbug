import { expect, test, type Page } from "@playwright/test";
import { hashEmail } from "../worker/email-crypto";
import {
  PRESCRIPTIONS_PATIENT_EMAIL,
  PRESCRIPTIONS_PATIENT_AUTH_FILE,
} from "./test-accounts";
import { getDB, disposeDB } from "./db";

async function clearPrescriptions(): Promise<void> {
  const db = await getDB();
  const emailLookup = await hashEmail(
    PRESCRIPTIONS_PATIENT_EMAIL,
    process.env.EMAIL_SECRET!,
  );
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
}

const BASE_PRESCRIPTION = {
  drugName: "Metformin",
  dosage: "500 mg",
  schedule: {
    days: { monday: [{ time: "08:00", quantity: 1 }] },
    timezoneMode: "local",
  },
  startDate: "2024-01-01",
  doseForm: "tablet",
};

test.use({ storageState: PRESCRIPTIONS_PATIENT_AUTH_FILE });

test.beforeEach(async () => {
  await clearPrescriptions();
});

test.afterAll(async () => {
  await disposeDB();
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

test.describe("Split-panel layout", () => {
  test("list and detail panels are visible, /prescriptions redirects to first prescription", async ({
    page,
  }) => {
    const res = await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    const { id } = (await res.json()) as { id: string };

    await page.goto("/prescriptions");
    await expect(page).toHaveURL(`/prescriptions/${id}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Metformin", level: 2 }),
    ).toBeVisible();
  });

  test("prescription list is visible while create form is open", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /add prescription/i, level: 2 }),
    ).toBeVisible();
  });
});

test.describe("Prescription list", () => {
  test("empty state: list is empty, Add Prescription link is present and navigates to create form", async ({
    page,
  }) => {
    await page.goto("/prescriptions");

    await expect(page.getByRole("list")).toBeEmpty();
    await expect(
      page.getByRole("link", { name: /add prescription/i }),
    ).toBeVisible();

    await page.getByRole("link", { name: /add prescription/i }).click();
    await expect(page).toHaveURL("/prescriptions/new");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(
      /add prescription/i,
    );
  });

  test("prescriptions load as links and heading shows prescription count", async ({
    page,
  }) => {
    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    await page.request.post("/api/v1/prescriptions", {
      data: { ...BASE_PRESCRIPTION, drugName: "Lisinopril" },
    });
    await page.goto("/prescriptions");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("(2)");
    await expect(
      page.getByRole("link", { name: "Metformin", exact: true }),
    ).toBeVisible();
  });
});

test.describe("Prescription create", () => {
  test("fill and save navigates to detail view and prescription appears in list", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");
    await fillCreateForm(page);

    await expect(page).toHaveURL(/\/prescriptions\/[^/]+$/);
    await expect(
      page.getByRole("heading", { name: "Aspirin", level: 2 }),
    ).toBeVisible();

    await page.goto("/prescriptions");
    await expect(
      page.getByRole("link", { name: "Aspirin", exact: true }),
    ).toBeVisible();
  });

  test("form interactions: day pill toggles and dose time buttons", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");

    const monday = page.getByRole("checkbox", { name: "Monday" });
    const mondayPill = monday.locator("..");
    await expect(monday).not.toBeChecked();
    await mondayPill.click();
    await expect(monday).toBeChecked();
    await mondayPill.click();
    await expect(monday).not.toBeChecked();

    await expect(
      page.getByRole("button", { name: /remove time/i }),
    ).toBeDisabled();

    await page.getByRole("button", { name: /add new dose time/i }).click();
    const removeButtons = page.getByRole("button", { name: /remove time/i });
    await expect(removeButtons.nth(0)).toBeEnabled();
    await expect(removeButtons.nth(1)).toBeEnabled();
  });

  test("Days and Times fieldset is aria-invalid when submitted without a day or with a blank time", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");
    await page.getByLabel(/drug name/i).fill("Aspirin");
    await page.getByLabel("Strength").fill("100");
    await page.getByLabel(/start date/i).fill("2024-06-01");
    await page.getByLabel(/time 1/i).fill("08:00");
    await page.getByRole("button", { name: /save prescription/i }).click();
    await expect(
      page.getByRole("group", { name: /days and times/i }),
    ).toHaveAttribute("aria-invalid", "true");

    // Continue on the same page: add a day and clear the time to trigger the blank-time error
    await page.getByRole("checkbox", { name: "Monday" }).locator("..").click();
    await page.getByLabel(/time 1/i).clear();
    await page.getByRole("button", { name: /save prescription/i }).click();
    await expect(
      page.getByRole("group", { name: /days and times/i }),
    ).toHaveAttribute("aria-invalid", "true");
  });
});

test.describe("Prescription edit", () => {
  test("edit form pre-populates all fields, days, and times", async ({
    page,
  }) => {
    const res = await page.request.post("/api/v1/prescriptions", {
      data: {
        ...BASE_PRESCRIPTION,
        schedule: {
          days: {
            monday: [{ time: "08:00", quantity: 1 }],
            wednesday: [{ time: "08:00", quantity: 1 }],
          },
          timezoneMode: "local",
        },
      },
    });
    const { id } = (await res.json()) as { id: string };
    await page.goto(`/prescriptions/${id}/edit`);

    await expect(page.getByLabel(/drug name/i)).toHaveValue("Metformin");
    await expect(page.getByLabel("Strength")).toHaveValue("500");
    await expect(page.getByRole("combobox", { name: /unit/i })).toHaveValue(
      "mg",
    );
    await expect(page.getByLabel(/start date/i)).toHaveValue("2024-01-01");
    await expect(page.getByRole("checkbox", { name: "Monday" })).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "Wednesday" }),
    ).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "Tuesday" }),
    ).not.toBeChecked();
    await expect(page.getByLabel(/time 1/i)).toHaveValue("08:00");
  });

  test("saving an edit navigates to the prescription detail view", async ({
    page,
  }) => {
    const res = await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    const { id } = (await res.json()) as { id: string };
    await page.goto(`/prescriptions/${id}/edit`);

    await page.getByLabel(/drug name/i).fill("Metformin XR");
    await page.getByRole("button", { name: /save prescription/i }).click();

    await expect(page).toHaveURL(`/prescriptions/${id}`);
    await expect(
      page.getByRole("heading", { name: "Metformin XR", level: 2 }),
    ).toBeVisible();
  });
});

test.describe("Prescription detail", () => {
  test("detail page shows drug info, schedule, and Edit button navigates to edit route", async ({
    page,
  }) => {
    const res = await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    const { id } = (await res.json()) as { id: string };
    await page.goto(`/prescriptions/${id}`);

    await expect(page.getByRole("heading", { level: 2 })).toHaveText(
      "Metformin",
    );
    await expect(page.getByText("500 mg")).toBeVisible();
    await expect(page.getByText("01/01/2024")).toBeVisible();
    await expect(page.getByText("8:00 AM")).toBeVisible();

    await page.getByRole("link", { name: /edit/i }).click();
    await expect(page).toHaveURL(`/prescriptions/${id}/edit`);
  });

  test("delete flow: dialog opens, cancel preserves prescription, confirm deletes it", async ({
    page,
  }) => {
    const res = await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    const { id } = (await res.json()) as { id: string };
    await page.goto(`/prescriptions/${id}`);

    await page.getByRole("button", { name: /delete/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/permanent/i);
    await expect(dialog).toContainText(/dose history/i);

    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(
      "Metformin",
    );

    await page.getByRole("button", { name: /delete/i }).click();
    await page.getByRole("button", { name: /confirm delete/i }).click();
    await expect(page).toHaveURL("/prescriptions");
    await expect(page.getByRole("list")).toBeEmpty();
  });

  test("clicking a different prescription in the list updates the detail panel", async ({
    page,
  }) => {
    const res1 = await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    const { id: metforminId } = (await res1.json()) as { id: string };
    const res2 = await page.request.post("/api/v1/prescriptions", {
      data: { ...BASE_PRESCRIPTION, drugName: "Lisinopril" },
    });
    const { id: lisinoprilId } = (await res2.json()) as { id: string };

    await page.goto(`/prescriptions/${metforminId}`);
    await page.getByRole("link", { name: "Lisinopril", exact: true }).click();

    await expect(page).toHaveURL(`/prescriptions/${lisinoprilId}`);
    await expect(
      page.getByRole("heading", { name: "Lisinopril", level: 2 }),
    ).toBeVisible();
  });
});
