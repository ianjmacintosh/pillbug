// Named test accounts used across E2E tests and developer scripts.
//
// ALICE is a pre-seeded patient in staging whose registration date is well in
// the past, making features like backward week navigation always testable.
// Her account is never deleted between runs; tests that use her must tolerate
// whatever state she is already in (or clean up after themselves).
//
// Note: dev-login.js also references Alice's email. If this changes, update
// that script too.
export const ALICE_EMAIL = "test-user-alice@pillbug.ianjmacintosh.com";

// PRESCRIPTIONS_PATIENT is a dedicated account for prescription E2E tests.
// Using a Resend test address means no real mail is ever sent.
// prescriptions.spec.ts resets this patient's timezone and clears their
// prescriptions before each test.
export const PRESCRIPTIONS_PATIENT_EMAIL =
  "delivered+e2e-prescriptions@resend.dev";

export const ALICE_AUTH_FILE = "playwright/.auth/alice.json";
