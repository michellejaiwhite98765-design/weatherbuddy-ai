import { Router } from "express";
import { getWeatherForCity, buildRainAlert } from "../services/weather.js";
import {
  buildRichAIForecast,
  aiForecastNarrative,
  aiChat,
  llmConfigured,
  logChatTurn,
} from "../services/ai.js";
import { getPlan, getActivities } from "../data/db.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

const router = Router();

function isPremium(plan) {
  return plan !== "free";
}

// GET /api/ai/forecast — premium AI forecast for a city (rules always, LLM when keyed).
router.get("/forecast", optionalAuth, async (req, res) => {
  let plan;
  try {
    plan = await getPlan(req.user?.id);
  } catch (err) {
    console.error("AI forecast db error:", err.message);
    return res.status(500).json({ error: "Could not check your plan." });
  }
  if (!isPremium(plan)) {
    return res.status(403).json({ error: "AI forecast is a Premium feature." });
  }
  try {
    const city = req.query.city;
    const lat = req.query.lat ? parseFloat(req.query.lat) : null;
    const lon = req.query.lon ? parseFloat(req.query.lon) : null;
    const data = await getWeatherForCity(city || "Nagercoil", { lat, lon });
    const weather = { ...data, rainAlert: buildRainAlert(data.hourly) };

    const forecast = buildRichAIForecast(weather);
    // If an LLM is configured, refresh the headline narrative with it.
    if (llmConfigured()) {
      const llmText = await aiForecastNarrative(weather);
      if (llmText) {
        forecast.narrative = llmText;
        forecast.engine = "llm";
      }
    }
    res.json({ location: data.location, ...forecast });
  } catch (err) {
    console.error("AI forecast error:", err.message);
    res.status(502).json({ error: "Could not build the AI forecast right now." });
  }
});

// POST /api/ai/chat — conversational AI. Logs every turn for the user.
router.post("/chat", requireAuth, async (req, res) => {
  let plan;
  try {
    plan = await getPlan(req.user.id);
  } catch (err) {
    console.error("AI chat db error:", err.message);
    return res.status(500).json({ error: "Could not check your plan." });
  }
  if (!isPremium(plan)) {
    return res.status(403).json({ error: "AI chat is a Premium feature." });
  }
  const message = String(req.body?.message || "").trim();
  if (!message) return res.status(400).json({ error: "message is required" });

  try {
    const city = req.body.city;
    const lat = req.body.lat ? parseFloat(req.body.lat) : null;
    const lon = req.body.lon ? parseFloat(req.body.lon) : null;
    let weather = null;
    try {
      const data = await getWeatherForCity(city || "Nagercoil", { lat, lon });
      weather = { ...data, rainAlert: buildRainAlert(data.hourly) };
    } catch {
      weather = null; // chat still works without live data
    }

    const { text, engine } = await aiChat(message, weather);
    await logChatTurn(req.user.id, { type: "chat", message, reply: text, engine });
    res.json({ reply: text, engine });
  } catch (err) {
    console.error("AI chat error:", err.message);
    res.status(502).json({ error: "Could not get an AI reply right now." });
  }
});

// GET /api/ai/activity — the user's own AI usage history.
router.get("/activity", requireAuth, async (req, res) => {
  try {
    res.json({ activities: await getActivities(req.user.id) });
  } catch (err) {
    console.error("AI activity db error:", err.message);
    res.status(500).json({ error: "Could not load activity." });
  }
});

export default router;