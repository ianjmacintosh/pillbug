# Resend for transactional email

Pillbug uses Resend to deliver magic link emails and end-of-course Prescription notifications.

Resend was chosen over SendGrid/Postmark for its lighter onboarding, cleaner API, and generous free tier (3,000 emails/month). It integrates directly with Cloudflare Workers via HTTP. The only patient data Resend receives is the recipient email address and delivery metadata — no message body content beyond what is required for delivery.

Railway (where the developer already has an account) does not offer a native email sending service and was not a viable alternative.

## Considered Options

- **Resend** — chosen: minimal third-party footprint, free tier sufficient, first-class Workers support.
- **SendGrid / Postmark** — rejected: heavier onboarding, more telemetry, no meaningful advantage at this scale.
- **Cloudflare Email Routing** — rejected: designed for inbound routing, not outbound transactional email.
- **Self-hosted SMTP on Railway** — rejected: deliverability, IP reputation, and DKIM/SPF/DMARC setup are a significant ops burden for a solved problem.
