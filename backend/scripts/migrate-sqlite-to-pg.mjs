// One-time migration: copy every row from the existing SQLite database into
// PostgreSQL, preserving exact ids (and re-seeding sequences so new ids keep
// incrementing correctly). Idempotent — safe to re-run.
//
// Usage:
//   DATABASE_URL=postgres://user:pass@host:5432/weatherbuddy \
//     node backend/scripts/migrate-sqlite-to-pg.mjs
//
// Optional env:
//   SQLITE_DB_PATH  — path to the SQLite file (defaults to backend/data/weatherbuddy.db)
import pg from "pg";
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Return BIGINT values (ids, MAX(id)) as JS numbers so counts compare cleanly.
pg.types.setTypeParser(20, (v) => parseInt(v, 10));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required to run the migration.");
  process.exit(1);
}

const sqlitePath =
  process.env.SQLITE_DB_PATH || path.join(__dirname, "..", "data", "weatherbuddy.db");

const sqlite = new Database(sqlitePath, { readonly: true });
const pool = new pg.Pool({ connectionString: DATABASE_URL });

const TABLES = [
  "users",
  "subscriptions",
  "user_prefs",
  "favorites",
  "notifications",
  "ai_activities",
  "weather_history",
];

// Primary key per table (user_prefs keys on user_id, everything else on id).
const TABLE_PK = {
  users: "id",
  subscriptions: "id",
  user_prefs: "user_id",
  favorites: "id",
  notifications: "id",
  ai_activities: "id",
  weather_history: "id",
};

async function migrate() {
  console.log(`Source SQLite: ${sqlitePath}`);

  // Importing db.js with DATABASE_URL set runs ensurePgSchema(), so the target
  // tables exist before we insert (schema is kept in one place).
  await import("../data/db.js");

  const reports = {};

  for (const table of TABLES) {
    const sqliteRows = sqlite.prepare(`SELECT * FROM ${table}`).all();
    const sourceCount = sqliteRows.length;
    const rowReport = { sqlite: sourceCount, pg: 0 };

    if (sourceCount > 0) {
      const pk = TABLE_PK[table];
      const cols = Object.keys(sqliteRows[0]);
      const colSql = cols.map((c) => `"${c}"`).join(", ");
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      const updateCols = cols
        .filter((c) => c !== pk)
        .map((c) => `"${c}" = EXCLUDED."${c}"`)
        .join(", ");
      // Upsert on the primary key so re-running the script is a no-op.
      const sql = `INSERT INTO ${table} (${colSql}) VALUES (${placeholders})
                   ON CONFLICT ("${pk}") DO UPDATE SET ${updateCols}`;

      for (const row of sqliteRows) {
        const values = cols.map((c) => (row[c] === undefined ? null : row[c]));
        await pool.query(sql, values);
      }
      rowReport.pg = sourceCount;
    }

    // Advance the sequence past the highest PK so future inserts don't collide.
    // Tables whose PK is a plain (non-serial) column — e.g. user_prefs.user_id —
    // have no sequence and are skipped.
    const pk = TABLE_PK[table];
    const max = (
      await pool.query(`SELECT COALESCE(MAX("${pk}"), 0) + 1 AS next FROM ${table}`)
    ).rows[0].next;
    const seq = (
      await pool.query(`SELECT pg_get_serial_sequence('${table}', '${pk}') AS seq`)
    ).rows[0].seq;
    if (seq) {
      await pool.query(`SELECT setval($1, $2, false)`, [seq, max]);
    }

    reports[table] = rowReport;
    console.log(
      `  ${table.padEnd(17)} sqlite=${sourceCount}  pg=${rowReport.pg}`
    );
  }

  await pool.end();
  console.log("\nMigration complete. Summary:");
  console.table(reports);
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });