import { readdirSync, existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const D1_DIR = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const MIGRATIONS_DIR = "migrations";

const migrationFiles = readdirSync(MIGRATIONS_DIR).filter((f) =>
  f.endsWith(".sql"),
).length;

const sqliteFiles = existsSync(D1_DIR)
  ? readdirSync(D1_DIR).filter((f) => f.endsWith(".sqlite"))
  : [];

if (sqliteFiles.length === 0) {
  console.warn(
    "\x1b[33mWarning:\x1b[0m Local database not initialized. Run \x1b[1mnpm run db:migrate:local\x1b[0m to set it up.",
  );
  process.exit(0);
}

const db = new DatabaseSync(`${D1_DIR}/${sqliteFiles[0]}`);
const { applied } = db
  .prepare("SELECT COUNT(*) AS applied FROM d1_migrations")
  .get();
db.close();

if (applied < migrationFiles) {
  const pending = migrationFiles - applied;
  console.warn(
    `\x1b[33mWarning:\x1b[0m Local database is missing ${pending} migration${pending === 1 ? "" : "s"}. Run \x1b[1mnpm run db:migrate:local\x1b[0m to apply them.`,
  );
}
