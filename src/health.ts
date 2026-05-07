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
      .then(() => "ok" as Status)
      .catch(() => "error" as Status),
    resend.domains
      .list()
      .then(({ error }) => (error ? "error" : "ok") as Status)
      .catch(() => "error" as Status),
  ]);
  return { db: dbStatus, email: emailStatus };
}
