import { ThunderboltFilled } from "@ant-design/icons";

// Enriched AI card. Falls back to the legacy summary headline when the rich
// forecast hasn't loaded yet, so the Home layout never flashes.
export default function AISummaryCard({ summary, rich }) {
  if (!summary && !rich) return null;

  const narrative = rich?.narrative || summary?.detail || "";
  const dayFocus = rich?.dayFocus || null;
  const outfit = rich?.outfit || null;
  const activityPlan = rich?.activityPlan || [];
  const precipTimeline = rich?.precipTimeline || [];
  const engine = rich?.engine || summary?.engine || "rules";

  const riskColor = (level) =>
    level === "High" ? "#F87171" : level === "Medium" ? "#FBBF24" : "#34D399";

  return (
    <div
      className="glass-card"
      style={{
        marginTop: 20,
        padding: 20,
        background: "linear-gradient(135deg, rgba(124,58,237,0.28), rgba(37,99,235,0.22))",
        border: "1px solid rgba(124,58,237,0.35)",
      }}
    >
      <div className="row-between" style={{ gap: 8 }}>
        <div className="row" style={{ gap: 8 }}>
          <span
            className="sparkle-icon"
            style={{
              width: 30,
              height: 30,
              display: "grid",
              placeItems: "center",
              borderRadius: 10,
              background: "var(--gradient-accent)",
            }}
          >
            <ThunderboltFilled style={{ fontSize: 14 }} />
          </span>
          <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.3 }}>AI WEATHER SUMMARY</span>
        </div>
        {engine === "llm" ? (
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: 0.5,
              padding: "4px 8px",
              borderRadius: 999,
              background: "rgba(34,197,94,0.18)",
              color: "#4ADE80",
            }}
          >
            AI MODEL
          </span>
        ) : null}
      </div>

      {/* Narrative */}
      {summary?.headline && rich ? (
        <p style={{ fontSize: 17, fontWeight: 600, marginTop: 14, lineHeight: 1.4 }}>{summary.headline}</p>
      ) : null}
      <p className="text-secondary" style={{ fontSize: 13.5, marginTop: rich ? 8 : 14, lineHeight: 1.6 }}>
        {narrative}
      </p>

      {/* Day focus */}
      {dayFocus ? (
        <div
          className="row"
          style={{
            marginTop: 14,
            padding: "10px 14px",
            borderRadius: 14,
            background: "rgba(124,58,237,0.22)",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 16 }}>🎯</span>
          <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{dayFocus}</span>
        </div>
      ) : null}

      {/* Outfit */}
      {outfit ? (
        <div
          className="row"
          style={{ marginTop: 12, padding: "10px 14px", borderRadius: 14, background: "rgba(255,255,255,0.07)", gap: 10 }}
        >
          <span style={{ fontSize: 16 }}>🧥</span>
          <span style={{ fontSize: 12.5, lineHeight: 1.5 }} className="text-secondary">
            {outfit}
          </span>
        </div>
      ) : null}

      {/* Precipitation timeline */}
      {precipTimeline.length ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>
            RAIN RISK THROUGH THE DAY
          </div>
          {precipTimeline.map((p) => (
            <div key={p.period} className="row-between" style={{ padding: "5px 0", fontSize: 12.5 }}>
              <span style={{ color: "rgba(255,255,255,0.75)", width: 76 }}>{p.period}</span>
              <span style={{ fontWeight: 700, color: riskColor(p.level), width: 64 }}>{p.level}</span>
              <div style={{ flex: 1, height: 6, borderRadius: 999, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                <div
                  style={{ height: "100%", width: `${p.risk}%`, borderRadius: 999, background: riskColor(p.level) }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Activity plan */}
      {activityPlan.length ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>
            SUGGESTED PLAN
          </div>
          {activityPlan.map((s) => (
            <div
              key={s.period}
              style={{ padding: "10px 14px", borderRadius: 14, background: "rgba(255,255,255,0.06)", marginBottom: 8 }}
            >
              <div className="row-between">
                <span style={{ fontWeight: 700, fontSize: 12.5 }}>{s.period}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>{s.vibe}</span>
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 6, lineHeight: 1.5 }}>
                {s.actions.join(" · ")}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Legacy best-time fallback */}
      {!rich && summary?.bestTime ? (
        <div
          className="row-between"
          style={{
            marginTop: 16,
            padding: "10px 14px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.08)",
          }}
        >
          <span className="text-secondary" style={{ fontSize: 12.5 }}>
            {summary.bestTimeLabel}
          </span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{summary.bestTime}</span>
        </div>
      ) : null}
    </div>
  );
}