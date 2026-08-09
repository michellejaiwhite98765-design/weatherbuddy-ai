// Live weather from Open-Meteo (free, no API key required).
// https://open-meteo.com/en/docs
//
// Provides: geocoding (search), current/hourly/daily forecast, air quality,
// and a server-side generated "AI summary" derived from the real data.
import { recordWeatherSnapshot } from "../data/db.js";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

// Nagercoil fallback (used when no city is resolvable).
const DEFAULT_LOCATION = { name: "Nagercoil", country: "India", lat: 8.1772, lon: 77.4247 };

// WMO weather code -> our condition vocabulary (sunny | rain | clouds | snow | night)
function condition(code, isDay = true) {
  if (code === 0) return isDay ? "sunny" : "night";
  if (code === 1 || code === 2) return isDay ? "sunny" : "night";
  if (code === 3 || code === 45 || code === 48) return "clouds";
  if (code >= 51 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code === 80 || code === 81 || code === 82) return "rain";
  if (code === 85 || code === 86) return "snow";
  if (code >= 95) return "rain";
  return "clouds";
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Upstream ${res.status}`);
  return res.json();
}

// Search a city by name via Open-Meteo geocoding.
export async function geocode(query, limit = 5) {
  const q = String(query || "").trim();
  if (!q) return [];
  const url = `${GEO_URL}?name=${encodeURIComponent(q)}&count=${limit}&language=en&format=json`;
  const data = await fetchJson(url);
  return (data.results || []).map((r) => ({
    id: `${r.name}-${r.country}-${r.latitude}-${r.longitude}`,
    name: r.name,
    country: r.country || "",
    admin1: r.admin1 || "",
    lat: r.latitude,
    lon: r.longitude,
  }));
}

function aqiLevel(aqi) {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  return "Very Unhealthy";
}

// Pull current + hourly + daily + air quality for a lat/lon.
export async function getForecast(lat, lon) {
  const forecastUrl =
    `${FORECAST_URL}?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,visibility,uv_index,is_day` +
    `&hourly=temperature_2m,precipitation_probability,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset` +
    `&timezone=auto`;
  const airUrl = `${AIR_URL}?latitude=${lat}&longitude=${lon}&current=us_aqi`;

  const [f, air] = await Promise.all([fetchJson(forecastUrl), fetchJson(airUrl)]);

  const c = f.current;
  const hourly = f.hourly || {};
  const daily = f.daily || {};

  const aqi = air?.current?.us_aqi ?? 45;
  const uv = c.uv_index ?? 5;

  const isDay = c.is_day === 1;
  const current = {
    temp: Math.round(c.temperature_2m),
    feelsLike: Math.round(c.apparent_temperature),
    condition: condition(c.weather_code, isDay),
    isDay,
    humidity: Math.round(c.relative_humidity_2m),
    windSpeed: Math.round(c.wind_speed_10m),
    visibility: Math.round((c.visibility || 10000) / 1000),
    uvIndex: uv,
    aqi,
    fetchedAt: new Date().toISOString(),
  };

  // Next 10 hourly entries with human labels (Now, 1PM, 2PM ...)
  const now = new Date();
  const hourlyList = (hourly.time || []).slice(0, 10).map((t, i) => {
    const time = new Date(t);
    const label = i === 0 ? "Now" : time.toLocaleTimeString([], { hour: "numeric", hour12: true }).replace(/\s/g, "");
    return {
      time: label,
      temp: Math.round(hourly.temperature_2m[i]),
      condition: condition(hourly.weather_code[i]),
      rain: hourly.precipitation_probability?.[i] ?? 0,
    };
  });

  // 7-day forecast
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dailyList = (daily.time || []).slice(0, 7).map((t, i) => {
    const d = new Date(t);
    return {
      day: i === 0 ? "Today" : dayNames[d.getDay()],
      high: Math.round(daily.temperature_2m_max[i]),
      low: Math.round(daily.temperature_2m_min[i]),
      rain: daily.precipitation_probability_max?.[i] ?? 0,
      condition: condition(daily.weather_code[i]),
    };
  });

  const airQuality = {
    aqi,
    level: aqiLevel(aqi),
    advice: aqi > 100
      ? "Sensitive groups should limit prolonged outdoor exertion."
      : "Air quality is fine for most people today.",
    pollen: "Medium",
    uv,
  };

  const sunrise = daily.sunrise?.[0] ? new Date(daily.sunrise[0]) : null;
  const sunset = daily.sunset?.[0] ? new Date(daily.sunset[0]) : null;
  const fmt = (d) =>
    d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }) : "—";

  const sun = {
    sunrise: fmt(sunrise),
    sunset: fmt(sunset),
    sunriseISO: sunrise ? sunrise.toISOString() : null,
    sunsetISO: sunset ? sunset.toISOString() : null,
    goldenHour: sunset
      ? `${fmt(new Date(sunset.getTime() - 60 * 60 * 1000))} – ${fmt(sunset)}`
      : "—",
    blueHour: sunset
      ? `${fmt(sunset)} – ${fmt(new Date(sunset.getTime() + 24 * 60 * 1000))}`
      : "—",
    moonPhase: "—",
    moonIllumination: null,
  };

  return {
    current,
    hourly: hourlyList,
    daily: dailyList,
    airQuality,
    sun,
  };
}

// Build a forecast bundle for a city, returning the (premium) AI summary.
const _cache = new Map();
const CACHE_TTL = 60_000; // 60s — supports live polling without hammering the provider

// Weather-history persistence is throttled to one snapshot per city per 10 min
// so the DB accumulates a meaningful sparkline without filling up on polling.
const LAST_SNAPSHOT = new Map();
const SNAPSHOT_TTL = 10 * 60_000;

async function persistSnapshot(city, country, lat, lon, curr) {
  const key = city || `${lat},${lon}`;
  const last = LAST_SNAPSHOT.get(key);
  if (last && Date.now() - last < SNAPSHOT_TTL) return;
  LAST_SNAPSHOT.set(key, Date.now());
  try {
    await recordWeatherSnapshot({
      city,
      country,
      lat,
      lon,
      temp: curr.temp,
      feels_like: curr.feelsLike,
      condition: curr.condition,
      humidity: curr.humidity,
      wind_speed: curr.windSpeed,
      uv_index: curr.uvIndex,
      aqi: curr.aqi,
    });
  } catch (err) {
    console.error("snapshot save failed:", err.message);
  }
}

export async function getWeatherForCity(query, { lat, lon } = {}) {
  const key = query || (lat && lon ? `${lat},${lon}` : "default");
  const cached = _cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return cached.data;
  }

  let location;
  if (lat && lon) {
    const results = await geocode(query);
    const match = results.find((r) => r.lat === lat && r.lon === lon);
    location = { name: query, country: match?.country || "", lat, lon };
  } else {
    const results = await geocode(query || "Nagercoil");
    location = results[0] || DEFAULT_LOCATION;
  }

  const forecast = await getForecast(location.lat, location.lon);
  const data = {
    location: {
      name: location.name,
      country: location.country,
      lat: location.lat,
      lon: location.lon,
    },
    ...forecast,
  };
  _cache.set(key, { at: Date.now(), data });

  // Persist a history snapshot (throttled) alongside the forecast.
  await persistSnapshot(data.location.name, data.location.country, data.location.lat, data.location.lon, data.current);

  return data;
}

// Server-side "AI" summary generated deterministically from the real data.
export function buildAISummary({ current, daily, rainAlert }) {
  const cond = current.condition;
  const today = daily[0] || { high: current.temp, low: current.temp - 3, rain: current.aqi };

  let headline, detail, bestTime;
  if (cond === "rain" || today.rain >= 50) {
    headline = "Rain is on the way — plan around it.";
    detail = `There's a ${today.rain}% chance of rain today with a high of ${today.high}°C. Keep an umbrella handy and move outdoor plans indoors.`;
    bestTime = rainAlert.etaMinutes ? `in ~${rainAlert.etaMinutes} min` : "this evening";
  } else if (cond === "snow") {
    headline = "Snowfall expected — drive carefully.";
    detail = `A high of ${today.high}°C and snowy conditions means slick roads. Give yourself extra travel time.`;
    bestTime = "morning";
  } else if (today.high >= 32) {
    headline = "Warm today — stay hydrated.";
    detail = `Temperatures climb to ${today.high}°C with low rain chances. Great for the outdoors if you hydrate.`;
    bestTime = "early morning";
  } else {
    headline = "Pleasant conditions across the board.";
    detail = `A high of ${today.high}°C and a low of ${today.low}°C make for a comfortable day. Rain chance is only ${today.rain}%.`;
    bestTime = "mid-morning";
  }

  return { headline, detail, bestTime, bestTimeLabel: "Best time to go out" };
}

// Deterministic activity scores derived from live conditions.
export function buildInsights({ current, daily }) {
  const today = daily[0] || {};
  const t = current.temp;
  const score = (base, modifier) => Math.max(10, Math.min(98, Math.round(base + modifier)));
  return [
    { key: "gym", label: "Gym Score", icon: "dumbbell", color: "#38BDF8", score: score(88, -t * 0.3), desc: t > 30 ? "Opt for an air-conditioned session." : "Comfortable workout weather." },
    { key: "walking", label: "Walking Score", icon: "footprints", color: "#7C3AED", score: score(84, today.rain * -0.5), desc: today.rain >= 50 ? "Light rain likely — bring a coat." : "Great conditions for a long walk." },
    { key: "cycling", label: "Cycling Score", icon: "bike", color: "#2563EB", score: score(76, (24 - t) * 1.2), desc: "Check wind before a long ride." },
    { key: "laundry", label: "Laundry Score", icon: "shirt", color: "#F59E0B", score: score(70, today.rain * -0.6), desc: today.rain >= 50 ? "Dry indoors — rain later." : "Sunny enough to dry outside." },
    { key: "beach", label: "Beach Score", icon: "umbrella", color: "#06B6D4", score: score(72, (t - 24) * 1.5), desc: current.uvIndex >= 8 ? "UV is very high — reapply SPF." : "Decent beach conditions." },
    { key: "travel", label: "Travel Score", icon: "plane", color: "#22C55E", score: score(86, today.rain * -0.4), desc: today.rain >= 50 ? "Allow extra time for delays." : "Smooth travel conditions." },
    { key: "fishing", label: "Fishing Score", icon: "fish", color: "#0EA5E9", score: score(74, today.rain * 0.2), desc: "Overcast skies favor a good catch." },
    { key: "driving", label: "Driving Score", icon: "car", color: "#A855F7", score: score(80, today.rain * -0.5), desc: today.rain >= 50 ? "Wet roads — reduce speed." : "Clear driving conditions." },
  ];
}

// Simple rain-alert message derived from upcoming precipitation.
export function buildRainAlert(hourly) {
  const upcoming = hourly.find((h) => h.rain >= 40);
  if (upcoming) {
    return { active: true, etaMinutes: hourly.indexOf(upcoming) * 60, message: "Carry an umbrella — rain is on its way." };
  }
  return { active: false, etaMinutes: null, message: "No rain expected in the next few hours." };
}
