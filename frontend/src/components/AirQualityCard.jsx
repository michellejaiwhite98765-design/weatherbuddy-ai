import { Progress } from "antd";

function aqiColor(aqi) {
  if (aqi <= 50) return "#22C55E";
  if (aqi <= 100) return "#F59E0B";
  if (aqi <= 150) return "#FB923C";
  return "#EF4444";
}

export default function AirQualityCard({ air }) {
  if (!air) return null;
  const color = aqiColor(air.aqi);

  return (
    <div className="glass-card" style={{ marginTop: 20, padding: 18 }}>
      <div className="row-between">
        <div>
          <span className="text-secondary" style={{ fontSize: 12, fontWeight: 600 }}>
            AIR QUALITY
          </span>
          <div className="row" style={{ gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color }}>{air.aqi}</span>
            <span style={{ fontSize: 13, color, fontWeight: 600, alignSelf: "flex-end", marginBottom: 4 }}>
              {air.level}
            </span>
          </div>
          <p className="text-tertiary" style={{ fontSize: 12, marginTop: 6, maxWidth: 200, lineHeight: 1.4 }}>
            {air.advice}
          </p>
        </div>
        <Progress type="dashboard" percent={Math.min(air.aqi / 2, 100)} strokeColor={color} size={80} />
      </div>
      <div className="row-between" style={{ marginTop: 16 }}>
        <MiniStat label="Pollen" value={air.pollen} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div
      className="col"
      style={{
        flex: 1,
        padding: "10px 12px",
        background: "rgba(255,255,255,0.06)",
        borderRadius: 12,
        gap: 2,
        marginRight: 8,
      }}
    >
      <span className="text-tertiary" style={{ fontSize: 10.5 }}>
        {label}
      </span>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{value}</span>
    </div>
  );
}
