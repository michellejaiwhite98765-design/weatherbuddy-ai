import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Timeline } from "antd";
import {
  CloudOutlined,
  FireOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  SoundOutlined,
} from "@ant-design/icons";
import { fetchNotifications } from "../store/weatherSlice";

const META = {
  rain: { icon: CloudOutlined, color: "#38BDF8" },
  heat: { icon: FireOutlined, color: "#F59E0B" },
  storm: { icon: ThunderboltOutlined, color: "#7C3AED" },
  cyclone: { icon: WarningOutlined, color: "#EF4444" },
  news: { icon: SoundOutlined, color: "#22C55E" },
};

export default function Alerts() {
  const dispatch = useDispatch();
  const { notifications, notificationsStatus } = useSelector((s) => s.weather);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  return (
    <div className="screen">
      <div style={{ paddingTop: 22 }}>
        <h2 style={{ fontSize: 22 }}>Alerts</h2>
        <p className="text-secondary" style={{ fontSize: 13, marginTop: 4 }}>
          Rain, storm, heat &amp; cyclone updates
        </p>
      </div>

      {notificationsStatus === "loading" ? (
        <div className="col" style={{ gap: 12, marginTop: 20 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 74 }} />
          ))}
        </div>
      ) : (
        <div style={{ marginTop: 22 }}>
          <Timeline
            items={notifications.map((n) => {
              const meta = META[n.type] || META.news;
              const Icon = meta.icon;
              return {
                dot: (
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      background: `${meta.color}22`,
                      color: meta.color,
                    }}
                  >
                    <Icon style={{ fontSize: 13 }} />
                  </span>
                ),
                children: (
                  <div className="glass-card glass-card--tight" style={{ padding: 14, marginBottom: 6 }}>
                    <div className="row-between">
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{n.title}</span>
                      <span className="text-tertiary" style={{ fontSize: 11 }}>
                        {n.time}
                      </span>
                    </div>
                    <p className="text-secondary" style={{ fontSize: 12.5, marginTop: 6 }}>
                      {n.message}
                    </p>
                  </div>
                ),
              };
            })}
          />
        </div>
      )}
    </div>
  );
}
