import { expect, test } from "@playwright/test";
import { hashEmail } from "../worker/email-crypto";
import {
  ALICE_AUTH_FILE,
  ALICE_EMAIL,
  PRESCRIPTIONS_PATIENT_EMAIL,
  PRESCRIPTIONS_PATIENT_AUTH_FILE,
} from "./test-accounts";
import { getDB, disposeDB } from "./db";

async function resetAliceLanguage(): Promise<void> {
  const db = await getDB();
  const emailLookup = await hashEmail(ALICE_EMAIL, process.env.EMAIL_SECRET!);
  await db
    .prepare("UPDATE patients SET language = NULL WHERE email_lookup = ?")
    .bind(emailLookup)
    .run();
}

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

test.afterAll(async () => {
  await disposeDB();
});

test.describe("Home screen week navigation", () => {
  test.use({ storageState: ALICE_AUTH_FILE });

  test.beforeEach(async () => {
    await resetAliceLanguage();
  });

  test("Previous week is enabled, Next week disabled on current week, navigation toggles Next week", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /previous week/i }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: /next week/i }),
    ).toBeDisabled();

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
  test.use({ storageState: PRESCRIPTIONS_PATIENT_AUTH_FILE });

  test.beforeEach(async () => {
    await clearPrescriptions();
  });

  test("dose label shows count × drug dosage and links to the prescription detail page", async ({
    page,
  }) => {
    const res = await page.request.post("/api/v1/prescriptions", {
      data: {
        drugName: "Metformin",
        dosage: "500 mg",
        doseForm: "tablet",
        schedule: {
          days: { monday: [{ time: "08:00", quantity: 2 }] },
          timezoneMode: "local",
        },
        startDate: "2024-01-01",
      },
    });
    const { id } = (await res.json()) as { id: string };
    await page.goto("/");

    await expect(page.getByText("2 tablet × Metformin 500 mg")).toBeVisible();

    const drugLink = page.getByRole("link", { name: /metformin 500 mg/i });
    await expect(drugLink).toBeVisible();
    await drugLink.click();
    await expect(page).toHaveURL(`/prescriptions/${id}`);
  });

  test("two prescriptions at the same time are grouped under one time header", async ({
    page,
  }) => {
    await page.request.post("/api/v1/prescriptions", {
      data: {
        drugName: "Metformin",
        dosage: "500 mg",
        doseForm: "tablet",
        schedule: {
          days: { monday: [{ time: "08:00", quantity: 1 }] },
          timezoneMode: "local",
        },
        startDate: "2024-01-01",
      },
    });
    await page.request.post("/api/v1/prescriptions", {
      data: {
        drugName: "Lisinopril",
        dosage: "10 mg",
        doseForm: "tablet",
        schedule: {
          days: { monday: [{ time: "08:00", quantity: 1 }] },
          timezoneMode: "local",
        },
        startDate: "2024-01-01",
      },
    });
    await page.goto("/");

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
    await page.request.post("/api/v1/prescriptions", {
      data: {
        drugName: "Metformin",
        dosage: "500 mg",
        doseForm: "tablet",
        schedule: {
          days: { monday: [{ time: "08:00", quantity: 1 }] },
          timezoneMode: "local",
        },
        startDate: "2024-01-01",
      },
    });
    await page.request.post("/api/v1/prescriptions", {
      data: {
        drugName: "Lisinopril",
        dosage: "10 mg",
        doseForm: "tablet",
        schedule: {
          days: { monday: [{ time: "20:00", quantity: 1 }] },
          timezoneMode: "local",
        },
        startDate: "2024-01-01",
      },
    });
    await page.goto("/");

    const mondaySection = page.locator("section").filter({
      has: page.getByRole("heading", { level: 2, name: "Monday" }),
    });
    await expect(mondaySection.getByText("8:00 AM")).toBeVisible();
    await expect(mondaySection.getByText("8:00 PM")).toBeVisible();
  });
});

test.describe("scheduled-doses timezone conversion", () => {
  test.use({ storageState: PRESCRIPTIONS_PATIENT_AUTH_FILE });

  test.beforeEach(async () => {
    await clearPrescriptions();
  });

  test("scheduledAt is real UTC based on the patient's stored timezone", async ({
    page,
  }) => {
    await page.request.post("/api/v1/prescriptions", {
      data: {
        drugName: "Test Drug",
        dosage: "10 mg",
        doseForm: "tablet",
        schedule: { days: { monday: [{ time: "14:00", quantity: 1 }] } },
        startDate: "2024-01-01",
      },
    });

    const weekQuery = "start=2024-01-08&end=2024-01-14";

    await page.request.patch("/api/v1/account", {
      data: { timezone: "America/Los_Angeles" },
    });
    const laRes = await page.request.get(
      `/api/v1/scheduled-doses?${weekQuery}`,
    );
    const laDoses = (await laRes.json()) as Array<{ scheduledAt: string }>;
    const laMonday = laDoses.find((d) =>
      d.scheduledAt.startsWith("2024-01-08"),
    );
    expect(laMonday?.scheduledAt).toBe("2024-01-08T22:00:00.000Z");

    await page.request.patch("/api/v1/account", {
      data: { timezone: "America/New_York" },
    });
    const nyRes = await page.request.get(
      `/api/v1/scheduled-doses?${weekQuery}`,
    );
    const nyDoses = (await nyRes.json()) as Array<{ scheduledAt: string }>;
    const nyMonday = nyDoses.find((d) =>
      d.scheduledAt.startsWith("2024-01-08"),
    );
    expect(nyMonday?.scheduledAt).toBe("2024-01-08T19:00:00.000Z");
  });
});
