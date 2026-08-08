import { useSelector } from "react-redux";
import WeatherIcon from "./WeatherIcon";
import { temp } from "../utils/units";

export default function WeeklyForecast({ daily = [] }) {
  const units = useSelector((s) => s.ui.units);
  const maxHigh = Math.max(...daily.map((d) => d.high), 1);
  const minLow = Math.min(...daily.map((d) => d.low), 0);
  const range = maxHigh - minLow || 1;

  return (
    <div style={{ marginTop: 26 }}>
      <h3 className="section-title">7-Day Forecast</h3>
      <div className="glass-card" style={{ padding: 8 }}>
        {daily.map((d, i) => {
          const leftPct = ((d.low - minLow) / range) * 100;
          const widthPct = ((d.high - d.low) / range) * 100;
          return (
            <div
              key={i}
              className="row-between"
              style={{
                padding: "12px 12px",
                borderBottom: i !== daily.length - 1 ? "1px solid var(--border-glass)" : "none",
              }}
            >
              <span style={{ width: 56, fontSize: 13.5, fontWeight: 600 }}>{d.day}</span>
              <div className="row" style={{ gap: 6, width: 70 }}>
                <WeatherIcon condition={d.condition} size={24} />
                <span style={{ fontSize: 12, color: "var(--sky-blue)", fontWeight: 600 }}>{d.rain}%</span>
              </div>
              <div className="row" style={{ gap: 10, flex: 1, justifyContent: "flex-end" }}>
                <span className="text-tertiary" style={{ fontSize: 13, width: 22, textAlign: "right" }}>
                  {temp(d.low, units)}°
                </span>
                <div style={{ position: "relative", width: 70, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.08)" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      height: "100%",
                      borderRadius: 4,
                      background: "var(--gradient-accent)",
                    }}
                  />
                </div>
                <span style={{ fontSize: 13, width: 22, fontWeight: 700 }}>{temp(d.high, units)}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
