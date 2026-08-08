// Lightweight temperature sparkline (pure SVG — no chart library).
// Draws recent snapshots as dots + a smooth-ish polyline with a soft fill.
import { HistoryOutlined } from "@ant-design/icons";

export default function HistorySparkline({ history, city, units = "metric" }) {
  if (!history || history.length < 2) return null;

  const W = 300;
  const H = 72;
  const PAD = 8;
  const temps = history.map((h) => h.temp);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const span = Math.max(max - min, 1);

  const x = (i) => PAD + (i / (temps.length - 1)) * (W - PAD * 2);
  const y = (t) => H - PAD - ((t - min) / span) * (H - PAD * 2) - (H - PAD * 2) * 0.05;

  const points = temps.map((t, i) => `${x(i).toFixed(1)},${y(t).toFixed(1)}`).join(" ");
  const area = `${PAD},${H - PAD} ${points} ${x(temps.length - 1).toFixed(1)},${H - PAD}`;
  const latest = temps[temps.length - 1];

  return (
    <div className="glass-card" style={{ marginTop: 20, padding: 20 }}>
      <div className="row-between">
        <div className="row" style={{ gap: 8 }}>
          <span
            style={{
              width: 30,
              height: 30,
              display: "grid",
              placeItems: "center",
              borderRadius: 10,
              background: "var(--gradient-accent)",
            }}
          >
            <HistoryOutlined style={{ fontSize: 14 }} />
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.3 }}>TEMPERATURE HISTORY</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>
              {city} · recent readings
            </div>
          </div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>
          {Math.round(latest)}<span style={{ fontSize: 13, opacity: 0.7 }}>°</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ marginTop: 14, display: "block" }}>
        <defs>
          <linearGradient id="trigArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#trigArea)" />
        <polyline
          points={points}
          fill="none"
          stroke="#A78BFA"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {temps.map((t, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(t)}
            r={i === temps.length - 1 ? 3.5 : 2}
            fill={i === temps.length - 1 ? "#EDE9FE" : "#A78BFA"}
            stroke="#2b1b4e"
            strokeWidth={i === temps.length - 1 ? 1.5 : 0}
          />
        ))}
      </svg>

      <div className="row-between" style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>
        <span>{Math.round(min)}° min</span>
        <span>{Math.round(max)}° max</span>
      </div>
    </div>
  );
}