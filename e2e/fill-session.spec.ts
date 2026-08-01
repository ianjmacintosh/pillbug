import { expect, test, type Browser, type Page } from "@playwright/test";

import { hashEmail } from "../worker/email-crypto";
import {
  PRESCRIPTIONS_PATIENT_EMAIL,
  PRESCRIPTIONS_PATIENT_AUTH_FILE,
} from "./test-accounts";
import { getDB, disposeDB } from "./db";

async function goToFillStep(page: Page): Promise<void> {
  await page.goto("/fill-session");
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: /i'm ready/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();
}

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
    await goToFillStep(sharedPage);
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
    // Save PDF is temporarily disabled while insufficient-pill exclusion
    // isn't wired into the server-side PDF route. See issue #315 for
    // restoring it (the worker route itself is still covered directly by
    // worker/fill-session-pdf.test.ts).
    test("'Save as PDF' button is disabled", async () => {
      await expect(
        sharedPage.getByRole("button", { name: /save as pdf/i }),
      ).toBeDisabled();
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
      await goToFillStep(page);
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
      await goToFillStep(sharedPage);
    });

    test.afterAll(async () => {
      await sharedPage.context().close();
    });

    test("shows drug name, dosage, and weekly pill count for the current medicine", async () => {
      await expect(sharedPage.getByText("Metformin")).toBeVisible();
      await expect(sharedPage.getByText("500 mg")).toBeVisible();
      await expect(sharedPage.getByText(/7 pills/)).toBeVisible();
    });

    test("first medicine is shown by default; the other is not yet visible", async () => {
      const currentCard = sharedPage.getByRole("region", {
        name: /metformin/i,
      });
      for (const day of ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]) {
        await expect(currentCard.getByText(day)).toBeVisible();
      }
      await expect(sharedPage.getByText("Lisinopril")).not.toBeVisible();
      await expect(sharedPage.getByText(/medicine 1 of 2/i)).toBeVisible();
    });

    test("Done filling is not shown until the last medicine is reached", async () => {
      await expect(
        sharedPage.getByRole("button", { name: /done filling/i }),
      ).not.toBeVisible();
    });

    test("Next medicine advances to the next medicine", async () => {
      await sharedPage.getByRole("button", { name: /next medicine/i }).click();
      await expect(
        sharedPage.getByRole("region", { name: /lisinopril/i }),
      ).toBeVisible();
      await expect(sharedPage.getByText("Metformin")).not.toBeVisible();
      await expect(sharedPage.getByText(/medicine 2 of 2/i)).toBeVisible();
    });

    test("Done filling appears once the last medicine is reached", async () => {
      await expect(
        sharedPage.getByRole("button", { name: /done filling/i }),
      ).toBeVisible();
      await expect(
        sharedPage.getByRole("button", { name: /next medicine/i }),
      ).not.toBeVisible();
    });

    test("Previous medicine returns to the first medicine, both remain reachable", async () => {
      await sharedPage
        .getByRole("button", { name: /previous medicine/i })
        .click();
      await expect(sharedPage.getByText("Metformin")).toBeVisible();
      await expect(sharedPage.getByText("Lisinopril")).not.toBeVisible();
      await expect(
        sharedPage.getByRole("button", { name: /done filling/i }),
      ).not.toBeVisible();
    });
  });
});

test.describe("Fill Session wizard", () => {
  test.beforeEach(async ({ browser }) => {
    await resetState(browser, METFORMIN);
  });

  test("completes all five steps in order: disclaimer, setup, pill organizer, fill, double-check", async ({
    page,
  }) => {
    await page.goto("/fill-session");
    await expect(page).toHaveURL(/\/fill-session\/step1$/);

    await expect(page.getByText(/step 1 of 5/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /before you begin/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page).toHaveURL(/\/fill-session\/step2$/);
    await expect(page.getByText(/step 2 of 5/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /get set up/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /i'm ready/i }).click();

    await expect(page).toHaveURL(/\/fill-session\/step3$/);
    await expect(page.getByText(/step 3 of 5/i)).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: /pill organizer/i }),
    ).toHaveValue("1");
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page).toHaveURL(/\/fill-session\/step4$/);
    await expect(page.getByText(/step 4 of 5/i)).toBeVisible();
    await expect(page.getByText("Metformin")).toBeVisible();
    await page.getByRole("button", { name: /done filling/i }).click();

    await expect(page).toHaveURL(/\/fill-session\/step5$/);
    await expect(page.getByText(/step 5 of 5/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /double-check/i }),
    ).toBeVisible();
    // New compartment-based UI: check for Daily compartment label
    await expect(page.getByText("Daily")).toBeVisible();
    // Click a compartment cell to verify medicine details are shown
    const compartmentButtons = await page
      .getByRole("button")
      .filter({ hasText: /^\d+$/ })
      .all();
    if (compartmentButtons.length > 0) {
      await compartmentButtons[0].click();
      // Verify detail panel shows medicine name
      await expect(page.getByText("Metformin")).toBeVisible();
    }
    await page.getByRole("button", { name: /^done$/i }).click();

    await expect(page).toHaveURL(/\/prescriptions$/);
  });

  test("choosing a 2-compartment organizer shows AM/PM slots on the fill step", async ({
    page,
  }) => {
    await page.goto("/fill-session");
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByRole("button", { name: /i'm ready/i }).click();

    await page
      .getByRole("combobox", { name: /pill organizer/i })
      .selectOption("2");
    await page.getByRole("button", { name: /continue/i }).click();

    const openCard = page.getByRole("region", { name: /metformin/i });
    await expect(openCard.getByText("AM", { exact: true })).toBeVisible();
    await expect(openCard.getByText("PM", { exact: true })).toBeVisible();
  });

  test("Back from double-check returns to the fill step", async ({ page }) => {
    await goToFillStep(page);
    await expect(page.getByText("Metformin")).toBeVisible();
    await page.getByRole("button", { name: /done filling/i }).click();

    await expect(page.getByText(/step 5 of 5/i)).toBeVisible();
    await page.getByRole("button", { name: /back/i }).click();

    await expect(page).toHaveURL(/\/fill-session\/step4$/);
    await expect(page.getByText(/step 4 of 5/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /done filling/i }),
    ).toBeVisible();
  });

  test("navigating directly to /fill-session/step5 with no data redirects to step 4", async ({
    page,
  }) => {
    await page.goto("/fill-session/step5");

    await expect(page).toHaveURL(/\/fill-session\/step4$/);
    await expect(page.getByText(/step 4 of 5/i)).toBeVisible();
  });

  test("Back from double-check preserves the selected week and medicine index", async ({
    page,
    browser,
  }) => {
    await resetState(browser, METFORMIN, LISINOPRIL);
    await goToFillStep(page);
    await expect(page.getByText("Metformin")).toBeVisible();

    await page.getByRole("button", { name: /next week/i }).click();
    const dateInput = page.getByLabel(/start date/i);
    const selectedWeek = await dateInput.inputValue();

    await page.getByRole("button", { name: /next medicine/i }).click();
    await expect(page.getByText("Medicine 2 of 2")).toBeVisible();

    await page.getByRole("button", { name: /done filling/i }).click();
    await expect(page.getByText(/step 5 of 5/i)).toBeVisible();
    await page.getByRole("button", { name: /back/i }).click();

    await expect(page).toHaveURL(/\/fill-session\/step4$/);
    await expect(dateInput).toHaveValue(selectedWeek);
    await expect(page.getByText("Medicine 2 of 2")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /done filling/i }),
    ).toBeVisible();
  });
});

test.describe("Fill Session: insufficient pills", () => {
  test.beforeEach(async ({ browser }) => {
    await resetState(browser, METFORMIN, LISINOPRIL);
  });

  test("marking a medicine insufficient excludes it entirely but leaves the rest of the session workable", async ({
    page,
  }) => {
    await goToFillStep(page);
    await expect(page.getByText("Metformin")).toBeVisible();

    const metforminCard = page.getByRole("region", { name: /metformin/i });
    await metforminCard
      .getByRole("checkbox", { name: /don't have enough pills for this/i })
      .click();

    // Metformin is excluded entirely — it drops out of the card-by-card
    // review, and Lisinopril becomes the only (current) card.
    await expect(
      page.getByRole("region", { name: /metformin/i }),
    ).not.toBeVisible();
    const lisinoprilCard = page.getByRole("region", { name: /lisinopril/i });
    await expect(lisinoprilCard).toHaveAttribute("aria-current", "true");
    await expect(page.getByText(/medicine 1 of 1/i)).toBeVisible();

    // It's still visible (with an undo control) in a "skipped" list at
    // step 4, so the caregiver can reverse the flag without restarting.
    await expect(page.getByText(/skipped this session/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /found enough pills/i }),
    ).toBeVisible();

    // The session can still be completed with the remaining medicine.
    await page.getByRole("button", { name: /done filling/i }).click();
    await expect(page.getByText(/step 5 of 5/i)).toBeVisible();

    // Double-check shows a read-only summary of what was skipped — no
    // Yes/No or undo controls on this screen.
    await expect(
      page.getByText(/some medicines were skipped this session/i),
    ).toBeVisible();
    await expect(page.getByText(/metformin/i)).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /found enough pills/i }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: /^done$/i }).click();
    await expect(page).toHaveURL(/\/prescriptions$|\/$/);
  });

  test("undoing via Back-to-step-4 restores the excluded medicine", async ({
    page,
  }) => {
    await goToFillStep(page);
    await expect(page.getByText("Metformin")).toBeVisible();

    await page
      .getByRole("region", { name: /metformin/i })
      .getByRole("checkbox", { name: /don't have enough pills for this/i })
      .click();
    await page.getByRole("button", { name: /done filling/i }).click();
    await expect(page.getByText(/step 5 of 5/i)).toBeVisible();

    await page.getByRole("button", { name: /back/i }).click();
    await expect(page).toHaveURL(/\/fill-session\/step4$/);
    await page.getByRole("button", { name: /found enough pills/i }).click();

    await expect(
      page.getByRole("region", { name: /metformin/i }),
    ).toBeVisible();
    await expect(page.getByText(/skipped this session/i)).not.toBeVisible();
  });

  test("Print still includes the remaining medicine while Save PDF stays disabled", async ({
    page,
  }) => {
    await goToFillStep(page);
    await expect(page.getByText("Metformin")).toBeVisible();

    await page
      .getByRole("region", { name: /metformin/i })
      .getByRole("checkbox", { name: /don't have enough pills for this/i })
      .click();

    await expect(
      page.getByRole("button", { name: /save as pdf/i }),
    ).toBeDisabled();

    await page.emulateMedia({ media: "print" });
    await expect(
      page.getByRole("region", { name: /lisinopril/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: /metformin/i }),
    ).not.toBeVisible();
  });
});
