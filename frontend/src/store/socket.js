import { io } from "socket.io-client";
import { getStoredToken } from "./api";

// Live weather pushes come straight from the backend (bypassing the Vite dev
// proxy, which is HTTP-only). In production the app and backend share one origin,
// so fall back to the current window origin (wss://...). In dev, hit the local
// backend. Override either with VITE_WS_URL.
const defaultWsUrl =
  typeof window !== "undefined" && import.meta.env.PROD
    ? window.location.origin
    : "http://localhost:5000";
const WS_URL = import.meta.env.VITE_WS_URL || defaultWsUrl;

let socket = null;

// Attach a handler that runs on every live `weather:update` push.
export function connectRealtime({ onUpdate, onError }) {
  if (socket) {
    socket.off("weather:update");
    if (onError) socket.off("weather:error");
  } else {
    socket = io(WS_URL, {
      transports: ["websocket", "polling"],
      auth: (cb) => cb({ token: getStoredToken() }),
    });
  }

  socket.on("weather:update", onUpdate);
  socket.on("weather:error", (e) => onError && onError(e));
  return socket;
}

// Tell the backend which city to start pushing live updates for.
export function subscribeCity(cityOrLoc) {
  if (!socket) return;
  const loc = typeof cityOrLoc === "string" ? { city: cityOrLoc } : cityOrLoc || {};
  socket.emit("subscribe", loc);
}

export function disconnectRealtime() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}