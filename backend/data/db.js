import pg from "pg";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse BIGINT/BIGSERIAL columns (row ids, FKs, counts) back to JS numbers so the
// API shape matches the old SQLite driver, which always returned numeric ids.
pg.types.setTypeParser(20, (v) => parseInt(v, 10));

const connectionString = process.env.DATABASE_URL;

// Backend selection:
//  - When DATABASE_URL is present we use PostgreSQL (async).
//  - Otherwise we fall back to the original SQLite file and keep all its /data
//    persistence behaviour, so the app still runs unchanged without a PG URL.
const pool = connectionString ? new pg.Pool({ connectionString }) : null;

// ---------------------------------------------------------------------------
// PostgreSQL schema (mirrors the SQLite schema 1:1; TEXT timestamps so the
// exact "YYYY-MM-DD HH:MM:SS" values keep round-tripping identically).
// ---------------------------------------------------------------------------
async function ensurePgSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      plan_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      stripe_customer_id TEXT,
      current_period_end TEXT,
      created_at TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
      UNIQUE (user_id),
      CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_prefs (
      user_id BIGINT PRIMARY KEY,
      notifications INTEGER NOT NULL DEFAULT 1,
      theme TEXT NOT NULL DEFAULT 'dark',
      unit TEXT NOT NULL DEFAULT 'metric',
      CONSTRAINT fk_user_prefs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      city TEXT NOT NULL,
      country TEXT,
      lat DOUBLE PRECISION,
      lon DOUBLE PRECISION,
      UNIQUE (user_id, city),
      CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      time TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
      CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_activities (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      type TEXT NOT NULL,
      message TEXT,
      reply TEXT NOT NULL,
      engine TEXT NOT NULL DEFAULT 'rules',
      created_at TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
      CONSTRAINT fk_ai_activities_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS weather_history (
      id BIGSERIAL PRIMARY KEY,
      city TEXT NOT NULL,
      country TEXT,
      lat DOUBLE PRECISION,
      lon DOUBLE PRECISION,
      temp DOUBLE PRECISION NOT NULL,
      feels_like DOUBLE PRECISION,
      condition TEXT,
      humidity DOUBLE PRECISION,
      wind_speed DOUBLE PRECISION,
      uv_index DOUBLE PRECISION,
      aqi DOUBLE PRECISION,
      recorded_at TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
    );

    CREATE INDEX IF NOT EXISTS idx_weather_history_city_time ON weather_history (city, id);
  `);
}

// ---------------------------------------------------------------------------
// SQLite (fallback) — original schema, created only when no DATABASE_URL is set.
// ---------------------------------------------------------------------------
let db = null;
if (!pool) {
  // In production the SQLite file lives in a dedicated data dir (`/data` by
  // default) so it can sit on a Railway persistent Volume. The DB is kept OUT of
  // backend/data because that folder also holds this module's source (db.js,
  // mock.js) — a volume mounted there would shadow them and break the app.
  // Dev keeps the DB in backend/data as before. Override with DB_DIR.
  const dbDir =
    process.env.DB_DIR || (process.env.NODE_ENV === "production" ? "/data" : __dirname);
  fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, "weatherbuddy.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      stripe_customer_id TEXT,
      current_period_end TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id)
    );
    CREATE TABLE IF NOT EXISTS user_prefs (
      user_id INTEGER PRIMARY KEY,
      notifications INTEGER NOT NULL DEFAULT 1,
      theme TEXT NOT NULL DEFAULT 'dark',
      unit TEXT NOT NULL DEFAULT 'metric'
    );
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      city TEXT NOT NULL,
      country TEXT,
      lat REAL,
      lon REAL,
      UNIQUE(user_id, city)
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      time TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS ai_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      message TEXT,
      reply TEXT NOT NULL,
      engine TEXT NOT NULL DEFAULT 'rules',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS weather_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city TEXT NOT NULL,
      country TEXT,
      lat REAL,
      lon REAL,
      temp REAL NOT NULL,
      feels_like REAL,
      condition TEXT,
      humidity REAL,
      wind_speed REAL,
      uv_index REAL,
      aqi REAL,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_weather_history_city_time ON weather_history(city, id);
  `);
}

if (pool) await ensurePgSchema();

// Free tier: a not-logged-in user is treated as a "free" plan.
export async function getUserByEmail(email) {
  if (pool) {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    return rows[0] || null;
  }
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email) || null;
}

export async function getUserById(id) {
  if (pool) {
    const { rows } = await pool.query(
      "SELECT id, email, name, created_at FROM users WHERE id = $1",
      [id]
    );
    return rows[0] || null;
  }
  return db.prepare("SELECT id, email, name, created_at FROM users WHERE id = ?").get(id) || null;
}

export async function createUser({ email, name, passwordHash }) {
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const u = await client.query(
        "INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name, created_at",
        [email, name, passwordHash]
      );
      const id = u.rows[0].id;
      await client.query("INSERT INTO user_prefs (user_id) VALUES ($1)", [id]);
      await client.query(
        "INSERT INTO subscriptions (user_id, plan_id, status) VALUES ($1, 'free', 'active')",
        [id]
      );
      await client.query("COMMIT");
      return u.rows[0];
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
  const info = db
    .prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)")
    .run(email, name, passwordHash);
  const id = info.lastInsertRowid;
  db.prepare("INSERT INTO user_prefs (user_id) VALUES (?)").run(id);
  db.prepare("INSERT INTO subscriptions (user_id, plan_id, status) VALUES (?, 'free', 'active')").run(id);
  return getUserById(id);
}

export async function getPlan(userId) {
  if (!userId) return "free";
  if (pool) {
    const { rows } = await pool.query(
      "SELECT plan_id FROM subscriptions WHERE user_id = $1 AND status = 'active'",
      [userId]
    );
    return rows[0] ? rows[0].plan_id : "free";
  }
  const row = db
    .prepare("SELECT plan_id FROM subscriptions WHERE user_id = ? AND status = 'active'")
    .get(userId);
  return row ? row.plan_id : "free";
}

export async function setPlan(userId, planId, opts = {}) {
  const { stripeCustomerId, currentPeriodEnd } = opts;
  if (pool) {
    await pool.query(
      `INSERT INTO subscriptions (user_id, plan_id, status, stripe_customer_id, current_period_end)
       VALUES ($1, $2, 'active', $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         plan_id = EXCLUDED.plan_id,
         status = 'active',
         stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, subscriptions.stripe_customer_id),
         current_period_end = EXCLUDED.current_period_end`,
      [userId, planId, stripeCustomerId || null, currentPeriodEnd || null]
    );
    return;
  }
  const existing = db.prepare("SELECT id FROM subscriptions WHERE user_id = ?").get(userId);
  if (existing) {
    db.prepare(
      "UPDATE subscriptions SET plan_id = ?, status = 'active', stripe_customer_id = COALESCE(?, stripe_customer_id), current_period_end = ? WHERE user_id = ?"
    ).run(planId, stripeCustomerId || null, currentPeriodEnd || null, userId);
  } else {
    db.prepare(
      "INSERT INTO subscriptions (user_id, plan_id, status, stripe_customer_id, current_period_end) VALUES (?, ?, 'active', ?, ?)"
    ).run(userId, planId, stripeCustomerId || null, currentPeriodEnd || null);
  }
}

export async function getPrefs(userId) {
  const defaults = { notifications: 1, theme: "dark", unit: "metric" };
  if (pool) {
    const { rows } = await pool.query("SELECT * FROM user_prefs WHERE user_id = $1", [userId]);
    return rows[0] || defaults;
  }
  return db.prepare("SELECT * FROM user_prefs WHERE user_id = ?").get(userId) || defaults;
}

export async function updatePrefs(userId, patch) {
  if (pool) {
    const prefs = await getPrefs(userId);
    const next = { ...prefs, ...patch };
    await pool.query(
      `INSERT INTO user_prefs (user_id, notifications, theme, unit)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         notifications = EXCLUDED.notifications,
         theme = EXCLUDED.theme,
         unit = EXCLUDED.unit`,
      [userId, next.notifications ? 1 : 0, next.theme, next.unit]
    );
    return getPrefs(userId);
  }
  const prefs = await getPrefs(userId);
  const next = { ...prefs, ...patch };
  db.prepare(
    "INSERT INTO user_prefs (user_id, notifications, theme, unit) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET notifications=excluded.notifications, theme=excluded.theme, unit=excluded.unit"
  ).run(userId, next.notifications ? 1 : 0, next.theme, next.unit);
  return getPrefs(userId);
}

export async function getFavorites(userId) {
  if (pool) {
    const { rows } = await pool.query(
      "SELECT id, city, country, lat, lon FROM favorites WHERE user_id = $1 ORDER BY id ASC",
      [userId]
    );
    return rows;
  }
  return db
    .prepare("SELECT id, city, country, lat, lon FROM favorites WHERE user_id = ? ORDER BY id ASC")
    .all(userId);
}

export async function addFavorite(userId, fav) {
  if (pool) {
    await pool.query(
      "INSERT INTO favorites (user_id, city, country, lat, lon) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, city) DO NOTHING",
      [userId, fav.city, fav.country || "", fav.lat ?? null, fav.lon ?? null]
    );
    return;
  }
  db.prepare(
    "INSERT INTO favorites (user_id, city, country, lat, lon) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, city) DO NOTHING"
  ).run(userId, fav.city, fav.country || "", fav.lat ?? null, fav.lon ?? null);
}

export async function removeFavorite(userId, city) {
  if (pool) {
    await pool.query("DELETE FROM favorites WHERE user_id = $1 AND city = $2", [userId, city]);
    return;
  }
  db.prepare("DELETE FROM favorites WHERE user_id = ? AND city = ?").run(userId, city);
}

export async function addNotification(userId, notif) {
  if (pool) {
    await pool.query(
      "INSERT INTO notifications (user_id, type, title, message, time) VALUES ($1, $2, $3, $4, $5)",
      [userId, notif.type, notif.title, notif.message, notif.time]
    );
    return;
  }
  db.prepare(
    "INSERT INTO notifications (user_id, type, title, message, time) VALUES (?, ?, ?, ?, ?)"
  ).run(userId, notif.type, notif.title, notif.message, notif.time);
}

export async function getNotifications(userId) {
  if (pool) {
    const { rows } = await pool.query(
      "SELECT id, type, title, message, time FROM notifications WHERE user_id = $1 ORDER BY id DESC",
      [userId]
    );
    return rows;
  }
  return db
    .prepare("SELECT id, type, title, message, time FROM notifications WHERE user_id = ? ORDER BY id DESC")
    .all(userId);
}

// --- AI activities (chat + generated forecasts) ---

export async function recordActivity(userId, { type, message = null, reply, engine = "rules" }) {
  if (pool) {
    const { rows } = await pool.query(
      "INSERT INTO ai_activities (user_id, type, message, reply, engine) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [userId, type, message, reply, engine]
    );
    return rows[0].id;
  }
  const info = db
    .prepare("INSERT INTO ai_activities (user_id, type, message, reply, engine) VALUES (?, ?, ?, ?, ?)")
    .run(userId, type, message, reply, engine);
  return info.lastInsertRowid;
}

export async function getActivities(userId, limit = 20) {
  if (pool) {
    const { rows } = await pool.query(
      "SELECT id, type, message, reply, engine, created_at FROM ai_activities WHERE user_id = $1 ORDER BY id DESC LIMIT $2",
      [userId, limit]
    );
    return rows;
  }
  return db
    .prepare("SELECT id, type, message, reply, engine, created_at FROM ai_activities WHERE user_id = ? ORDER BY id DESC LIMIT ?")
    .all(userId, limit);
}

// --- Weather history snapshots (for sparklines / history view) ---

export async function recordWeatherSnapshot(snap) {
  if (pool) {
    await pool.query(
      `INSERT INTO weather_history
         (city, country, lat, lon, temp, feels_like, condition, humidity, wind_speed, uv_index, aqi)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        snap.city, snap.country || "", snap.lat ?? null, snap.lon ?? null,
        snap.temp, snap.feels_like ?? null, snap.condition ?? null,
        snap.humidity ?? null, snap.wind_speed ?? null,
        snap.uv_index ?? null, snap.aqi ?? null,
      ]
    );
    return;
  }
  db.prepare(
    `INSERT INTO weather_history
       (city, country, lat, lon, temp, feels_like, condition, humidity, wind_speed, uv_index, aqi)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    snap.city, snap.country || "", snap.lat ?? null, snap.lon ?? null,
    snap.temp, snap.feels_like ?? null, snap.condition ?? null,
    snap.humidity ?? null, snap.wind_speed ?? null,
    snap.uv_index ?? null, snap.aqi ?? null
  );
}

export async function getWeatherHistory(city, limit = 24) {
  let rows;
  if (pool) {
    const r = await pool.query(
      "SELECT temp, condition, recorded_at FROM weather_history WHERE city = $1 ORDER BY id DESC LIMIT $2",
      [city, limit]
    );
    rows = r.rows;
  } else {
    rows = db
      .prepare(
        `SELECT temp, condition, recorded_at FROM weather_history
         WHERE city = ? ORDER BY id DESC LIMIT ?`
      )
      .all(city, limit);
  }
  return rows.reverse(); // oldest -> newest for a chronological sparkline
}

export default db;