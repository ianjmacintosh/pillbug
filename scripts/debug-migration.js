import { readdirSync, readFileSync, existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const D1_DIR = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const MIGRATIONS_DIR = "migrations";

const sqliteFiles = existsSync(D1_DIR)
  ? readdirSync(D1_DIR).filter((f) => f.endsWith(".sqlite"))
  : [];

if (sqliteFiles.length === 0) {
  console.error("No local database found. Run npm run db:migrate:local first.");
  process.exit(1);
}

const db = new DatabaseSync(`${D1_DIR}/${sqliteFiles[0]}`);

const applied = db
  .prepare("SELECT name FROM d1_migrations ORDER BY name")
  .all()
  .map((r) => r.name);

const allFiles = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const pending = allFiles.filter((f) => !applied.includes(f));

if (pending.length === 0) {
  console.log("No pending migrations.");
  process.exit(0);
}

console.log(
  `Dry-running ${pending.length} pending migration(s) statement by statement:\n`,
);

for (const file of pending) {
  console.log(`▶ ${file}`);
  const sql = readFileSync(`${MIGRATIONS_DIR}/${file}`, "utf8");

  const statements = sql
    .split(";")
    .map((s) => s.replace(/--[^\n]*/g, "").trim())
    .filter((s) => s.length > 0);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.replace(/\s+/g, " ").slice(0, 80);
    try {
      db.prepare(stmt).run();
      console.log(`  ✓ [${i + 1}/${statements.length}] ${preview}`);
    } catch (err) {
      console.error(`  ✗ [${i + 1}/${statements.length}] ${preview}`);
      console.error(`\nFailed statement:\n\n${stmt}\n`);
      console.error(`SQLite error: ${err.message}`);
      process.exit(1);
    }
  }
}

console.log("\nAll migrations applied successfully.");
