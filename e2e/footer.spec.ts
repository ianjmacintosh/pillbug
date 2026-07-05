import { expect, test } from "@playwright/test";
import { hashEmail } from "../worker/email-crypto";
import { ALICE_EMAIL, ALICE_AUTH_FILE } from "./test-accounts";
import { getDB, disposeDB } from "./db";
import ptBR from "../shared/locales/pt-BR";

async function resetAliceLanguage(): Promise<void> {
  const db = await getDB();
  const emailLookup = await hashEmail(ALICE_EMAIL, process.env.EMAIL_SECRET!);
  await db
    .prepare("UPDATE patients SET language = NULL WHERE email_lookup = ?")
    .bind(emailLookup)
    .run();
}

test.afterAll(async () => {
  await disposeDB();
});

test.describe("Footer — authenticated users", () => {
  test.use({ storageState: ALICE_AUTH_FILE });

  // Legal links live in Settings for authenticated users now (issue #280) —
  // the footer (with its persistent "Legal" nav easily misread as a CTA)
  // should never render once a session exists, on any app route, including
  // /terms and /privacy themselves when reached while logged in.
  for (const path of [
    "/prescriptions",
    "/settings",
    "/fill-session",
    "/weekly-doses",
    "/terms",
    "/privacy",
  ]) {
    test(`no footer shown on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("contentinfo")).not.toBeAttached();
    });
  }
});

test.describe("Footer — logged out", () => {
  test("shows legal links and language switcher on /register", async ({
    page,
  }) => {
    await page.goto("/register");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();
    await expect(
      footer.getByRole("link", { name: /terms of service/i }),
    ).toBeVisible();
    await expect(
      footer.getByRole("link", { name: /privacy policy/i }),
    ).toBeVisible();
    await expect(
      footer.getByRole("combobox", { name: /language/i }),
    ).toBeVisible();
  });
});

test.describe("pt-BR translation", () => {
  test.use({ storageState: ALICE_AUTH_FILE });

  test.beforeEach(async () => {
    await resetAliceLanguage();
  });

  test("Settings legal eyebrow shows the corrected pt-BR translation, not the mistranslated 'Legal'", async ({
    page,
  }) => {
    await page.goto("/settings");
    // Scope to main: right after navigation, Layout's auth check is still
    // in flight and the (soon-to-be-hidden) footer's own language <select>
    // briefly coexists with Settings' own, which share the same accessible name.
    await page
      .getByRole("main")
      .getByRole("combobox", { name: /language/i })
      .selectOption("pt-BR");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(
      page.getByRole("combobox", { name: /time zone/i }),
    ).not.toBeVisible();

    await page.goto("/settings");
    await expect(
      page.getByRole("main").getByText(ptBR["settings.legal"], {
        exact: true,
      }),
    ).toBeVisible();
  });
});
