# Web Push API (self-hosted, VAPID) for Reminders

Pillbug delivers Reminders via the browser Web Push API using VAPID keys, with no managed notification service (OneSignal, Firebase Cloud Messaging dashboard, etc.).

Reminder payloads contain medication names and scheduled times — health-sensitive content that should not transit a third-party server. The Web Push API delivers notifications directly through browser push infrastructure (Chrome/FCM, Firefox/Autopush, Safari/APNs) without Pillbug sharing patient data with any notification vendor. VAPID keys are generated and held by Pillbug's Cloudflare Workers backend.

This approach also aligns naturally with the PWA service worker that Pillbug requires for offline support and home-screen installation.

Patient push subscription tokens are stored in D1 and deleted on unsubscribe or account deletion.

## Considered Options

- **Web Push API with VAPID (self-hosted)** — chosen: no third-party sees Reminder content, works natively with the PWA service worker, no additional vendor dependency.
- **Managed service (OneSignal, etc.)** — rejected: Reminder content (medication names, scheduled times) would transit a third-party server, which is inconsistent with the project's privacy stance.
