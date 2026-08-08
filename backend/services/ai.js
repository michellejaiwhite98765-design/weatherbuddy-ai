// Enriched AI layer for WeatherBuddy.
//
// Two sources, one interface:
//   1. A deterministic RULE ENGINE (free, no API key) that turns live
//      weather into natural-language forecasts, outfit picks, an activity
//      plan and a precipitation timeline.
//   2. An OPTIONAL LLM path. When ANTHROPIC_API_KEY (or OPENAI_API_KEY) is
//      present in the backend .env, we ask a real model for the narrative and
//      for chat replies. On any error (bad key, network, timeout) we silently
//      fall back to the rule engine so the product never breaks.

import { recordActivity } from "../data/db.js";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.LLM_MODEL || "claude-opus-5";

// ---------------------------------------------------------------------------
// Rule engine
// ---------------------------------------------------------------------------

function conditionInfo(cond) {
  const map = {
    sunny: { emoji: "☀️", word: "sunny", vibe: "bright and clear" },
    rain: { emoji: "🌧️", word: "rainy", vibe: "wet and damp" },
    clouds: { emoji: "☁️", word: "cloudy", vibe: "overcast" },
    snow: { emoji: "❄️", word: "snowy", vibe: "cold and crisp" },
    night: { emoji: "🌙", word: "clear", vibe: "calm and clear" },
  };
  return map[cond] || map.clouds;
}

// Natural-language forecast paragraph derived from the real numbers.
export function buildForecastNarrative({ current, daily, rainAlert }) {
  const today = daily[0] || { high: current.temp, low: current.temp - 3, rain: 0 };
  const c = conditionInfo(current.condition);
  const feels = Math.abs(current.temp - current.feelsLike) >= 3;

  let comfort;
  if (current.temp >= 34) comfort = "It's genuinely hot — plan around the midday peak.";
  else if (current.temp >= 28) comfort = "Warm enough that you'll want shade around noon.";
  else if (current.temp <= 14) comfort = "It's chilly, so layer up before stepping out.";
  else if (today.rain >= 50) comfort = "Damp but not too cold — a light shell works.";
  else comfort = "Conditions are close to perfect for most plans.";

  const rainLine = today.rain >= 50
    ? `Expect a ${today.rain}% chance of rain through the day, so keep a plan B close.`
    : today.rain >= 20
      ? `A ${today.rain}% chance of showers means a small umbrella won't hurt.`
      : `Rain looks unlikely today (${today.rain}%), so outdoor plans should hold.`;

  const windLine = current.windSpeed >= 25
    ? ` Winds are brisk at ${current.windSpeed} km/h.`
    : current.windSpeed >= 15
      ? ` A light ${current.windSpeed} km/h breeze is in the air.`
      : "";

  const feelsLine = feels
    ? ` It feels like ${current.feelsLike}°C rather than ${current.temp}°C.`
    : "";

  const narrative =
    `${c.emoji} It's a ${c.word} ${c.vibe} day in with a high near ${today.high}°C and a low around ${today.low}°C. ` +
    `${comfort} ${rainLine}${windLine}${feelsLine} ` +
    `The best window to be outside is ${rainAlert.active ? "after the passing showers" : "late morning"} — timing your errands to the sky will make the day feel easier.`;

  return narrative;
}

// Outfit recommendation derived from temp + condition.
export function buildOutfit({ current, daily }) {
  const t = current.temp;
  const today = daily[0] || {};
  const rain = current.condition === "rain" || today.rain >= 50;

  let base;
  if (t >= 33) base = "Lightweight cotton or linen — a breathable tee and shorts.";
  else if (t >= 26) base = "A short-sleeve top and light trousers or skirt.";
  else if (t >= 20) base = "A light jacket or cardigan over a tee.";
  else if (t >= 14) base = "A medium-weight jacket and a jumper underneath.";
  else base = "A warm coat, scarf and layers — it's properly cold.";

  const extras = [];
  if (rain) extras.push("an umbrella or a water-resistant shell");
  if (current.uvIndex >= 7) extras.push("sunglasses and SPF 50");
  if (current.windSpeed >= 25) extras.push("a windproof layer");
  if (extras.length) base += ` Add ${extras.join(", ")}.`;
  return base;
}

// Morning / afternoon / evening activity plan.
export function buildActivityPlan({ current, daily }) {
  const t = current.temp;
  const today = daily[0] || { rain: 0 };
  const rain = today.rain >= 50;

  const slot = (period, cond, fallback) => ({ period, ...cond, fallback });

  const plan = [];
  // Morning
  plan.push(
    slot(
      "Morning",
      rain
        ? { vibe: "Rain chances peak early — keep it indoors.", actions: ["café stop", "gym session", "errands that keep you inside"] }
        : t >= 30
          ? { vibe: "Already warm — move outdoor effort early.", actions: ["morning walk", "errands before the heat", "coffee run"] }
          : { vibe: "Crisp and pleasant for getting going.", actions: ["light jog", "walk to breakfast", "run errands"] },
      "A relaxed start suits the day."
    )
  );
  // Afternoon
  plan.push(
    slot(
      "Afternoon",
      t >= 34
        ? { vibe: "Hottest stretch — avoid direct sun.", actions: ["indoor lunch", "shaded break", "planning work"] }
        : rain
          ? { vibe: "Keep an eye on passing showers.", actions: ["indoor activity", "cinema", "sidewalk café under cover"] }
          : { vibe: "Steady and workable for most plans.", actions: ["lunch out", "meetings", "grocery run"] },
      "A low-key afternoon works."
    )
  );
  // Evening
  plan.push(
    slot(
      "Evening",
      t <= 14
        ? { vibe: "Chilly evening — bundle up.", actions: ["dinner out", "hot drink", "early night"] }
        : rain
          ? { vibe: "Showers may linger into the evening.", actions: ["dinner indoors", "movie night", "read at home"] }
          : current.uvIndex >= 8
            ? { vibe: "Sun sets later and skies are clear.", actions: ["evening stroll", "dinner outdoors", "photography"] }
            : { vibe: "Pleasant for an evening out.", actions: ["evening walk", "dinner", "stargazing"] },
      "A calm evening round-off."
    )
  );

  return plan;
}

// Timeline of rain risk across the day (morning/afternoon/evening buckets).
export function buildPrecipTimeline(hourly) {
  if (!hourly || !hourly.length) return [];
  const buckets = [
    { label: "Morning", hours: [6, 7, 8, 9, 10, 11] },
    { label: "Afternoon", hours: [12, 13, 14, 15, 16, 17] },
    { label: "Evening", hours: [18, 19, 20, 21, 22, 23] },
  ];
  // hourly entries carry a human label ("Now", "1PM"...) — approximate risk by
  // spreading across buckets so the timeline is meaningful without exact times.
  const n = hourly.length;
  const chunk = Math.max(1, Math.ceil(n / 3));
  return buckets.map((b, i) => {
    const slice = hourly.slice(i * chunk, i * chunk + chunk);
    const risk = slice.length ? Math.max(...slice.map((h) => h.rain || 0)) : 0;
    return {
      period: b.label,
      risk,
      level: risk >= 50 ? "High" : risk >= 25 ? "Medium" : "Low",
    };
  });
}

// One-line "day focus" — the single most important takeaway.
export function buildDayFocus({ current, daily, rainAlert }) {
  const today = daily[0] || { rain: 0 };
  if (rainAlert.active) return `Rain arrives in ~${Math.round(rainAlert.etaMinutes / 60)}h — schedule outdoor plans before it lands.`;
  if (today.rain >= 50) return `High chance of rain later — keep an umbrella and a plan B handy.`;
  if (current.temp >= 34) return `Heat peaks this afternoon — do the heavy stuff before noon and stay hydrated.`;
  if (current.uvIndex >= 8) return `UV is extreme today — sunscreen, hat and shade are non-negotiable.`;
  if (current.temp <= 14) return `It's cold out — bundle up in layers before heading outside.`;
  return `A steady, uncomplicated day — your plans should go smoothly.`;
}

// Assemble the full premium forecast bundle from the rule engine.
export function buildRichAIForecast(weather) {
  const { current, daily, hourly, rainAlert } = weather;
  return {
    narrative: buildForecastNarrative(weather),
    outfit: buildOutfit(weather),
    activityPlan: buildActivityPlan(weather),
    precipTimeline: buildPrecipTimeline(hourly),
    dayFocus: buildDayFocus(weather),
    engine: "rules",
  };
}

// ---------------------------------------------------------------------------
// LLM path (optional). Falls back to rules on any failure.
// ---------------------------------------------------------------------------

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

async function callAnthropic(prompt, system) {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 800,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!text) throw new Error("Empty LLM response");
  return text;
}

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

async function callOpenAI(prompt, system) {
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 800,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty LLM response");
  return text;
}

// True when a real LLM provider is configured.
export function llmConfigured() {
  return Boolean(ANTHROPIC_KEY || OPENAI_KEY);
}

// Forecast narrative via LLM (falls back to the rule engine).
export async function aiForecastNarrative(weather) {
  if (!llmConfigured()) return null;
  const ctx = weatherForPrompt(weather);
  try {
    const prompt = `Write 2-3 friendly sentences summarizing today's weather for a local resident. Use this real data:\n${ctx}\nKeep it natural, specific and useful.`;
    const text = ANTHROPIC_KEY
      ? await callAnthropic(prompt, "You are a concise weather narrator for a weather app. No markdown, no emoji-heavy text.")
      : await callOpenAI(prompt, "You are a concise weather narrator for a weather app. No markdown, no emoji-heavy text.");
    return text;
  } catch (err) {
    console.error("LLM narrative failed, using rules:", err.message);
    return null;
  }
}

// Chat reply via LLM (falls back to a rule-based answer).
export async function aiChat(userMessage, weather) {
  const ctx = weather ? weatherForPrompt(weather) : "No live weather data available.";
  const system =
    "You are WeatherBuddy, a helpful weather assistant. Answer the user's question about weather, activities, or what to wear based on the provided live data. Be concise and friendly. If data is missing, say so plainly.";

  // LLM path
  if (llmConfigured()) {
    try {
      const prompt = `Live weather data:\n${ctx}\n\nUser asks: ${userMessage}`;
      const text = ANTHROPIC_KEY
        ? await callAnthropic(prompt, system)
        : await callOpenAI(prompt, system);
      return { text, engine: "llm" };
    } catch (err) {
      console.error("LLM chat failed, using rules:", err.message);
    }
  }

  // Rule fallback
  return { text: ruleChatReply(userMessage, weather), engine: "rules" };
}

// Quick rule-based reply that actually references the live numbers.
function ruleChatReply(message, weather) {
  const q = String(message || "").toLowerCase();
  const cur = weather?.current;
  if (!cur) return "I don't have live data right now, but I'm happy to help once the forecast is ready.";

  if (q.includes("wear") || q.includes("outfit") || q.includes("dress") || q.includes("clothes"))
    return buildOutfit(weather);
  if (q.includes("rain") || q.includes("umbrella"))
    return weather.rainAlert?.active
      ? `Yes — rain is expected in about ${Math.round(weather.rainAlert.etaMinutes / 60)}h. Keep an umbrella close.`
      : `No rain expected in the next few hours, so you're clear for outdoor plans.`;
  if (q.includes("outdoor") || q.includes("outside") || q.includes("activity") || q.includes("today"))
    return `Right now it's ${cur.temp}°C and ${cur.condition}. ${buildDayFocus(weather)}`;
  if (q.includes("hot") || q.includes("warm"))
    return cur.temp >= 30 ? `Yes, it's warm at ${cur.temp}°C — hydrate and stay in shade at midday.` : `It's a comfortable ${cur.temp}°C right now — not too hot.`;
  if (q.includes("cold") || q.includes("cool"))
    return cur.temp <= 14 ? `It's chilly at ${cur.temp}°C — layer up before heading out.` : `It's a mild ${cur.temp}°C — no heavy coat needed.`;
  if (q.includes("hi") || q.includes("hello") || q.includes("hey"))
    return `Hello! It's ${cur.temp}°C and ${cur.condition} where you are right now. Ask me what to wear, whether rain is coming, or about outdoor plans.`;

  return buildDayFocus(weather);
}

// Compact weather context for the LLM prompt.
function weatherForPrompt({ current, daily, rainAlert }) {
  const today = daily?.[0];
  return [
    `City: ${current.city || "your location"}`,
    `Current: ${current.temp}°C, feels like ${current.feelsLike}°C, ${current.condition}, humidity ${current.humidity}%, wind ${current.windSpeed} km/h, UV ${current.uvIndex}, AQI ${current.aqi}`,
    today
      ? `Today: high ${today.high}°C, low ${today.low}°C, rain chance ${today.rain}%`
      : "Today: n/a",
    rainAlert
      ? `Rain alert: ${rainAlert.active ? `active, in ~${Math.round(rainAlert.etaMinutes / 60)}h` : "inactive"}`
      : "Rain alert: n/a",
  ].join("\n");
}

// Persist one chat turn to the DB and return the stored log.
export async function logChatTurn(userId, { message, reply, engine }) {
  const id = recordActivity(userId, {
    type: "chat",
    message,
    reply,
    engine,
  });
  return id;
}
