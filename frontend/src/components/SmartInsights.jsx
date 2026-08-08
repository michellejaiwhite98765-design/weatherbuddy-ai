import { Progress } from "antd";
import {
  CarOutlined,
  RestOutlined,
  RocketOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";

const ICONS = {
  dumbbell: RocketOutlined,
  footprints: RestOutlined,
  bike: ThunderboltOutlined,
  shirt: RestOutlined,
  umbrella: RestOutlined,
  plane: RocketOutlined,
  fish: RestOutlined,
  car: CarOutlined,
};

export default function SmartInsights({ insights = [] }) {
  return (
    <div style={{ marginTop: 26 }}>
      <h3 className="section-title">Smart Insights</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        {insights.map((item) => {
          const Icon = ICONS[item.icon] || RestOutlined;
          return (
            <div key={item.key} className="glass-card glass-card--tight" style={{ padding: 16 }}>
              <div className="row-between">
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    display: "grid",
                    placeItems: "center",
                    background: `${item.color}22`,
                    color: item.color,
                  }}
                >
                  <Icon />
                </span>
                <Progress
                  type="circle"
                  percent={item.score}
                  size={38}
                  strokeColor={item.color}
                  trailColor="rgba(255,255,255,0.08)"
                  format={(p) => <span style={{ fontSize: 10, fontWeight: 700 }}>{p}</span>}
                />
              </div>
              <p style={{ fontSize: 13.5, fontWeight: 700, marginTop: 12 }}>{item.label}</p>
              <p className="text-tertiary" style={{ fontSize: 11.5, marginTop: 4, lineHeight: 1.4 }}>
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
