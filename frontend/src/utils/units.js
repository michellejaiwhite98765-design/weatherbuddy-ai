// Temperature/wind helpers. Backend always returns metric; convert for display.
export function temp(c, unit = "metric") {
  if (unit === "imperial") return Math.round((c * 9) / 5 + 32);
  return Math.round(c);
}

export function tempUnit(unit = "metric") {
  return unit === "imperial" ? "°F" : "°C";
}

export function speed(kmh, unit = "metric") {
  if (unit === "imperial") return Math.round(kmh * 0.621371);
  return Math.round(kmh);
}

export function speedUnit(unit = "metric") {
  return unit === "imperial" ? " mph" : " km/h";
}
