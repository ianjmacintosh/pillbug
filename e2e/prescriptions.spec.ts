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

// CDP CPU throttling factor (1 = no throttle, N = Nx slowdown of JS
// execution) applied to the drug-name low-end-hardware tests. 6
// approximates a low-end mobile device — beyond Lighthouse's own 4x
// mobile-throttling preset.
const LOW_END_CPU_THROTTLE_RATE = 6;

// Ceiling for how long the correct fuzzy-match suggestion is allowed to
// take to appear after typing stops, under LOW_END_CPU_THROTTLE_RATE.
// Measured directly: 420-467ms across repeated runs at this throttle rate.
// 3s leaves ~6x headroom for CI-machine variance while still catching a
// genuine multi-second regression — unlike a much larger ceiling, which
// would let the feature get many times slower before the test ever failed.
const SUGGESTION_VISIBLE_TIMEOUT_MS = 3_000;

// Ceiling on how many times the *rendered* suggestion list is allowed to
// change to a different set of options while typing a single 11-character
// typo ("amoxicillan") under LOW_END_CPU_THROTTLE_RATE. This is what the
// debounce is actually protecting the user from: without it, each keystroke
// would trigger its own search and re-render, and the user would watch the
// dropdown's contents flash through a different, mostly-irrelevant set of
// names on every character — worse than just "slow," actively distracting,
// and worse still on the low-end hardware this test targets, where each of
// those extra re-renders competes for an already-scarce main thread.
// A working debounce settles content at most a couple of times here: once
// for "amoxicill" (a valid prefix), once more for the final "amoxicillan"
// fuzzy result. The bound allows slack above that (rather than an exact
// count) because throttled keystroke timing can occasionally exceed the
// app's debounce window (DEFAULT_SUGGESTIONS_DEBOUNCE_MS in
// useDrugNameSuggestions.ts) and force an extra settle.
const MAX_VISIBLE_SUGGESTION_CHANGES_FOR_ONE_TYPO = 5;

test.use({ storageState: PRESCRIPTIONS_PATIENT_AUTH_FILE });

test.beforeEach(async () => {
  await clearPrescriptions();
  await disposeDB();
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
  test("list panel shows prescriptions at /prescriptions — no auto-redirect", async ({
    page,
  }) => {
    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });

    await page.goto("/prescriptions");
    await expect(page).toHaveURL("/prescriptions");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /metformin/i })).toBeVisible();
  });

  test.describe("mobile back navigation", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("Back button at /prescriptions/:id returns to /prescriptions", async ({
      page,
    }) => {
      const res = await page.request.post("/api/v1/prescriptions", {
        data: BASE_PRESCRIPTION,
      });
      const { id } = (await res.json()) as { id: string };

      await page.goto(`/prescriptions/${id}`);
      await page.getByRole("button", { name: /back/i }).click();
      await expect(page).toHaveURL("/prescriptions");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
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

  test("Add Prescription button is hidden on /prescriptions/new and edit routes, visible elsewhere", async ({
    page,
  }) => {
    const addBtn = page.getByRole("link", { name: /add prescription/i });

    await page.goto("/prescriptions/new");
    await expect(addBtn).toHaveAttribute("tabindex", "-1");

    const res = await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    const { id } = (await res.json()) as { id: string };

    await page.goto(`/prescriptions/${id}/edit`);
    await expect(addBtn).toHaveAttribute("tabindex", "-1");

    await page.goto("/prescriptions");
    await expect(addBtn).not.toHaveAttribute("tabindex", "-1");
  });
});

test.describe("Prescription list", () => {
  test("empty state: Create Prescription form appears inline at /prescriptions", async ({
    page,
  }) => {
    await page.goto("/prescriptions");

    await expect(page.getByRole("list")).toBeEmpty();
    await expect(
      page.getByRole("heading", { name: /add prescription/i, level: 2 }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /back/i })).not.toBeVisible();
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
    await expect(page.getByRole("link", { name: /metformin/i })).toBeVisible();
  });

  test("each list item shows a schedule summary and chevron", async ({
    page,
  }) => {
    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    await page.goto("/prescriptions");

    const listItem = page.getByRole("link", { name: /metformin/i });
    await expect(listItem).toBeVisible();
    // Schedule summary: Monday at 8 AM
    await expect(listItem.getByText(/mon.*8:00 am/i)).toBeVisible();
    // Chevron icon present (lucide renders an svg)
    await expect(listItem.locator("svg")).toBeVisible();
  });
});

test.describe("Prescription create", () => {
  test("empty-state inline form: saving navigates to the new prescription detail", async ({
    page,
  }) => {
    await page.goto("/prescriptions");
    await expect(
      page.getByRole("heading", { name: /add prescription/i, level: 2 }),
    ).toBeVisible();

    await fillCreateForm(page);

    await expect(page).toHaveURL(/\/prescriptions\/[^/]+$/);
    await expect(
      page.getByRole("heading", { name: "Aspirin", level: 2 }),
    ).toBeVisible();
  });

  test("loading: spinner is visible while prescriptions are being fetched", async ({
    page,
  }) => {
    let unblock!: () => void;
    await page.route("/api/v1/prescriptions", async (route) => {
      await new Promise<void>((resolve) => {
        unblock = resolve;
      });
      await route.continue();
    });

    await page.goto("/prescriptions");
    await expect(page.getByRole("status")).toBeVisible();

    unblock();
    await expect(page.getByRole("status")).not.toBeVisible();
  });

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
    await expect(page.getByRole("link", { name: /aspirin/i })).toBeVisible();
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

  test("'Every day' checkbox selects and deselects all 7 day pills", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");

    const everyDay = page.getByRole("checkbox", { name: /every day/i });
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    await expect(everyDay).not.toBeChecked();
    await everyDay.click();
    await expect(everyDay).toBeChecked();
    for (const day of dayNames) {
      await expect(page.getByRole("checkbox", { name: day })).toBeChecked();
    }

    await everyDay.click();
    await expect(everyDay).not.toBeChecked();
    for (const day of dayNames) {
      await expect(page.getByRole("checkbox", { name: day })).not.toBeChecked();
    }
  });

  test("drug name field suggests a matching name from the bundled drug list, in display case", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");

    const drugNameInput = page.getByLabel(/drug name/i);
    await drugNameInput.pressSequentially("enala");

    await expect(
      page.getByRole("option", { name: "Enalapril", exact: true }),
    ).toBeVisible();
  });

  test("drug name field tolerates a typo by falling back to fuzzy search", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");

    const drugNameInput = page.getByLabel(/drug name/i);
    await drugNameInput.pressSequentially("amoxicillan");

    await expect(
      page.getByRole("option", { name: "Amoxicillin", exact: true }),
    ).toBeVisible();
  });

  test("drug name field still resolves a typo on heavily CPU-throttled (low-end) hardware", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");

    // Applied after navigation, not before: we're testing the fuzzy search
    // itself under load, not slowing down the page's initial bootstrap too.
    const client = await page.context().newCDPSession(page);
    await client.send("Emulation.setCPUThrottlingRate", {
      rate: LOW_END_CPU_THROTTLE_RATE,
    });

    const drugNameInput = page.getByLabel(/drug name/i);
    await drugNameInput.pressSequentially("amoxicillan");

    // The fuzzy search runs in a Worker specifically so it isn't blocked by
    // main-thread contention (see useDrugNameSearchWorker.ts), but a
    // throttled CPU still slows down React's rendering of the result once
    // it arrives.
    await expect(
      page.getByRole("option", { name: "Amoxicillin", exact: true }),
    ).toBeVisible({ timeout: SUGGESTION_VISIBLE_TIMEOUT_MS });
  });

  test("suggestion list does not visibly thrash through many different option sets while typing a typo under CPU throttling", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");

    // Records every time the rendered option list settles on a genuinely
    // different set of names, ignoring re-renders that don't change what's
    // shown (React re-rendering the same options doesn't count as a
    // "change" here — only the user-visible content does).
    await page.evaluate(() => {
      window.__visibleSuggestionChanges = 0;
      let lastSignature = "";
      new MutationObserver(() => {
        const listbox = document.querySelector('[role="listbox"]');
        if (!listbox) return;
        const signature = Array.from(
          listbox.querySelectorAll('[role="option"]'),
        )
          .map((el) => el.textContent?.trim())
          .join("|");
        if (signature && signature !== lastSignature) {
          window.__visibleSuggestionChanges!++;
          lastSignature = signature;
        }
      }).observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    });

    const client = await page.context().newCDPSession(page);
    await client.send("Emulation.setCPUThrottlingRate", {
      rate: LOW_END_CPU_THROTTLE_RATE,
    });

    const drugNameInput = page.getByLabel(/drug name/i);
    await drugNameInput.pressSequentially("amoxicillan");

    await expect(
      page.getByRole("option", { name: "Amoxicillin", exact: true }),
    ).toBeVisible({ timeout: SUGGESTION_VISIBLE_TIMEOUT_MS });

    const visibleSuggestionChanges = await page.evaluate(
      () => window.__visibleSuggestionChanges,
    );
    expect(visibleSuggestionChanges).toBeLessThan(
      MAX_VISIBLE_SUGGESTION_CHANGES_FOR_ONE_TYPO,
    );
  });

  test("drug name suggestion popover does not remount (flicker closed and reopen) while typing through a typo", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");

    const drugNameInput = page.getByLabel(/drug name/i);

    // "amoxicill" is a valid prefix; the remaining "an" diverges from the
    // real spelling and falls back to the debounced fuzzy worker search.
    // Both paths wait for typing to pause before showing/updating anything.
    // Playwright's auto-retrying assertions would tolerate a brief
    // close-then-reopen (they just wait for the element to reappear), so
    // instead count how many times the listbox is inserted into the DOM —
    // it must mount exactly once and never remount.
    await page.evaluate(() => {
      window.__listboxMountCount = 0;
      new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (!(node instanceof Element)) continue;
            // The popover may be portaled in as a wrapper whose listbox is
            // a descendant, not the added node itself.
            if (
              node.matches('[role="listbox"]') ||
              node.querySelector('[role="listbox"]')
            ) {
              window.__listboxMountCount!++;
            }
          }
        }
      }).observe(document.body, { childList: true, subtree: true });
    });

    await drugNameInput.pressSequentially("amoxicill");
    await expect(
      page.getByRole("option", { name: "Amoxicillin", exact: true }),
    ).toBeVisible();

    await drugNameInput.pressSequentially("an", { delay: 20 });
    // Give the debounced fuzzy search (DEFAULT_SUGGESTIONS_DEBOUNCE_MS in
    // useDrugNameSuggestions.ts) time to fire and its response to apply, so
    // a remount here would have already happened.
    await page.waitForTimeout(800);

    expect(await page.evaluate(() => window.__listboxMountCount)).toBe(1);
  });

  test("clearing the field and typing a different medicine never briefly shows the previous medicine's suggestion", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");

    const drugNameInput = page.getByLabel(/drug name/i);
    await drugNameInput.pressSequentially("enala");
    await expect(
      page.getByRole("option", { name: "Enalapril", exact: true }),
    ).toBeVisible();

    // Clear the whole field (mirrors select-all + delete) and pause well
    // past the debounce, so the old answer has every chance to have
    // settled — this isn't a fast-retype timing race.
    await drugNameInput.fill("");
    await page.waitForTimeout(2_000);
    // Scoped to the drug-name popover's listbox specifically — the Unit
    // and Form fields are native <select> elements, whose <option>
    // children also carry an implicit role="option" and would otherwise
    // collide with an unscoped query here.
    await expect(page.locator('[role="listbox"]')).not.toBeVisible();

    // Watch every option the popover ever renders from this point on: the
    // previous medicine's name must never appear again, not even briefly,
    // while typing a completely unrelated one.
    await page.evaluate(() => {
      window.__staleOptionSeen = false;
      new MutationObserver(() => {
        const listbox = document.querySelector('[role="listbox"]');
        if (!listbox) return;
        const optionText = Array.from(
          listbox.querySelectorAll('[role="option"]'),
        )
          .map((el) => el.textContent?.trim())
          .join("|");
        if (optionText.includes("Enalapril")) {
          window.__staleOptionSeen = true;
        }
      }).observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    });

    await drugNameInput.pressSequentially("meto");
    await expect(
      page.getByRole("option", { name: "Metoprolol", exact: true }),
    ).toBeVisible();

    expect(await page.evaluate(() => window.__staleOptionSeen)).toBe(false);
  });

  test("drug name suggestion popover aligns with the input's left and right edges", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");

    const drugNameInput = page.getByLabel(/drug name/i);
    await drugNameInput.pressSequentially("enala");

    const option = page.getByRole("option", { name: "Enalapril", exact: true });
    await expect(option).toBeVisible();

    const inputBox = await drugNameInput.boundingBox();
    const popoverBox = await option
      .locator("xpath=ancestor::*[@role='listbox']")
      .boundingBox();

    expect(inputBox).not.toBeNull();
    expect(popoverBox).not.toBeNull();
    expect(Math.abs(popoverBox!.x - inputBox!.x)).toBeLessThanOrEqual(2);
    expect(
      Math.abs(
        popoverBox!.x + popoverBox!.width - (inputBox!.x + inputBox!.width),
      ),
    ).toBeLessThanOrEqual(2);
  });

  test("selecting a suggestion with Enter fills the field and does not reopen the suggestion list", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");

    const drugNameInput = page.getByLabel(/drug name/i);
    await drugNameInput.pressSequentially("enala");
    await expect(
      page.getByRole("option", { name: "Enalapril", exact: true }),
    ).toBeVisible();

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    await expect(drugNameInput).toHaveValue("Enalapril");
    await expect(
      page.getByRole("option", { name: "Enalapril", exact: true }),
    ).not.toBeVisible();
  });

  test("tabbing away from an open suggestion popover keeps the typed text instead of forcing the nearest match", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");

    const drugNameInput = page.getByLabel(/drug name/i);
    await drugNameInput.pressSequentially("enala");
    await expect(
      page.getByRole("option", { name: "Enalapril", exact: true }),
    ).toBeVisible();

    // Neither arrows down to an option nor clicks one — just leaves.
    await page.keyboard.press("Tab");

    await expect(drugNameInput).toHaveValue("enala");
  });

  test("arrowing down to preview a suggestion, then tabbing away without pressing Enter, does not select it", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");

    const drugNameInput = page.getByLabel(/drug name/i);
    await drugNameInput.pressSequentially("enala");
    await expect(
      page.getByRole("option", { name: "Enalapril", exact: true }),
    ).toBeVisible();

    // Highlighting a suggestion by arrowing to it is a preview, not a
    // commitment — only Enter or a click should confirm it.
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Tab");

    await expect(drugNameInput).toHaveValue("enala");
  });

  test("Days and Times fieldset is aria-invalid when submitted without a day or with a blank time", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");
    await page.getByLabel(/drug name/i).fill("Aspirin");
    await page.getByLabel("Strength").fill("100");
    await page.getByLabel(/start date/i).fill("2024-06-01");
    await page.getByLabel(/time 1/i).fill("08:00");
    // Button is soft-disabled (no day selected); force:true simulates a real user click
    await page
      .getByRole("button", { name: /save prescription/i })
      .click({ force: true });
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

  test("dose quantity of 0 shows an inline error and blocks submission until corrected", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");
    await page.getByLabel(/drug name/i).fill("Aspirin");
    await page.getByLabel("Strength").fill("100");
    await page.getByRole("combobox", { name: /unit/i }).selectOption("mg");
    await page.getByLabel(/start date/i).fill("2024-06-01");
    await page.getByRole("checkbox", { name: "Monday" }).locator("..").click();
    await page.getByLabel(/time 1/i).fill("08:00");

    const qtyInput = page.getByLabel(/quantity 1/i);
    await qtyInput.fill("0");
    await page.getByRole("button", { name: /save prescription/i }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(qtyInput).toHaveAttribute("aria-invalid", "true");
    // Still on the form — submission was blocked
    await expect(
      page.getByRole("heading", { name: /add prescription/i, level: 2 }),
    ).toBeVisible();

    await qtyInput.fill("2");
    await page.getByRole("button", { name: /save prescription/i }).click();

    await expect(
      page.getByRole("heading", { name: "Aspirin", level: 2 }),
    ).toBeVisible();
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

test.describe("Schedule mode toggle", () => {
  test("new form defaults to Simple mode", async ({ page }) => {
    await page.goto("/prescriptions/new");
    await expect(
      page.getByRole("button", { name: /^simple$/i }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: /^advanced$/i }),
    ).toHaveAttribute("aria-pressed", "false");
    await expect(
      page.getByRole("button", { name: /add dosing schedule/i }),
    ).not.toBeVisible();
  });

  test("switching to Advanced reveals the add button, hint text, and remove button", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");
    await page.getByRole("button", { name: /^advanced$/i }).click();
    await expect(
      page.getByRole("button", { name: /add dosing schedule/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/different times on different days/i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /remove dosing schedule/i }),
    ).toBeVisible();
  });

  test("switching back to Simple hides the add button and hint", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");
    await page.getByRole("button", { name: /^advanced$/i }).click();
    await page.getByRole("button", { name: /^simple$/i }).click();
    await expect(
      page.getByRole("button", { name: /add dosing schedule/i }),
    ).not.toBeVisible();
    await expect(
      page.getByText(/different times on different days/i),
    ).not.toBeVisible();
  });

  test("switching to Simple with multiple schedules prompts for confirmation", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");
    await page.getByRole("button", { name: /^advanced$/i }).click();
    await page.getByRole("button", { name: /add dosing schedule/i }).click();

    let dialogMessage = "";
    page.once("dialog", async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });
    await page.getByRole("button", { name: /^simple$/i }).click();
    expect(dialogMessage).toMatch(/only the first schedule/i);
  });

  test("confirming the prompt collapses to one schedule block", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");
    await page.getByRole("button", { name: /^advanced$/i }).click();
    await page.getByRole("button", { name: /add dosing schedule/i }).click();
    await expect(
      page.getByRole("group", { name: /days and times/i }),
    ).toHaveCount(2);

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: /^simple$/i }).click();
    await expect(
      page.getByRole("group", { name: /days and times/i }),
    ).toHaveCount(1);
  });

  test("dismissing the prompt keeps Advanced mode with both schedules", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");
    await page.getByRole("button", { name: /^advanced$/i }).click();
    await page.getByRole("button", { name: /add dosing schedule/i }).click();

    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("button", { name: /^simple$/i }).click();
    await expect(
      page.getByRole("group", { name: /days and times/i }),
    ).toHaveCount(2);
    await expect(
      page.getByRole("button", { name: /^advanced$/i }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("no prompt when switching to Simple with only one schedule", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");
    await page.getByRole("button", { name: /^advanced$/i }).click();

    let dialogFired = false;
    page.once("dialog", () => {
      dialogFired = true;
    });
    await page.getByRole("button", { name: /^simple$/i }).click();
    expect(dialogFired).toBe(false);
  });

  test("edit form with one schedule opens in Simple mode", async ({ page }) => {
    const res = await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    const { id } = (await res.json()) as { id: string };
    await page.goto(`/prescriptions/${id}/edit`);
    await expect(
      page.getByRole("button", { name: /^simple$/i }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: /add dosing schedule/i }),
    ).not.toBeVisible();
  });

  test("edit form with multiple schedules opens in Advanced mode", async ({
    page,
  }) => {
    const res = await page.request.post("/api/v1/prescriptions", {
      data: {
        ...BASE_PRESCRIPTION,
        schedule: {
          days: {
            monday: [{ time: "08:00", quantity: 1 }],
            friday: [{ time: "20:00", quantity: 1 }],
          },
          timezoneMode: "local",
        },
      },
    });
    const { id } = (await res.json()) as { id: string };
    await page.goto(`/prescriptions/${id}/edit`);
    await expect(
      page.getByRole("button", { name: /^advanced$/i }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: /add dosing schedule/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: /days and times/i }),
    ).toHaveCount(2);
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
    const detail = page.locator("article");
    await expect(detail.getByText("500 mg")).toBeVisible();
    await expect(detail.getByText("01/01/2024")).toBeVisible();
    await expect(detail.getByText("8:00 AM")).toBeVisible();

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
    await page.getByRole("link", { name: /lisinopril/i }).click();

    await expect(page).toHaveURL(`/prescriptions/${lisinoprilId}`);
    await expect(
      page.getByRole("heading", { name: "Lisinopril", level: 2 }),
    ).toBeVisible();
  });
});

test.describe("Add another prompt", () => {
  test("saving a new prescription shows the prompt; Add Another goes to the new-prescription form", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");
    await fillCreateForm(page);

    await expect(page).toHaveURL(/\/prescriptions\/[^/]+$/);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/prescription added/i);

    await page.getByRole("link", { name: /add another/i }).click();
    await expect(page).toHaveURL("/prescriptions/new");
  });

  test("No Thanks dismisses the prompt and stays on the detail page", async ({
    page,
  }) => {
    await page.goto("/prescriptions/new");
    await fillCreateForm(page);

    await expect(page.getByRole("dialog")).toBeVisible();
    const detailUrl = page.url();

    await page.getByRole("button", { name: /no thanks/i }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page).toHaveURL(detailUrl);
  });

  test("editing an existing prescription does not show the prompt", async ({
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
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("clicking a prescription row in the list does not show the prompt", async ({
    page,
  }) => {
    const res1 = await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });
    const { id: metforminId } = (await res1.json()) as { id: string };
    await page.request.post("/api/v1/prescriptions", {
      data: { ...BASE_PRESCRIPTION, drugName: "Lisinopril" },
    });

    await page.goto(`/prescriptions/${metforminId}`);
    await page.getByRole("link", { name: /lisinopril/i }).click();

    await expect(
      page.getByRole("heading", { name: "Lisinopril", level: 2 }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});

test.describe("Unsaved changes guard", () => {
  // The "Back" link is a mobile-only affordance (hidden by CSS above 640px);
  // on desktop the always-visible split-panel list is used to navigate instead.
  test.use({ viewport: { width: 390, height: 844 } });

  test.describe("Add prescription form", () => {
    test("shows the unsaved changes dialog when navigating away from a dirty form", async ({
      page,
    }) => {
      await page.goto("/prescriptions/new");
      await page.getByLabel(/drug name/i).fill("Aspirin");

      await page.getByRole("button", { name: /back/i }).click();

      const dialog = page.getByRole("dialog", { name: /discard changes/i });
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(/lost/i);
      await expect(page).toHaveURL("/prescriptions/new");
    });

    test("Stay keeps the patient on the form with their data intact", async ({
      page,
    }) => {
      await page.goto("/prescriptions/new");
      await page.getByLabel(/drug name/i).fill("Aspirin");

      await page.getByRole("button", { name: /back/i }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: /^stay$/i }).click();

      await expect(page.getByRole("dialog")).not.toBeVisible();
      await expect(page).toHaveURL("/prescriptions/new");
      await expect(page.getByLabel(/drug name/i)).toHaveValue("Aspirin");
    });

    test("Leave navigates away and discards the draft", async ({ page }) => {
      await page.goto("/prescriptions/new");
      await page.getByLabel(/drug name/i).fill("Aspirin");

      await page.getByRole("button", { name: /back/i }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: /^discard$/i }).click();

      await expect(page).toHaveURL("/prescriptions");
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });

    test("navigating away from an untouched form shows no dialog", async ({
      page,
    }) => {
      await page.goto("/prescriptions/new");

      await page.getByRole("button", { name: /back/i }).click();

      await expect(page).toHaveURL("/prescriptions");
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });

    test("a successful save redirects without showing the dialog", async ({
      page,
    }) => {
      await page.goto("/prescriptions/new");
      await fillCreateForm(page);

      await expect(page).toHaveURL(/\/prescriptions\/[^/]+$/);
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });
  });

  test.describe("Edit prescription form", () => {
    test("shows the unsaved changes dialog when navigating away from a dirty form", async ({
      page,
    }) => {
      const res = await page.request.post("/api/v1/prescriptions", {
        data: BASE_PRESCRIPTION,
      });
      const { id } = (await res.json()) as { id: string };
      await page.goto(`/prescriptions/${id}/edit`);
      await page.getByLabel(/drug name/i).fill("Metformin XR");

      await page.getByRole("button", { name: /back/i }).click();

      await expect(
        page.getByRole("dialog", { name: /discard changes/i }),
      ).toBeVisible();
      await expect(page).toHaveURL(`/prescriptions/${id}/edit`);
    });

    test("Leave navigates away and discards the edit", async ({ page }) => {
      const res = await page.request.post("/api/v1/prescriptions", {
        data: BASE_PRESCRIPTION,
      });
      const { id } = (await res.json()) as { id: string };
      await page.goto(`/prescriptions/${id}/edit`);
      await page.getByLabel(/drug name/i).fill("Metformin XR");

      await page.getByRole("button", { name: /back/i }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: /^discard$/i }).click();

      await expect(page).toHaveURL("/prescriptions");
    });

    test("navigating away from an untouched edit form shows no dialog", async ({
      page,
    }) => {
      const res = await page.request.post("/api/v1/prescriptions", {
        data: BASE_PRESCRIPTION,
      });
      const { id } = (await res.json()) as { id: string };
      await page.goto(`/prescriptions/${id}/edit`);

      await page.getByRole("button", { name: /back/i }).click();

      await expect(page).toHaveURL("/prescriptions");
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });

    test("a successful save redirects without showing the dialog", async ({
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
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });
  });

  test.describe("desktop split-panel Link navigation", () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test("clicking a different prescription in the list shows the unsaved changes dialog", async ({
      page,
    }) => {
      const res = await page.request.post("/api/v1/prescriptions", {
        data: BASE_PRESCRIPTION,
      });
      const { id } = (await res.json()) as { id: string };
      await page.goto("/prescriptions/new");
      await page.getByLabel(/drug name/i).fill("Aspirin");

      await page.getByRole("link", { name: /metformin/i }).click();

      await expect(
        page.getByRole("dialog", { name: /discard changes/i }),
      ).toBeVisible();
      await expect(page).toHaveURL("/prescriptions/new");

      await page.getByRole("button", { name: /^discard$/i }).click();
      await expect(page).toHaveURL(`/prescriptions/${id}`);
    });
  });
});
