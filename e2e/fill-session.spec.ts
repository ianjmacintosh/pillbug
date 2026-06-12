import {
  expect,
  test,
  type Browser,
  type Download,
  type Page,
} from "@playwright/test";
import { readFileSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";
import { hashEmail } from "../worker/email-crypto";
import {
  PRESCRIPTIONS_PATIENT_EMAIL,
  PRESCRIPTIONS_PATIENT_AUTH_FILE,
} from "./test-accounts";
import { getDB, disposeDB } from "./db";
import { weekBoundaries } from "../shared/week-boundaries";

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

test.describe("Fill Session page", () => {
  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    await resetState(browser, METFORMIN, LISINOPRIL);
    const context = await browser.newContext({
      storageState: PRESCRIPTIONS_PATIENT_AUTH_FILE,
    });
    sharedPage = await context.newPage();
    await sharedPage.goto("/fill-session");
  });

  test.afterAll(async () => {
    await sharedPage.context().close();
  });

  test('has a "Print Worksheet" button', async () => {
    await expect(
      sharedPage.getByRole("button", { name: /print worksheet/i }),
    ).toBeVisible();
  });

  test.describe("prints as a worksheet", () => {
    test.beforeAll(async () => {
      await sharedPage.emulateMedia({ media: "print" });
    });

    test.afterAll(async () => {
      await sharedPage.emulateMedia({ media: null });
    });

    test("page heading is 'Fill Session' with the date range in a secondary heading", async () => {
      await expect(sharedPage.getByRole("heading", { level: 1 })).toContainText(
        /Fill Session/,
      );
      await expect(sharedPage.getByRole("heading", { level: 2 })).toContainText(
        /\w{3} \d+/,
      );
    });

    test("it shows the total pill count for each prescription", async () => {
      await expect(sharedPage.getByText(/7 pills/)).toBeVisible();
      await expect(sharedPage.getByText(/14 pills/)).toBeVisible();
    });

    test("it shows compartment bubbles for all prescriptions", async () => {
      await expect(
        sharedPage
          .getByRole("region", { name: /metformin/i })
          .getByText("1")
          .first(),
      ).toBeVisible();
      await expect(
        sharedPage
          .getByRole("region", { name: /lisinopril/i })
          .getByText("2")
          .first(),
      ).toBeVisible();
    });

    // Playwright cannot observe actual page-break layout, and JSDOM does not
    // process external CSS files so computed styles cannot be checked in unit
    // tests. Checking the computed style here is the closest available proxy
    // for "medicine boxes do not split across printed pages".
    test("medicine boxes have break-inside: avoid", async () => {
      const cards = sharedPage.getByRole("region");
      const count = await cards.count();
      for (let i = 0; i < count; i++) {
        const breakInside = await cards
          .nth(i)
          .evaluate((el) => getComputedStyle(el).breakInside);
        expect(breakInside).toBe("avoid");
      }
    });
  });

  test.describe("PDF download", () => {
    let expectedFilename: string;
    let monday: string;
    let sunday: string;
    let download: Download;
    let pdfText: string;

    test.beforeAll(async () => {
      // Mirror the worker's filename computation: today in the patient's
      // timezone (set to America/Chicago by resetState), then week boundaries.
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Chicago",
      }).format(new Date());
      ({ monday, sunday } = weekBoundaries(today));
      expectedFilename = `Pillbug_Worksheet-${monday.replace(/-/g, "_")}-${sunday.replace(/-/g, "_")}.pdf`;

      [download] = await Promise.all([
        sharedPage.waitForEvent("download"),
        sharedPage.getByRole("button", { name: /save as pdf/i }).click(),
      ]);

      const path = await download.path();
      const buffer = readFileSync(path!);
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      ({ text: pdfText } = await extractText(pdf, { mergePages: true }));
    });

    test("'Save as PDF' button triggers a file download", async () => {
      expect(download).toBeDefined();
    });

    test("downloaded file has the correct filename for the current week", async () => {
      expect(download.suggestedFilename()).toBe(expectedFilename);
    });

    test("downloaded PDF contains the worksheet heading and date range", async () => {
      expect(pdfText).toContain("Fill Session");
      expect(pdfText).toContain(monday.replace(/-/g, "/"));
      expect(pdfText).toContain(sunday.replace(/-/g, "/"));
    });

    test("downloaded PDF contains the prescription names", async () => {
      expect(pdfText).toContain("Metformin");
      expect(pdfText).toContain("Lisinopril");
    });
  });
});

test.describe("Fill Session", () => {
  test.describe("empty state", () => {
    test.beforeAll(async ({ browser }) => {
      await resetState(browser);
    });

    test("shows heading and no active prescriptions message", async ({
      page,
    }) => {
      await page.goto("/fill-session");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByText(/no active prescriptions/i)).toBeVisible();
    });
  });

  test.describe("loaded state", () => {
    let sharedPage: Page;

    test.beforeAll(async ({ browser }) => {
      await resetState(browser, METFORMIN, LISINOPRIL);
      const context = await browser.newContext({
        storageState: PRESCRIPTIONS_PATIENT_AUTH_FILE,
      });
      sharedPage = await context.newPage();
      await sharedPage.goto("/fill-session");
    });

    test.afterAll(async () => {
      await sharedPage.context().close();
    });

    test("shows drug names, dosage, and weekly pill count", async () => {
      await expect(sharedPage.getByText("Metformin")).toBeVisible();
      await expect(sharedPage.getByText("Lisinopril")).toBeVisible();
      await expect(sharedPage.getByText("500 mg")).toBeVisible();
      await expect(sharedPage.getByText(/7 pills/)).toBeVisible();
    });

    test("accordion initial state: first card open, all day headers visible", async () => {
      await expect(
        sharedPage.getByRole("button", { name: /metformin/i }),
      ).toHaveAttribute("aria-expanded", "true");
      await expect(
        sharedPage.getByRole("button", { name: /lisinopril/i }),
      ).toHaveAttribute("aria-expanded", "false");
      // Day headers render in every card, so scope to the open card (Metformin)
      // to avoid a strict-mode match against the closed card's headers.
      const openCard = sharedPage.getByRole("region", { name: /metformin/i });
      for (const day of ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]) {
        await expect(openCard.getByText(day)).toBeVisible();
      }
    });

    test("organizer selector defaults to Simple 7-day", async () => {
      await expect(
        sharedPage.getByRole("combobox", { name: /pill organizer/i }),
      ).toHaveValue("1");
    });

    test("switching organizer shows correct slot labels", async () => {
      // Slot labels render in every card, so scope to the open card (Metformin)
      // to avoid a strict-mode match against the closed card's labels.
      const openCard = sharedPage.getByRole("region", { name: /metformin/i });
      await sharedPage
        .getByRole("combobox", { name: /pill organizer/i })
        .selectOption("2");
      await expect(openCard.getByText("AM", { exact: true })).toBeVisible();
      await expect(openCard.getByText("PM", { exact: true })).toBeVisible();

      await sharedPage
        .getByRole("combobox", { name: /pill organizer/i })
        .selectOption("3");
      await expect(openCard.getByText("Morn", { exact: true })).toBeVisible();
      await expect(openCard.getByText("Noon", { exact: true })).toBeVisible();
      await expect(openCard.getByText("Night", { exact: true })).toBeVisible();
    });

    test("clicking a different card opens it and closes the current", async () => {
      await sharedPage.getByRole("button", { name: /lisinopril/i }).click();
      await expect(
        sharedPage.getByRole("button", { name: /lisinopril/i }),
      ).toHaveAttribute("aria-expanded", "true");
      await expect(
        sharedPage.getByRole("button", { name: /metformin/i }),
      ).toHaveAttribute("aria-expanded", "false");
    });

    test("clicking an open card closes it, both cards remain in the list", async () => {
      await sharedPage.getByRole("button", { name: /lisinopril/i }).click();
      await expect(
        sharedPage.getByRole("button", { name: /lisinopril/i }),
      ).toHaveAttribute("aria-expanded", "false");
      await expect(sharedPage.getByText("Metformin")).toBeVisible();
      await expect(sharedPage.getByText("Lisinopril")).toBeVisible();
    });
  });
});
