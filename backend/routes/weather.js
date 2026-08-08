import { Router } from "express";
import {
  geocode,
  getWeatherForCity,
  buildAISummary,
  buildInsights,
  buildRainAlert,
} from "../services/weather.js";
import {
  getPlan,
  getFavorites,
  addFavorite,
  removeFavorite,
  getNotifications,
  addNotification,
  getWeatherHistory,
} from "../data/db.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

const router = Router();

const RAINVIEWER_API = "https://api.rainviewer.com/public/weather-maps.json";

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

function isPremium(plan) {
  return plan !== "free";
}

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    tagline: "The essentials, always on the house.",
    features: ["3 saved cities", "Hourly & 7-day forecast", "Basic alerts", "Ads supported"],
  },
  {
    id: "premium",
    name: "Premium",
    price: 4.99,
    tagline: "For people who plan their day around the sky.",
    features: ["Unlimited cities", "AI weather summary", "Live radar", "Rain & storm alerts", "No ads"],
    highlight: true,
  },
  {
    id: "premium_plus",
    name: "Premium Plus",
    price: 9.99,
    tagline: "Deeper insight, sharper alerts.",
    features: ["Everything in Premium", "Lightning alerts", "Weather history & timeline", "AI recommendations", "Home & lock screen widgets"],
  },
  {
    id: "family",
    name: "Family",
    price: 14.99,
    tagline: "Share the forecast with up to 6 people.",
    features: ["Everything in Premium Plus", "6 family members", "Shared favorite cities", "Priority support"],
  },
];

// Parse a location from ?city= or ?lat=&lon=
function parseLocation(req) {
  const city = req.query.city;
  const lat = req.query.lat ? parseFloat(req.query.lat) : null;
  const lon = req.query.lon ? parseFloat(req.query.lon) : null;
  return { city, lat, lon };
}

// GET /api/weather/home — core dashboard. Premium fields gated by plan.
router.get("/home", optionalAuth, async (req, res) => {
  try {
    const { city, lat, lon } = parseLocation(req);
    const plan = getPlan(req.user?.id);
    const premium = isPremium(plan);
    const data = await getWeatherForCity(city || "Nagercoil", { lat, lon });
    const rainAlert = buildRainAlert(data.hourly);

    const payload = {
      location: data.location,
      current: { ...data.current, city: data.location.name, country: data.location.country },
      hourly: data.hourly,
      daily: data.daily,
      rainAlert,
      airQuality: data.airQuality,
      sun: data.sun,
      plan,
      premium,
    };

    // Premium-only: AI summary + smart insights. Returned only to premium users.
    if (premium) {
      payload.aiSummary = buildAISummary({ ...data, rainAlert });
      payload.insights = buildInsights(data);
    }

    await delay(120);
    res.json(payload);
  } catch (err) {
    console.error("home error:", err.message);
    res.status(502).json({ error: "Could not fetch weather right now. Please try again." });
  }
});

// GET /api/weather/current — lightweight current conditions.
router.get("/current", optionalAuth, async (req, res) => {
  try {
    const { city, lat, lon } = parseLocation(req);
    const data = await getWeatherForCity(city || "Nagercoil", { lat, lon });
    res.json({ ...data.current, city: data.location.name, country: data.location.country });
  } catch (err) {
    res.status(502).json({ error: "Could not fetch weather right now." });
  }
});

// GET /api/weather/history — recent snapshots for a city (premium). Used for the
// temperature sparkline. Returns chronological [{ temp, condition, recorded_at }].
router.get("/history", optionalAuth, async (req, res) => {
  const plan = getPlan(req.user?.id);
  if (!isPremium(plan)) {
    return res.status(403).json({ error: "Weather history is a Premium feature." });
  }
  const { city, lat, lon } = parseLocation(req);
  const name = city || "Nagercoil";
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 4), 168);
  // If we haven't persisted snapshots for this city yet, fetch a forecast to seed
  // the history (getWeatherForCity records a throttled snapshot on its own), so
  // the chart is never empty on first load.
  const rows = getWeatherHistory(name, limit);
  if (rows.length === 0) {
    try {
      await getWeatherForCity(name, { lat, lon });
    } catch {
      // ignore — return whatever we have
    }
  }
  res.json({ city: name, history: getWeatherHistory(name, limit) });
});

// GET /api/weather/search — real geocoding search.
router.get("/search", async (req, res) => {
  try {
    const q = req.query.q || "";
    const results = await geocode(q, 6);
    res.json({ query: q, results });
  } catch (err) {
    res.status(502).json({ error: "Search is unavailable right now." });
  }
});

// GET /api/weather/radar — live radar frames (RainViewer, no key). Premium only.
router.get("/radar", optionalAuth, async (req, res) => {
  const plan = getPlan(req.user?.id);
  if (!isPremium(plan)) {
    return res.status(403).json({ error: "Live radar is a Premium feature." });
  }
  try {
    const { city, lat, lon } = parseLocation(req);
    const data = await getWeatherForCity(city || "Nagercoil", { lat, lon });
    const rv = await fetch(RAINVIEWER_API).then((r) => r.json());
    const frames = [...(rv.radar?.past || []), ...(rv.radar?.nowcast || [])]
      .map((f) => ({ time: f.time, path: f.path }));
    res.json({
      host: rv.host,
      frames,
      location: data.location,
      premium: true,
    });
  } catch (err) {
    res.status(502).json({ error: "Radar is unavailable right now." });
  }
});

// GET /api/weather/favorites — the logged-in user's saved cities (with live temp).
router.get("/favorites", optionalAuth, async (req, res) => {
  if (!req.user) return res.json([]);
  const favorites = getFavorites(req.user.id);
  const enriched = await Promise.all(
    favorites.map(async (f) => {
      try {
        const data = await getWeatherForCity(f.city, { lat: f.lat, lon: f.lon });
        return { id: f.id, city: f.city, country: data.location.country, temp: data.current.temp, condition: data.current.condition };
      } catch {
        return { id: f.id, city: f.city, country: f.country, temp: null, condition: null };
      }
    })
  );
  res.json(enriched);
});

// POST /api/weather/favorites — save a city.
router.post("/favorites", requireAuth, async (req, res) => {
  const { city, country, lat, lon } = req.body || {};
  if (!city) return res.status(400).json({ error: "city is required" });
  addFavorite(req.user.id, { city, country, lat, lon });
  res.json({ ok: true, favorites: getFavorites(req.user.id) });
});

// DELETE /api/weather/favorites/:city — remove a saved city.
router.delete("/favorites/:city", requireAuth, (req, res) => {
  removeFavorite(req.user.id, req.params.city);
  res.json({ ok: true, favorites: getFavorites(req.user.id) });
});

// GET /api/weather/notifications — per-user, seeded from live conditions.
router.get("/notifications", optionalAuth, async (req, res) => {
  if (!req.user) return res.json([]);
  const existing = getNotifications(req.user.id);
  if (existing.length === 0) {
    try {
      const data = await getWeatherForCity("Nagercoil");
      const rainAlert = buildRainAlert(data.hourly);
      const t = (m) => `${m} min ago`;
      if (rainAlert.active) {
        addNotification(req.user.id, { type: "rain", title: "Rain Alert", message: `Rain expected in ~${Math.round(rainAlert.etaMinutes / 60)}h near Nagercoil.`, time: t(2) });
      }
      if (data.current.temp >= 30) {
        addNotification(req.user.id, { type: "heat", title: "Heat Advisory", message: `Temperatures may reach ${data.daily[0].high}°C this afternoon.`, time: t(60) });
      }
      addNotification(req.user.id, { type: "news", title: "Weather News", message: "Your personalized forecast is ready.", time: t(15) });
    } catch {
      // ignore seed failures
    }
  }
  res.json(getNotifications(req.user.id));
});

// GET /api/weather/plans
router.get("/plans", (req, res) => {
  res.json(PLANS);
});

export default router;
