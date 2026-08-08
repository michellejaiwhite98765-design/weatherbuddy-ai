import { useEffect, useState } from "react";
import { SunOutlined, MoonOutlined } from "@ant-design/icons";

const P0 = { x: 10, y: 80 };
const P1 = { x: 150, y: -10 };
const P2 = { x: 290, y: 80 };

// Point on a quadratic bezier at t in [0,1].
function pointOnArc(t) {
  const u = 1 - t;
  return {
    x: u * u * P0.x + 2 * u * t * P1.x + t * t * P2.x,
    y: u * u * P0.y + 2 * u * t * P1.y + t * t * P2.y,
  };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function fmtDuration(ms) {
  if (ms <= 0) return "just now";
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${pad(m)}m` : `${m}m`;
}

function parseISO(s) {
  return s ? new Date(s) : null;
}

export default function SunCard({ sun }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!sun) return null;

  const sunrise = parseISO(sun.sunriseISO);
  const sunset = parseISO(sun.sunsetISO);

  // Fallback: parse the formatted "06:12 AM" string for today if no ISO.
  const parseFmt = (str) => {
    const m = (str || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!m) return null;
    const d = new Date();
    let h = parseInt(m[1], 10);
    if (m[3].toUpperCase() === "PM" && h !== 12) h += 12;
    if (m[3].toUpperCase() === "AM" && h === 12) h = 0;
    d.setHours(h, parseInt(m[2], 10), 0, 0);
    return d;
  };

  const rise = sunrise || parseFmt(sun.sunrise);
  const set = sunset || parseFmt(sun.sunset);

  let progress = 0;
  let isDay = true;
  let countdownMs = 0;
  let countdownLabel = "";
  let phase = "Morning";

  if (rise && set) {
    const ms = now.getTime();
    const riseMs = rise.getTime();
    const setMs = set.getTime();
    isDay = ms >= riseMs && ms <= setMs;

    if (isDay) {
      progress = Math.min(1, Math.max(0, (ms - riseMs) / (setMs - riseMs)));
      countdownMs = setMs - ms;
      countdownLabel = "Sunset";
      if (progress < 0.5) phase = "Morning";
      else phase = "Afternoon";
    } else {
      const nextRise = new Date(rise.getTime() + (ms > riseMs ? 86400000 : 0));
      progress = 0; // moon sits at horizon edge
      countdownMs = nextRise.getTime() - ms;
      countdownLabel = "Sunrise";
      phase = "Night";
    }
  }

  const pos = pointOnArc(isDay ? progress : 0.05);
  const isMoon = !isDay;

  return (
    <div className="glass-card" style={{ marginTop: 20, padding: 18 }}>
      <div className="row-between">
        <span className="text-secondary" style={{ fontSize: 12, fontWeight: 600 }}>
          SUN &amp; MOON
        </span>
        <span className="row" style={{ gap: 6, fontSize: 12, fontWeight: 700, color: "var(--sky-blue)" }}>
          {isDay ? <SunOutlined /> : <MoonOutlined />}
          {phase}
        </span>
      </div>

      <div className="row-between" style={{ marginTop: 16 }}>
        <SunArc progress={progress} isMoon={isMoon} sunrise={sun.sunrise} sunset={sun.sunset} />
      </div>

      {/* Live countdown */}
      <div
        className="row-between"
        style={{
          marginTop: 14,
          padding: "10px 14px",
          borderRadius: 12,
          background: isDay ? "linear-gradient(135deg, rgba(251,191,36,0.18), rgba(245,158,11,0.12))" : "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(79,70,229,0.12))",
          border: "1px solid var(--border-glass)",
        }}
      >
        <span className="text-secondary" style={{ fontSize: 12.5 }}>
          {isDay ? "Sunset" : "Sunrise"} in
        </span>
        <span style={{ fontWeight: 800, fontSize: 16, fontVariantNumeric: "tabular-nums" }}>{fmtDuration(countdownMs)}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
        <Item label="Golden Hour" value={sun.goldenHour} />
        <Item label="Blue Hour" value={sun.blueHour} />
        <Item label="Moon Phase" value={sun.moonPhase} />
        <Item label="Illumination" value={sun.moonIllumination != null ? `${sun.moonIllumination}%` : "—"} />
      </div>
    </div>
  );
}

function SunArc({ progress, isMoon, sunrise, sunset }) {
  const pos = pointOnArc(progress);
  return (
    <div style={{ width: "100%" }}>
      <svg viewBox="0 0 300 90" width="100%" height="70">
        <path d="M10 80 Q150 -10 290 80" stroke="rgba(255,255,255,0.15)" strokeWidth="2" fill="none" />
        {/* sunrise / sunset markers */}
        <circle cx={P0.x} cy={P0.y} r="3" fill="rgba(255,255,255,0.4)" />
        <circle cx={P2.x} cy={P2.y} r="3" fill="rgba(255,255,255,0.4)" />
        {isMoon ? (
          <>
            <circle cx={pos.x} cy={pos.y} r="8" fill="#E2E8F0" />
            <circle cx={pos.x - 3} cy={pos.y - 2} r="6" fill="#334155" />
          </>
        ) : (
          <circle cx={pos.x} cy={pos.y} r="8" fill="url(#sunGrad)">
            <animate attributeName="r" values="8;8.8;8" dur="2s" repeatCount="indefinite" />
          </circle>
        )}
        <defs>
          <linearGradient id="sunGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FCD34D" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
      </svg>
      <div className="row-between">
        <span className="text-tertiary" style={{ fontSize: 11 }}>
          Sunrise · {sunrise}
        </span>
        <span className="text-tertiary" style={{ fontSize: 11 }}>
          Sunset · {sunset}
        </span>
      </div>
    </div>
  );
}

function Item({ label, value }) {
  return (
    <div className="col" style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "10px 12px", gap: 3 }}>
      <span className="text-tertiary" style={{ fontSize: 10.5 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{value}</span>
    </div>
  );
}
