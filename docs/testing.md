# Testing

## Email addresses

Always use Resend's official test addresses in tests — never invented addresses like `user@example.com`. These addresses simulate specific delivery outcomes without sending real email:

| Address                 | Simulates              |
| ----------------------- | ---------------------- |
| `delivered@resend.dev`  | Successful delivery    |
| `bounced@resend.dev`    | Hard bounce (SMTP 550) |
| `complained@resend.dev` | Spam complaint         |
| `suppressed@resend.dev` | Suppressed address     |

All support `+` labels (e.g., `delivered+signup@resend.dev`) for distinguishing scenarios within a single test run.
