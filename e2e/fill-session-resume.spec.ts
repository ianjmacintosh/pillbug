import { expect, test } from "@playwright/test";
import { disposeDB } from "./db";
import { setKnownPin, TEST_PIN, TURNSTILE_DUMMY_TOKEN } from "./helpers";

test.use({ timezoneId: "America/Chicago" });

test.afterAll(async () => {
  await disposeDB();
});

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
      ].map((d) => [d, [{ time: "08:00", quantity: 1 }]]),
    ),
  },
  startDate: "2024-01-01",
  doseForm: "tablet",
};

test("resuming an in-progress Fill Session from an unrecognized browser context", async ({
  browser,
}) => {
  const email = `delivered+fill-session-resume-${Date.now()}@resend.dev`;

  // The "original device": register, verify, seed two prescriptions, and
  // get partway into a Fill Session.
  const originalContext = await browser.newContext({
    timezoneId: "America/Chicago",
  });
  const originalPage = await originalContext.newPage();

  await originalContext.request.post("/api/v1/register", {
    data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
  });
  const loginRes = await originalContext.request.post("/api/v1/login", {
    data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
  });
  const { token } = (await loginRes.json()) as { token: string };
  await setKnownPin(token);
  await originalPage.goto(`/enter-code?token=${token}&pin=${TEST_PIN}`);
  await expect(originalPage).toHaveURL("/prescriptions");

  await originalContext.request.post("/api/v1/prescriptions", {
    data: METFORMIN,
  });
  await originalContext.request.post("/api/v1/prescriptions", {
    data: LISINOPRIL,
  });

  await originalPage.goto("/fill-session");
  await originalPage.getByRole("button", { name: /continue/i }).click();
  await originalPage.getByRole("button", { name: /i'm ready/i }).click();
  await originalPage
    .getByRole("combobox", { name: /pill organizer/i })
    .selectOption("2");
  await originalPage.getByRole("button", { name: /continue/i }).click();
  await expect(originalPage.getByText("Metformin")).toBeVisible();
  await originalPage.getByRole("button", { name: /next medicine/i }).click();
  await expect(originalPage.getByText(/medicine 2 of 2/i)).toBeVisible();

  // Autosave is fire-and-forget from the wizard's perspective — wait for it
  // to actually land before tearing down this context, so the resume below
  // isn't racing the write.
  await expect(async () => {
    const res = await originalContext.request.get(
      "/api/v1/fill-session/progress",
    );
    const body = (await res.json()) as {
      progress: { currentIndex: number } | null;
    };
    expect(body.progress?.currentIndex).toBe(1);
  }).toPass();

  await originalContext.close();

  // A fresh, unrecognized browser context — no cookies at all. This is the
  // "opened the shared WhatsApp link on a new device / in-app browser"
  // scenario from issue #302/#303.
  const freshContext = await browser.newContext({
    timezoneId: "America/Chicago",
  });
  const freshPage = await freshContext.newPage();

  // Landing here with no session cookie correctly goes to /register — that
  // was confirmed correct behavior when #303 was closed. The gap #302 is
  // about is what happens next.
  await freshPage.goto("/");
  await expect(freshPage).toHaveURL("/register");

  // The Patient proves who they are via the existing email + code login —
  // not a secret link or any new auth mechanism — then lands back in their
  // in-progress session instead of on /prescriptions.
  await freshPage
    .getByRole("main")
    .getByRole("link", { name: /log in/i })
    .click();
  await expect(freshPage).toHaveURL("/login");

  const resumeLoginRes = await freshContext.request.post("/api/v1/login", {
    data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
  });
  const { token: resumeToken } = (await resumeLoginRes.json()) as {
    token: string;
  };
  await setKnownPin(resumeToken);
  await freshPage.goto(`/enter-code?token=${resumeToken}&pin=${TEST_PIN}`);

  await expect(freshPage).toHaveURL(/\/fill-session\/step4/);
  // currentIndex was restored to 1 — Lisinopril (the medicine the Patient
  // had reached) is current, not Metformin.
  await expect(freshPage.getByText("Lisinopril")).toBeVisible();
  await expect(freshPage.getByText(/medicine 2 of 2/i)).toBeVisible();
  await expect(
    freshPage.getByRole("region", { name: /lisinopril/i }).getByText("AM"),
  ).toBeVisible();

  await freshContext.close();
});

test("an in-progress Fill Session survives a full page reload (screen sleep reclaiming the tab)", async ({
  browser,
}) => {
  const email = `delivered+fill-session-reload-${Date.now()}@resend.dev`;
  const context = await browser.newContext({ timezoneId: "America/Chicago" });
  const page = await context.newPage();

  await context.request.post("/api/v1/register", {
    data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
  });
  const loginRes = await context.request.post("/api/v1/login", {
    data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
  });
  const { token } = (await loginRes.json()) as { token: string };
  await setKnownPin(token);
  await page.goto(`/enter-code?token=${token}&pin=${TEST_PIN}`);
  await expect(page).toHaveURL("/prescriptions");

  await context.request.post("/api/v1/prescriptions", { data: METFORMIN });

  await page.goto("/fill-session");
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: /i'm ready/i }).click();
  await page
    .getByRole("combobox", { name: /pill organizer/i })
    .selectOption("2");
  await page.getByRole("button", { name: /continue/i }).click();
  await expect(page.getByText("Metformin")).toBeVisible();

  await expect(async () => {
    const res = await context.request.get("/api/v1/fill-session/progress");
    const body = (await res.json()) as {
      progress: { organizerType: string } | null;
    };
    expect(body.progress?.organizerType).toBe("2");
  }).toPass();

  // Simulate the OS reclaiming a backgrounded tab: a hard reload discards
  // all in-memory React state (organizer type, medicine index, step).
  await page.reload();

  await expect(page).toHaveURL(/\/fill-session\/step4/);
  await expect(page.getByText("AM").first()).toBeVisible();

  await context.close();
});
