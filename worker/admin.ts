import type { D1Database } from "@cloudflare/workers-types";

export interface AdminStats {
  totalPatients: number;
  unverifiedPatients: number;
  activeSessions: number;
}

export async function getAdminStats(db: D1Database): Promise<AdminStats> {
  const now = new Date().toISOString();
  const [totalRow, unverifiedRow, sessionsRow] = await Promise.all([
    db
      .prepare("SELECT COUNT(*) as count FROM patients")
      .first<{ count: number }>(),
    db
      .prepare(
        "SELECT COUNT(*) as count FROM patients WHERE last_login_at IS NULL",
      )
      .first<{ count: number }>(),
    db
      .prepare("SELECT COUNT(*) as count FROM sessions WHERE expires_at > ?")
      .bind(now)
      .first<{ count: number }>(),
  ]);
  return {
    totalPatients: totalRow?.count ?? 0,
    unverifiedPatients: unverifiedRow?.count ?? 0,
    activeSessions: sessionsRow?.count ?? 0,
  };
}

export function renderAdminHtml(stats: AdminStats): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pillbug Admin</title>
  <style>
    body { font-family: sans-serif; max-width: 480px; margin: 4rem auto; padding: 0 1rem; }
    h1 { margin-bottom: 2rem; }
    dl { display: grid; grid-template-columns: 1fr auto; gap: 0.5rem 2rem; }
    dt { color: #555; }
    dd { font-weight: bold; text-align: right; margin: 0; }
  </style>
</head>
<body>
  <h1>Admin Panel</h1>
  <dl>
    <dt>Total patients</dt><dd>${stats.totalPatients}</dd>
    <dt>Unverified patients</dt><dd>${stats.unverifiedPatients}</dd>
    <dt>Active sessions</dt><dd>${stats.activeSessions}</dd>
  </dl>
</body>
</html>`;
}
