import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In production the SQLite file lives in a dedicated data dir (`/data` by
// default) so it can sit on a Railway persistent Volume. The DB is kept OUT of
// backend/data because that folder also holds this module's source (db.js,
// mock.js) — a volume mounted there would shadow them and break the app.
// Dev keeps the DB in backend/data as before. Override with DB_DIR.
const dbDir =
  process.env.DB_DIR || (process.env.NODE_ENV === "production" ? "/data" : __dirname);
fs.mkdirSync(dbDir, { recursive: true });
const dbPath = path.join(dbDir, "weatherbuddy.db");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// Schema: users, subscriptions, user_prefs, notifications
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
    UNIQUE(user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_prefs (
    user_id INTEGER PRIMARY KEY,
    notifications INTEGER NOT NULL DEFAULT 1,
    theme TEXT NOT NULL DEFAULT 'dark',
    unit TEXT NOT NULL DEFAULT 'metric',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    city TEXT NOT NULL,
    country TEXT,
    lat REAL,
    lon REAL,
    UNIQUE(user_id, city),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    time TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ai_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    message TEXT,
    reply TEXT NOT NULL,
    engine TEXT NOT NULL DEFAULT 'rules',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

// Free tier: a not-logged-in user is treated as a "free" plan.
export function getUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
}

export function getUserById(id) {
  return db.prepare("SELECT id, email, name, created_at FROM users WHERE id = ?").get(id);
}

export function createUser({ email, name, passwordHash }) {
  const info = db
    .prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)")
    .run(email, name, passwordHash);
  const id = info.lastInsertRowid;
  // Default preferences
  db.prepare("INSERT INTO user_prefs (user_id) VALUES (?)").run(id);
  // New users start on the free plan
  db.prepare("INSERT INTO subscriptions (user_id, plan_id, status) VALUES (?, 'free', 'active')").run(id);
  return getUserById(id);
}

export function getPlan(userId) {
  if (!userId) return "free";
  const row = db
    .prepare("SELECT plan_id FROM subscriptions WHERE user_id = ? AND status = 'active'")
    .get(userId);
  return row ? row.plan_id : "free";
}

export function setPlan(userId, planId, opts = {}) {
  const { stripeCustomerId, currentPeriodEnd } = opts;
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

export function getPrefs(userId) {
  const row = db.prepare("SELECT * FROM user_prefs WHERE user_id = ?").get(userId);
  return (
    row || { notifications: 1, theme: "dark", unit: "metric" }
  );
}

export function updatePrefs(userId, patch) {
  const prefs = getPrefs(userId);
  const next = { ...prefs, ...patch };
  db.prepare(
    "INSERT INTO user_prefs (user_id, notifications, theme, unit) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET notifications=excluded.notifications, theme=excluded.theme, unit=excluded.unit"
  ).run(userId, next.notifications ? 1 : 0, next.theme, next.unit);
  return getPrefs(userId);
}

export function getFavorites(userId) {
  return db
    .prepare("SELECT id, city, country, lat, lon FROM favorites WHERE user_id = ? ORDER BY id ASC")
    .all(userId);
}

export function addFavorite(userId, fav) {
  db.prepare(
    "INSERT INTO favorites (user_id, city, country, lat, lon) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, city) DO NOTHING"
  ).run(userId, fav.city, fav.country || "", fav.lat ?? null, fav.lon ?? null);
}

export function removeFavorite(userId, city) {
  db.prepare("DELETE FROM favorites WHERE user_id = ? AND city = ?").run(userId, city);
}

export function addNotification(userId, notif) {
  db.prepare(
    "INSERT INTO notifications (user_id, type, title, message, time) VALUES (?, ?, ?, ?, ?)"
  ).run(userId, notif.type, notif.title, notif.message, notif.time);
}

export function getNotifications(userId) {
  return db
    .prepare("SELECT id, type, title, message, time FROM notifications WHERE user_id = ? ORDER BY id DESC")
    .all(userId);
}

// --- AI activities (chat + generated forecasts) ---

export function recordActivity(userId, { type, message = null, reply, engine = "rules" }) {
  const info = db
    .prepare("INSERT INTO ai_activities (user_id, type, message, reply, engine) VALUES (?, ?, ?, ?, ?)")
    .run(userId, type, message, reply, engine);
  return info.lastInsertRowid;
}

export function getActivities(userId, limit = 20) {
  return db
    .prepare("SELECT id, type, message, reply, engine, created_at FROM ai_activities WHERE user_id = ? ORDER BY id DESC LIMIT ?")
    .all(userId, limit);
}

// --- Weather history snapshots (for sparklines / history view) ---

export function recordWeatherSnapshot(snap) {
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

export function getWeatherHistory(city, limit = 24) {
  return db
    .prepare(
      `SELECT temp, condition, recorded_at FROM weather_history
       WHERE city = ? ORDER BY id DESC LIMIT ?`
    )
    .all(city, limit)
    .reverse(); // oldest -> newest for a chronological sparkline
}

export default db;
