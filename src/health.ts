import type { D1Database } from "@cloudflare/workers-types";

type Status = "ok" | "error";

export async function checkHealth(
  db: D1Database,
  resendApiKey: string,
): Promise<{ db: Status; email: Status }> {
  const [dbStatus, emailStatus] = await Promise.all([
    db
      .prepare("SELECT 1")
      .first()
      .then(() => "ok" as Status)
      .catch(() => "error" as Status),
    fetch("https://api.resend.com/emails", {
      headers: { Authorization: `Bearer ${resendApiKey}` },
    })
      .then((r) => (r.ok ? ("ok" as Status) : ("error" as Status)))
      .catch(() => "error" as Status),
  ]);
  return { db: dbStatus, email: emailStatus };
}
