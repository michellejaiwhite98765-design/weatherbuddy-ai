import { useLocation, useNavigate } from "react-router-dom";
import {
  HomeFilled,
  CompassFilled,
  SearchOutlined,
  BellFilled,
  UserOutlined,
  PlayCircleFilled,
} from "@ant-design/icons";

const TABS = [
  { key: "/", label: "Home", icon: HomeFilled },
  { key: "/movies", label: "Movies", icon: PlayCircleFilled },
  { key: "/map", label: "Map", icon: CompassFilled },
  { key: "/search", label: "Search", icon: SearchOutlined },
  { key: "/alerts", label: "Alerts", icon: BellFilled },
  { key: "/profile", label: "Profile", icon: UserOutlined },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = pathname === tab.key;
        return (
          <button
            key={tab.key}
            className={`nav-item ${active ? "active" : ""}`}
            onClick={() => navigate(tab.key)}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            {active && <span className="nav-indicator" />}
            <Icon style={{ fontSize: 18, position: "relative" }} />
            <span style={{ position: "relative" }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
