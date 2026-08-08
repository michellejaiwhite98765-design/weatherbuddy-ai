import WeatherIcon from "./WeatherIcon";

export default function RainAlertCard({ alert }) {
  if (!alert?.active) return null;
  const hours = Math.floor(alert.etaMinutes / 60);
  const minutes = alert.etaMinutes % 60;

  return (
    <div
      className="glass-card row-between"
      style={{
        marginTop: 20,
        padding: 18,
        background: "linear-gradient(120deg, rgba(56,189,248,0.18), rgba(37,99,235,0.14))",
        border: "1px solid rgba(56,189,248,0.3)",
      }}
    >
      <div>
        <span className="text-secondary" style={{ fontSize: 12, fontWeight: 600 }}>
          RAIN ALERT
        </span>
        <p style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }}>
          Rain expected in {hours > 0 ? `${hours}h ` : ""}
          {minutes}m
        </p>
        <p className="text-secondary" style={{ fontSize: 12.5, marginTop: 4 }}>
          {alert.message}
        </p>
      </div>
      <WeatherIcon condition="rain" size={54} />
    </div>
  );
}
