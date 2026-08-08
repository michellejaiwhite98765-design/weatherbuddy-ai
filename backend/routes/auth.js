import { Router } from "express";
import bcrypt from "bcryptjs";
import { createUser, getUserByEmail, getPlan, getPrefs, updatePrefs } from "../data/db.js";
import { requireAuth, signToken } from "../middleware/auth.js";

const router = Router();

function publicUser(user, plan, prefs) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan,
    prefs,
    createdAt: user.created_at,
  };
}

router.post("/signup", async (req, res) => {
  const { email, name, password } = req.body || {};
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedName = String(name || "").trim();

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: "A valid email is required" });
  }
  if (!normalizedName) return res.status(400).json({ error: "Name is required" });
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  if (getUserByEmail(normalizedEmail)) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = createUser({ email: normalizedEmail, name: normalizedName, passwordHash });
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user, getPlan(user.id), getPrefs(user.id)) });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const user = getUserByEmail(normalizedEmail);
  if (!user || !bcrypt.compareSync(password || "", user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const token = signToken(user);
  res.json({ token, user: publicUser(user, getPlan(user.id), getPrefs(user.id)) });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user, getPlan(req.user.id), getPrefs(req.user.id)) });
});

// PUT /api/auth/prefs — update the logged-in user's preferences.
router.put("/prefs", requireAuth, (req, res) => {
  const { notifications, theme, unit } = req.body || {};
  const patch = {};
  if (typeof notifications === "boolean") patch.notifications = notifications ? 1 : 0;
  if (theme === "dark" || theme === "light") patch.theme = theme;
  if (unit === "metric" || unit === "imperial") patch.unit = unit;
  const prefs = updatePrefs(req.user.id, patch);
  res.json({ user: publicUser(req.user, getPlan(req.user.id), prefs) });
});

export default router;
