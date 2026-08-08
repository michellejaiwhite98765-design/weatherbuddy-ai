import "dotenv/config";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import authRoutes from "./routes/auth.js";
import weatherRoutes from "./routes/weather.js";
import aiRoutes from "./routes/ai.js";
import billingRoutes from "./routes/billing.js";
import moviesRoutes from "./routes/movies.js";
import { getWeatherForCity, buildRainAlert } from "./services/weather.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// Capture the raw body so the Stripe webhook can verify signatures over it.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Health check lives under /api so the root path is free to serve the SPA shell
// in production (see the static-serving block below).
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "WeatherBuddy AI API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/movies", moviesRoutes);

// In production the single Railway service also serves the built React app (the
// frontend build outputs to backend/public via vite.config.js). API routes are
// mounted above, so only the static SPA and its fallback are handled here.
if (process.env.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const publicDir = path.join(__dirname, "public");
  app.use(express.static(publicDir));
  // SPA fallback: any non-/api path returns the app shell (client-side routing).
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

// Central error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ---------------------------------------------------------------- WebSockets
// Live weather pushes: clients `subscribe` to a city and receive a fresh
// `weather:update` (current conditions) on an interval, plus on-demand `alert`
// events when a rain alert becomes active. This keeps the dashboard live
// without hammering the upstream weather provider.
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    // `true` reflects the request origin, letting the same-origin production app
    // connect without a hard-coded URL. Dev keeps the explicit Vite origin.
    origin:
      process.env.CLIENT_ORIGIN ||
      (process.env.NODE_ENV === "production" ? true : "http://localhost:5173"),
    methods: ["GET", "POST"],
  },
});

// Socket -> subscription { locationKey, city, lat, lon }
const subscriptions = new Map();
const PUSH_INTERVAL_MS = 60_000;

function locationKey(loc) {
  return loc && loc.city ? `${loc.city}|${loc.lat || 0}|${loc.lon || 0}` : "default";
}

io.on("connection", (socket) => {
  socket.on("subscribe", (loc) => {
    if (loc && typeof loc !== "object") loc = { city: String(loc) };
    subscriptions.set(socket.id, loc || {});
    // Push an immediate snapshot so the client gets data right away.
    pushUpdate(socket);
  });

  socket.on("disconnect", () => {
    subscriptions.delete(socket.id);
  });
});

async function pushUpdate(socket) {
  const loc = subscriptions.get(socket.id);
  if (!loc) return;
  try {
    const data = await getWeatherForCity(loc.city || "Nagercoil", { lat: loc.lat, lon: loc.lon });
    const rainAlert = buildRainAlert(data.hourly);
    socket.emit("weather:update", {
      location: data.location,
      current: { ...data.current, city: data.location.name, country: data.location.country },
      hourly: data.hourly,
      daily: data.daily,
      rainAlert,
    });
  } catch (err) {
    socket.emit("weather:error", { message: "Could not refresh live weather." });
  }
}

setInterval(() => {
  for (const socket of io.sockets.sockets.values()) pushUpdate(socket);
}, PUSH_INTERVAL_MS);

server.listen(PORT, () => {
  console.log(`WeatherBuddy AI backend running on http://localhost:${PORT}`);
  console.log("WebSockets: live weather updates enabled every 60s");
  console.log(
    process.env.STRIPE_SECRET_KEY
      ? "Payments: Stripe test mode enabled"
      : "Payments: no Stripe key — using DEV fallback checkout"
  );
});
