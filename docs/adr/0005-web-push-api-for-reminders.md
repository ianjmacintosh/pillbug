# Reminders deferred until native app; Web Push rejected as primary channel

**Status: superseded.** The original decision selected Web Push API with VAPID keys as the Reminder delivery mechanism. That decision is reversed: Reminder delivery will not ship until a native app wrapper (Capacitor or equivalent) is available.

## Why Web Push was rejected as the launch channel

Web Push on iOS requires the patient to install the PWA to their home screen via "Add to Home Screen" in Safari before any notifications are delivered. The expected patient platform split is majority iOS. This means the majority of patients would receive no Reminders without completing a multi-step, non-obvious installation flow that most will not complete unprompted — making Web Push an unreliable primary notification channel at launch.

The server-side cron scheduling logic and UTC time conversion (HH:MM + patient IANA timezone → UTC fire time) remain valid regardless of delivery mechanism and will be built when Reminder delivery is in scope.

## When Reminders ship

Reminders will launch alongside a native app wrapper. The delivery mechanism will be:

- **iOS**: Local notifications scheduled directly on-device via the native API (UNUserNotificationCenter). Fires at exact local time, no network dependency.
- **Android**: Local notifications via AlarmManager, or Web Push via FCM if the native wrapper supports it.

Managed notification services (OneSignal, etc.) remain rejected — Reminder payloads contain medication names and scheduled times, which are health-sensitive and must not transit a third-party server.

## Consequences

- No push subscription table in D1. No VAPID key provisioning.
- No cron-based notification dispatch until the native app is in scope.
- The Settings screen may expose a "Reminders" section in future, but it ships disabled until the native app is available.
