import type { D1Database } from "@cloudflare/workers-types";
import type { Resend } from "resend";

type Status = "ok" | "error";

export async function checkHealth(
  db: D1Database,
  resend: Pick<Resend, "domains">,
): Promise<{ db: Status; email: Status }> {
  const [dbStatus, emailStatus] = await Promise.all([
    db
      .prepare("SELECT 1")
      .first()
      .then(() =>
        db
          .prepare(
            "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name IN ('patients', 'magic_link_tokens', 'sessions')",
          )
          .first<{ count: number }>()
          .then((row) => (row?.count === 3 ? "ok" : "error") as Status),
      )
      .catch(() => "error" as Status),
    resend.domains
      .list()
      .then(({ error }) => (error ? "error" : "ok") as Status)
      .catch(() => "error" as Status),
  ]);
  return { db: dbStatus, email: emailStatus };
}
