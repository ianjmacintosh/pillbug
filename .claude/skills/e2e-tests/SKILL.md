---
name: e2e-tests
description: Write end-to-end Playwright tests for Pillbug pages. Covers selector strategy, accessibility assertions, auth setup, state reset, and print-media testing. Use when asked to write E2E tests, add Playwright specs, improve test coverage for a page, or check accessibility in tests.
---

# E2E Tests

> "The more your tests resemble the way your software is used, the more confidence they can give you." — Kent C. Dodds

Tests should find elements using properties that are most apparent and obvious to the end user.

## Quick start

1. Read the existing spec for the target page (or the closest neighbour) before writing anything.
2. Identify whether the page needs a logged-in user — pick the right auth file (see Auth below).
3. Group tests with `test.describe`, reset state in `beforeAll`/`beforeEach`, close shared pages in `afterAll`.
4. Always call `await disposeDB()` in `afterAll`.

Run tests:
```
npx playwright test e2e/<spec>.spec.ts
npx playwright test --ui   # interactive mode
```

## Selector priority

Use these queries in order. Skip down only when the preferred option genuinely doesn't apply.

1. **`getByRole`** — top preference. Use the `name` option to narrow. See [ARIA roles](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Techniques#Roles).
   ```ts
   page.getByRole("button", { name: /save prescription/i })
   page.getByRole("heading", { level: 1 })
   page.getByRole("region", { name: /metformin/i })
   ```
2. **`getByLabel`** — best for form fields; mirrors how users navigate forms.
   ```ts
   page.getByLabel(/drug name/i)
   ```
3. **`getByPlaceholder`** — only when no label exists. A placeholder is not a substitute for a label.
4. **`getByText`** — for non-interactive elements (`div`, `span`, `p`) where text is what the user sees.
5. **`getByDisplayValue`** — useful when navigating a page with filled-in form values.
   ```ts
   page.getByDisplayValue("metformin")
   ```
6. **`getByAltText`** — for images and elements that support `alt`.
7. **`getByTitle`** — `title` is not consistently read by screen readers and is invisible by default.
8. **`getByTestId`** — only when nothing above applies or the text is dynamic. Users cannot see or hear test IDs.

### Scoping queries to a sub-element

Testing Library uses `within(locator).getByText(...)`. In Playwright, chain directly off any locator instead:

```ts
// Testing Library
within(screen.getByTestId('messages')).getByText('hello')

// Playwright equivalent
page.getByTestId('messages').getByText('hello')

// Common pattern: scope to a named region
page.getByRole('region', { name: /metformin/i }).getByText('1')
```

> **If an element is hard to find, that strongly suggests it is not accessible to users.** Prefer to improve accessibility before reaching for a less-recommended query. Call out accessibility problems and confirm with the user before making changes that affect visual/mouse users as well as those using assistive technology.

## Auth

Two pre-seeded accounts exist in `e2e/test-accounts.ts`:

| Account | Auth file | Use for |
|---|---|---|
| `ALICE_EMAIL` | `ALICE_AUTH_FILE` | General authenticated pages; timezone and registration date are stable |
| `PRESCRIPTIONS_PATIENT_EMAIL` | `PRESCRIPTIONS_PATIENT_AUTH_FILE` | Prescription/fill-session tests; state is reset per test |

Apply auth at the top of the spec:
```ts
test.use({ storageState: ALICE_AUTH_FILE });
```

For tests that need a **throwaway account** (auth flow, onboarding), create a fresh address per test:
```ts
const email = `delivered+<purpose>-${Date.now()}@resend.dev`;
```
Never use `@example.com`. Never invent named accounts outside `test-accounts.ts`.

## State setup

Manipulate D1 directly via `getDB()`, or via `page.request.post(...)` for API-level seeding.

```ts
import { getDB, disposeDB } from "./db";

test.beforeEach(async () => {
  const db = await getDB();
  await db.prepare("DELETE FROM prescriptions WHERE ...").bind(...).run();
  await disposeDB(); // always dispose after direct DB work
});
```

Reset timezone when the page is timezone-sensitive:
```ts
await db.prepare("UPDATE patients SET timezone = ? WHERE email_lookup = ?")
  .bind("America/Chicago", emailLookup).run();
```

## Shared-page pattern

When multiple tests read-only against the same loaded page, share a page to avoid redundant navigation:

```ts
let sharedPage: Page;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext({ storageState: ALICE_AUTH_FILE });
  sharedPage = await context.newPage();
  await sharedPage.goto("/target-route");
});

test.afterAll(async () => {
  await sharedPage.context().close();
});
```

## Accessibility assertions

Check ARIA state where the UI has interactive semantics:
```ts
await expect(trigger).toHaveAttribute("aria-expanded", "true");
await expect(fieldset).toHaveAttribute("aria-invalid", "true");
await expect(page.getByRole("alert")).toContainText(/error message/i);
await expect(dialog).toBeVisible();
```

Every page test should assert:
- A heading is visible at the expected level
- Interactive elements are reachable by role/label (this verifies labelling)
- Error states surface as `role="alert"` or `aria-invalid`

## Print-media testing

```ts
test.describe("print view", () => {
  test.beforeAll(async () => { await sharedPage.emulateMedia({ media: "print" }); });
  test.afterAll(async ()  => { await sharedPage.emulateMedia({ media: null }); });

  test("shows worksheet label", async () => {
    await expect(sharedPage.getByText("Worksheet", { exact: true })).toBeVisible();
  });
});
```

## Turnstile

All registration/login API calls need a dummy token:
```ts
import { TURNSTILE_DUMMY_TOKEN } from "./helpers";

await request.post("/api/v1/register", {
  data: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN, language: "en-US" },
});
```

## Checklist before committing

- [ ] `disposeDB()` called in every `afterAll` that touches the DB
- [ ] No `@example.com` addresses — use `resend.dev` throwaway pattern or named accounts
- [ ] Selectors use role/label first; `getByTestId` only as a last resort
- [ ] If a selector was hard to write, consider whether an accessibility fix is the right answer instead
- [ ] Each `describe` block has exactly the state setup it needs (not more)
- [ ] Accessibility: heading present, interactive elements labelled, error states tested
- [ ] New spec is wired to the correct `storageState` (or has none for public pages)
