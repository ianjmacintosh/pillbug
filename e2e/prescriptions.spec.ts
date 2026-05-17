import { getPlatformProxy } from "wrangler";
import type { D1Database } from "@cloudflare/workers-types";
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { hashEmail } from "../worker/email-crypto";

const TURNSTILE_DUMMY_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

interface Env {
  DB: D1Database;
}

async function getLatestToken(email: string): Promise<string> {
  const { env, dispose } = await getPlatformProxy<Env>({
    environment: "staging",
  });
  try {
    const emailLookup = await hashEmail(email, process.env.EMAIL_SECRET!);
    const row = await env.DB.prepare(
      "SELECT t.token FROM magic_link_tokens t JOIN patients p ON t.patient_id = p.id WHERE p.email_lookup = ? ORDER BY t.rowid DESC LIMIT 1",
    )
      .bind(emailLookup)
      .first<{ token: string }>();
    if (!row) throw new Error(`No token found for ${email}`);
    return row.token;
  } finally {
    await dispose();
  }
}

async function loginAndGoToPrescriptions(
  email: string,
  page: Page,
  request: APIRequestContext,
): Promise<void> {
  await request.post("/api/v1/register", {
    data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
  });
  const token = await getLatestToken(email);
  await page.goto(`/verify?token=${token}`);
  await expect(page).toHaveURL("/");
  await page.goto("/prescriptions");
}

const BASE_PRESCRIPTION = {
  drugName: "Metformin",
  dosage: "500mg",
  schedule: { days: "daily", times: [], timezoneMode: "local" },
  startDate: "2024-01-01",
};

test.describe("Prescription create", () => {
  test("add prescription form creates prescription and it appears in list", async ({
    page,
    request,
  }) => {
    const email = `delivered+rx-create-${Date.now()}@resend.dev`;
    await loginAndGoToPrescriptions(email, page, request);

    await page.getByRole("button", { name: /add prescription/i }).click();
    await page.getByLabel(/drug name/i).fill("Metformin");
    await page.getByLabel("Dosage").fill("500mg");
    await page.getByLabel(/start date/i).fill("2024-01-01");
    await page.getByRole("button", { name: /save prescription/i }).click();

    await page.getByRole("button", { name: /show all prescriptions/i }).click();
    await expect(page.getByRole("cell", { name: "Metformin" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "500mg" })).toBeVisible();
  });
});

test.describe("Prescription edit", () => {
  test("edit form pre-populates fields and updates prescription on save", async ({
    page,
    request,
  }) => {
    const email = `delivered+rx-edit-${Date.now()}@resend.dev`;
    await loginAndGoToPrescriptions(email, page, request);

    await page.request.post("/api/v1/prescriptions", {
      data: BASE_PRESCRIPTION,
    });

    await page.getByRole("button", { name: /show all prescriptions/i }).click();
    await expect(page.getByRole("cell", { name: "Metformin" })).toBeVisible();

    await page.getByRole("button", { name: /edit/i }).click();
    await expect(page.getByLabel(/drug name/i)).toHaveValue("Metformin");
    await expect(page.getByLabel("Dosage")).toHaveValue("500mg");
    await expect(page.getByLabel(/start date/i)).toHaveValue("2024-01-01");

    await page.getByLabel("Dosage").clear();
    await page.getByLabel("Dosage").fill("1000mg");
    await page.getByRole("button", { name: /save prescription/i }).click();

    await expect(page.getByRole("cell", { name: "1000mg" })).toBeVisible();
    await expect(page.getByLabel(/drug name/i)).not.toBeAttached();
  });

  test("cancel closes edit form without modifying the prescription", async ({
    page,
    request,
  }) => {
    const email = `delivered+rx-cancel-edit-${Date.now()}@resend.dev`;
    await loginAndGoToPrescriptions(email, page, request);

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
    request,
  }) => {
    const email = `delivered+rx-delete-${Date.now()}@resend.dev`;
    await loginAndGoToPrescriptions(email, page, request);

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
    request,
  }) => {
    const email = `delivered+rx-cancel-delete-${Date.now()}@resend.dev`;
    await loginAndGoToPrescriptions(email, page, request);

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
