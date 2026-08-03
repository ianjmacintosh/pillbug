import { expect, test, type Browser, type Page } from "@playwright/test";

import { hashEmail } from "../worker/email-crypto";
import {
  PRESCRIPTIONS_PATIENT_EMAIL,
  PRESCRIPTIONS_PATIENT_AUTH_FILE,
} from "./test-accounts";
import { getDB, disposeDB } from "./db";

async function goToCheckSupplyStep(page: Page): Promise<void> {
  await page.goto("/fill-session");
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: /i'm ready/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();
}

async function goToFillStep(page: Page): Promise<void> {
  await goToCheckSupplyStep(page);
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

  test("'Save as PDF' is temporarily hidden", async () => {
    await expect(
      sharedPage.getByRole("button", { name: /save as pdf/i }),
    ).toHaveCount(0);
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

  test("completes all six steps in order: disclaimer, setup, pill organizer, check your supply, fill, double-check", async ({
    page,
  }) => {
    await page.goto("/fill-session");
    await expect(page).toHaveURL(/\/fill-session\/step1$/);

    await expect(page.getByText(/step 1 of 6/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /before you begin/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page).toHaveURL(/\/fill-session\/step2$/);
    await expect(page.getByText(/step 2 of 6/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /get set up/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /i'm ready/i }).click();

    await expect(page).toHaveURL(/\/fill-session\/step3$/);
    await expect(page.getByText(/step 3 of 6/i)).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: /pill organizer/i }),
    ).toHaveValue("1");
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page).toHaveURL(/\/fill-session\/step4$/);
    await expect(page.getByText(/step 4 of 6/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /check your supply/i }),
    ).toBeVisible();
    await expect(page.getByText("Metformin")).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: /metformin/i }),
    ).toBeChecked();
    // Check-your-supply's intro references the real session dates set on
    // Pill Organizer, not a placeholder — same date the Fill step will use.
    const dateRangeText = await page
      .getByText(/\w{3} \d+ . \w{3} \d+/)
      .textContent();
    const [startFrag, endFrag] = dateRangeText!.match(/\w{3} \d+/g)!;
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page).toHaveURL(/\/fill-session\/step5$/);
    await expect(page.getByText(/step 5 of 6/i)).toBeVisible();
    await expect(page.getByText("Metformin")).toBeVisible();
    // The Fill step's date carries forward from Pill Organizer's date field.
    // (CheckSupply spaces its en dash, the Fill heading doesn't, so compare
    // the two date fragments rather than the exact combined string.)
    const fillDateHeading = page.getByRole("heading", { level: 2 });
    await expect(fillDateHeading).toContainText(startFrag);
    await expect(fillDateHeading).toContainText(endFrag);
    await page.getByRole("button", { name: /done filling/i }).click();

    await expect(page).toHaveURL(/\/fill-session\/step6$/);
    await expect(page.getByText(/step 6 of 6/i)).toBeVisible();
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

  test("changing the date on Pill Organizer carries through to Check-your-supply's copy and the Fill step", async ({
    page,
  }) => {
    await page.goto("/fill-session");
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByRole("button", { name: /i'm ready/i }).click();

    await page.getByLabel(/start date/i).fill("2026-08-02");
    await page.getByRole("button", { name: /continue/i }).click(); // step3 -> step4

    await expect(page.getByText("Metformin")).toBeVisible();
    await expect(page.getByText(/Aug 2.*Aug 8/)).toBeVisible();

    await page.getByRole("button", { name: /continue/i }).click(); // step4 -> step5
    await expect(page.getByText(/Aug 2.*Aug 8/)).toBeVisible();
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
    await expect(page.getByText("Metformin")).toBeVisible();
    await page.getByRole("button", { name: /continue/i }).click();

    const openCard = page.getByRole("region", { name: /metformin/i });
    await expect(openCard.getByText("AM", { exact: true })).toBeVisible();
    await expect(openCard.getByText("PM", { exact: true })).toBeVisible();
  });

  test("Back from double-check returns to the fill step", async ({ page }) => {
    await goToFillStep(page);
    await expect(page.getByText("Metformin")).toBeVisible();
    await page.getByRole("button", { name: /done filling/i }).click();

    await expect(page.getByText(/step 6 of 6/i)).toBeVisible();
    await page.getByRole("button", { name: /back/i }).click();

    await expect(page).toHaveURL(/\/fill-session\/step5$/);
    await expect(page.getByText(/step 5 of 6/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /done filling/i }),
    ).toBeVisible();
  });

  test("navigating directly to /fill-session/step6 with no data redirects to step 5", async ({
    page,
  }) => {
    await page.goto("/fill-session/step6");

    await expect(page).toHaveURL(/\/fill-session\/step5$/);
    await expect(page.getByText(/step 5 of 6/i)).toBeVisible();
  });

  test("Back from double-check preserves the selected medicine index", async ({
    page,
    browser,
  }) => {
    await resetState(browser, METFORMIN, LISINOPRIL);
    await goToFillStep(page);
    await expect(page.getByText("Metformin")).toBeVisible();

    await page.getByRole("button", { name: /next medicine/i }).click();
    await expect(page.getByText("Medicine 2 of 2")).toBeVisible();

    await page.getByRole("button", { name: /done filling/i }).click();
    await expect(page.getByText(/step 6 of 6/i)).toBeVisible();
    await page.getByRole("button", { name: /back/i }).click();

    await expect(page).toHaveURL(/\/fill-session\/step5$/);
    await expect(page.getByText("Medicine 2 of 2")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /done filling/i }),
    ).toBeVisible();
  });
});

test.describe("Fill Session wizard: insufficient-pill exclusion", () => {
  test.beforeEach(async ({ browser }) => {
    await resetState(browser, METFORMIN, LISINOPRIL);
  });

  test("unchecking a medicine on Check your supply excludes it from Fill entirely", async ({
    page,
  }) => {
    await goToCheckSupplyStep(page);
    await expect(page.getByText("Metformin")).toBeVisible();
    await expect(page.getByText("Lisinopril")).toBeVisible();

    await page.getByRole("checkbox", { name: /metformin/i }).uncheck();
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page).toHaveURL(/\/fill-session\/step5$/);
    await expect(page.getByText("Lisinopril")).toBeVisible();
    await expect(page.getByText("Metformin")).not.toBeVisible();
    await expect(page.getByText(/medicine 1 of 1/i)).toBeVisible();
  });

  test("an excluded medicine never appears while navigating the Fill cards", async ({
    page,
  }) => {
    await goToCheckSupplyStep(page);
    await page.getByRole("checkbox", { name: /lisinopril/i }).uncheck();
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page.getByText("Metformin")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /next medicine/i }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: /done filling/i }),
    ).toBeVisible();
    await expect(page.getByText("Lisinopril")).not.toBeVisible();
  });

  test("Double-check shows a read-only summary of the skipped medicine", async ({
    page,
  }) => {
    await goToCheckSupplyStep(page);
    await page.getByRole("checkbox", { name: /metformin/i }).uncheck();
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page.getByText("Lisinopril")).toBeVisible();
    await page.getByRole("button", { name: /done filling/i }).click();

    await expect(page.getByText(/skipped this session/i)).toBeVisible();
    await expect(page.getByText("Metformin 500 mg")).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: /metformin/i }),
    ).toHaveCount(0);
  });

  test("Print worksheet excludes the skipped medicine", async ({ page }) => {
    await goToCheckSupplyStep(page);
    await page.getByRole("checkbox", { name: /metformin/i }).uncheck();
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText("Lisinopril")).toBeVisible();

    await page.emulateMedia({ media: "print" });
    try {
      await expect(page.getByText("Lisinopril")).toBeVisible();
      await expect(page.getByText("Metformin")).toHaveCount(0);
    } finally {
      await page.emulateMedia({ media: null });
    }
  });

  test("un-checking then re-checking on Check your supply restores the medicine to Fill", async ({
    page,
  }) => {
    await goToCheckSupplyStep(page);
    const metforminCheckbox = page.getByRole("checkbox", {
      name: /metformin/i,
    });
    await metforminCheckbox.uncheck();
    await metforminCheckbox.check();
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page.getByText("Metformin")).toBeVisible();
    await expect(page.getByText(/medicine 1 of 2/i)).toBeVisible();
  });

  test("browser Back from Fill to Check your supply preserves the unchecked state and allows reversal", async ({
    page,
  }) => {
    await goToCheckSupplyStep(page);
    await page.getByRole("checkbox", { name: /metformin/i }).uncheck();
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText("Lisinopril")).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/fill-session\/step4$/);
    await expect(
      page.getByRole("checkbox", { name: /metformin/i }),
    ).not.toBeChecked();

    await page.getByRole("checkbox", { name: /metformin/i }).check();
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page.getByText("Metformin")).toBeVisible();
    await expect(page.getByText(/medicine 1 of 2/i)).toBeVisible();
  });
});
