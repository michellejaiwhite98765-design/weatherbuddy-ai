import { useEffect, useState } from "react";
import { EnvironmentFilled, SyncOutlined, ReloadOutlined } from "@ant-design/icons";
import WeatherIcon from "./WeatherIcon";
import { temp, tempUnit, speed, speedUnit } from "../utils/units";

function getGreeting(hour) {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function GreetingHeader({ current, userName = "there", units = "metric", refreshing, onRefresh, fetchedAt }) {
  const [now, setNow] = useState(new Date());
  const T = tempUnit(units);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  const fetchedStr = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <div className="hero-cinematic" style={{ paddingTop: 8 }}>
      {/* Top bar: greeting + LIVE status / refresh */}
      <div className="row-between" style={{ padding: "0 2px" }}>
        <p className="text-secondary" style={{ fontSize: 13.5, fontWeight: 500 }}>
          {getGreeting(now.getHours())}, {userName}
        </p>
        <span className="row" style={{ gap: 10 }}>
          <span className="row" style={{ gap: 5, fontSize: 11, fontWeight: 700, color: refreshing ? "var(--sky-blue)" : "#22C55E" }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: refreshing ? "var(--sky-blue)" : "#22C55E",
                boxShadow: "0 0 0 3px rgba(34,197,94,0.2)",
                animation: refreshing ? "none" : "twinkle 1.4s ease-in-out infinite",
              }}
            />
            LIVE
          </span>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid var(--border-glass)",
              cursor: "pointer",
              color: "var(--sky-blue)",
              fontSize: 13,
              width: 30,
              height: 30,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              padding: 0,
            }}
          >
            <ReloadOutlined spin={refreshing} />
          </button>
        </span>
      </div>

      {/* City + giant temperature over the cinematic photo */}
      <div className="col" style={{ alignItems: "center", textAlign: "center", marginTop: 34 }}>
        <div className="row text-secondary" style={{ gap: 6, fontSize: 14, fontWeight: 600 }}>
          <EnvironmentFilled style={{ color: "var(--sky-blue)" }} />
          {current?.city}
          {current?.country ? `, ${current?.country}` : ""}
        </div>
        <div className="row" style={{ gap: 8, marginTop: 6, alignItems: "flex-start", justifyContent: "center" }}>
          <span className="hero-temp">{current ? temp(current.temp, units) : ""}</span>
          <span style={{ fontSize: 30, fontWeight: 600, marginTop: 22, opacity: 0.75 }}>{T}</span>
        </div>
        <div className="row" style={{ gap: 10, marginTop: 10, justifyContent: "center" }}>
          <WeatherIcon condition={current?.condition} size={38} />
          <p className="hero-condition" style={{ alignSelf: "center" }}>
            {current?.condition} · Feels like {current ? temp(current.feelsLike, units) : ""}°
          </p>
        </div>
        <p className="text-tertiary" style={{ fontSize: 12, marginTop: 10, fontWeight: 500 }}>
          {dateStr} · {timeStr} · updated {fetchedStr}
        </p>
      </div>

      {/* Metrics strip — humidity / wind / visibility / UV */}
      <div className="glass-card glass-card--tight metrics-strip" style={{ marginTop: 26, padding: "14px 8px" }}>
        <div className="row" style={{ justifyContent: "space-around", textAlign: "center" }}>
          <Metric label="Humidity" value={`${current?.humidity ?? "—"}%`} />
          <Divider />
          <Metric label="Wind" value={`${current ? speed(current.windSpeed, units) : "—"}${speedUnit(units)}`} />
          <Divider />
          <Metric label="Visibility" value={current?.visibility != null ? `${current.visibility} km` : "—"} />
          <Divider />
          <Metric label="UV Index" value={current?.uvIndex ?? "—"} />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="col" style={{ gap: 3 }}>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{value}</span>
      <span className="text-tertiary" style={{ fontSize: 10.5 }}>
        {label}
      </span>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 24, background: "var(--border-glass)" }} />;
}
