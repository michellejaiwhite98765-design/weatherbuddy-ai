import { useSelector } from "react-redux";
import WeatherIcon from "./WeatherIcon";
import { temp } from "../utils/units";

export default function HourlyForecast({ hourly = [] }) {
  const units = useSelector((s) => s.ui.units);
  return (
    <div style={{ marginTop: 26 }}>
      <h3 className="section-title">Hourly Forecast</h3>
      <div className="row no-scrollbar" style={{ gap: 12, paddingBottom: 4 }}>
        {hourly.map((h, i) => (
          <div
            key={i}
            className="glass-card glass-card--tight col"
            style={{
              minWidth: 76,
              padding: "14px 10px",
              alignItems: "center",
              gap: 10,
              animation: `pageIn 0.5s ease ${i * 0.04}s both`,
            }}
          >
            <span className="text-secondary" style={{ fontSize: 12, fontWeight: 600 }}>
              {h.time}
            </span>
            <WeatherIcon condition={h.condition} size={30} />
            <span style={{ fontSize: 15, fontWeight: 700 }}>{temp(h.temp, units)}°</span>
            <span style={{ fontSize: 11, color: "var(--sky-blue)", fontWeight: 600 }}>{h.rain}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
