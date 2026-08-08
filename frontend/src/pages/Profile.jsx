import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Avatar, Switch, Segmented, Modal, Button, message } from "antd";
import {
  CrownFilled,
  EnvironmentOutlined,
  BgColorsOutlined,
  BellOutlined,
  SafetyOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
  RightOutlined,
  LoginOutlined,
} from "@ant-design/icons";
import { toggleUnits } from "../store/uiSlice";
import { logout, updatePrefs } from "../store/authSlice";

const PLAN_LABEL = {
  free: "Free Member",
  premium: "Premium Member",
  premium_plus: "Premium Plus",
  family: "Family Plan",
};

export default function Profile() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { units } = useSelector((s) => s.ui);
  const { user, status } = useSelector((s) => s.auth);
  const { favorites } = useSelector((s) => s.weather);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const prefs = user?.prefs || { notifications: 1, theme: "dark", unit: "metric" };
  const isPremium = user?.plan && user.plan !== "free";

  // Apply the persisted theme on load.
  useEffect(() => {
    document.body.classList.toggle("light", prefs.theme === "light");
  }, [prefs.theme]);

  // Not logged in — show a sign-in prompt.
  if (status !== "authenticated" || !user) {
    return (
      <div className="screen" style={{ display: "flex", flexDirection: "column", minHeight: "80vh", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 28px" }}>
        <span className="sparkle-icon" style={{ width: 72, height: 72, borderRadius: 20, display: "grid", placeItems: "center", background: "var(--gradient-accent)", fontSize: 30 }}>
          <LoginOutlined />
        </span>
        <h2 style={{ fontSize: 22, marginTop: 20 }}>Sign in to your account</h2>
        <p className="text-secondary" style={{ fontSize: 13, marginTop: 8 }}>
          Save favorite cities, manage your plan and customize WeatherBuddy.
        </p>
        <button onClick={() => navigate("/login")} className="gradient-btn" style={{ marginTop: 22, padding: "14px 34px", borderRadius: 14, fontWeight: 700, cursor: "pointer" }}>
          Sign In / Create Account
        </button>
      </div>
    );
  }

  const onThemeChange = (theme) => {
    dispatch(updatePrefs({ theme }));
  };
  const onNotifChange = (checked) => {
    dispatch(updatePrefs({ notifications: checked }));
    message[checked ? "success" : "warning"](checked ? "Notifications on" : "Notifications off");
  };
  const onUnitChange = (value) => {
    dispatch(toggleUnits());
    dispatch(updatePrefs({ unit: value }));
  };
  const onLogout = () => {
    dispatch(logout());
    document.body.classList.remove("light");
    message.success("Signed out");
    navigate("/login");
  };

  return (
    <div className="screen">
      <div style={{ paddingTop: 22, textAlign: "center" }}>
        <Avatar
          size={88}
          style={{ background: "var(--gradient-accent)", fontSize: 34, fontWeight: 700, border: "3px solid rgba(255,255,255,0.15)" }}
        >
          {(user.name || "U").charAt(0).toUpperCase()}
        </Avatar>
        <h2 style={{ marginTop: 14, fontSize: 20 }}>{user.name}</h2>
        <p className="text-secondary" style={{ fontSize: 13, marginTop: 2 }}>
          {user.email}
        </p>

        <div
          className="row"
          onClick={() => navigate("/premium")}
          style={{
            justifyContent: "center",
            gap: 6,
            marginTop: 10,
            padding: "6px 14px",
            borderRadius: 999,
            background: isPremium ? "var(--gradient-premium)" : "var(--surface-glass-strong)",
            border: isPremium ? "none" : "1px solid var(--border-glass)",
            display: "inline-flex",
            cursor: "pointer",
          }}
        >
          <CrownFilled style={{ fontSize: 12 }} />
          <span style={{ fontSize: 12, fontWeight: 700 }}>{PLAN_LABEL[user.plan] || "Free Member"}</span>
        </div>
      </div>

      <div className="glass-card" style={{ marginTop: 26, padding: 6 }}>
        <SettingRow icon={<EnvironmentOutlined />} label="Favorite Cities" value={`${favorites.length} saved`} onClick={() => navigate("/search")} />
        <SettingRow
          icon={<BgColorsOutlined />}
          label="Units"
          value={
            <Segmented
              size="small"
              value={units}
              onChange={onUnitChange}
              options={[
                { label: "°C", value: "metric" },
                { label: "°F", value: "imperial" },
              ]}
            />
          }
          noArrow
        />
        <SettingRow
          icon={<BgColorsOutlined />}
          label="Theme"
          value={
            <Segmented
              size="small"
              value={prefs.theme}
              onChange={onThemeChange}
              options={[
                { label: "Dark", value: "dark" },
                { label: "Light", value: "light" },
              ]}
            />
          }
          noArrow
        />
        <SettingRow
          icon={<BellOutlined />}
          label="Notification Settings"
          value={<Switch checked={!!prefs.notifications} onChange={onNotifChange} size="small" />}
          noArrow
        />
        <SettingRow icon={<SafetyOutlined />} label="Privacy" onClick={() => setPrivacyOpen(true)} />
        <SettingRow icon={<InfoCircleOutlined />} label="About" last onClick={() => setAboutOpen(true)} />
      </div>

      <button
        className="glass-card row"
        onClick={onLogout}
        style={{
          marginTop: 16,
          padding: "14px 18px",
          width: "100%",
          border: "1px solid rgba(239,68,68,0.3)",
          background: "rgba(239,68,68,0.08)",
          color: "#F87171",
          fontWeight: 600,
          fontSize: 14,
          gap: 10,
          cursor: "pointer",
        }}
      >
        <LogoutOutlined />
        Logout
      </button>

      <Modal open={privacyOpen} onCancel={() => setPrivacyOpen(false)} footer={[<Button key="ok" type="primary" onClick={() => setPrivacyOpen(false)}>Done</Button>]} title="Privacy" style={{ maxWidth: 400 }}>
        <p className="text-secondary" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
          WeatherBuddy stores your account, saved cities and plan so your data is with you on any device. We use live weather providers (Open-Meteo, RainViewer) for forecasts and radar — your location data is used only to serve you the forecast you asked for.
        </p>
      </Modal>

      <Modal open={aboutOpen} onCancel={() => setAboutOpen(false)} footer={[<Button key="ok" type="primary" onClick={() => setAboutOpen(false)}>Done</Button>]} title="About" style={{ maxWidth: 400 }}>
        <p className="text-secondary" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
          <strong style={{ color: "var(--text-primary)" }}>WeatherBuddy AI</strong> — live weather, AI summaries and real-time radar. Built with React, Redux, Express and SQLite. Weather data by Open-Meteo; radar by RainViewer; billing by Stripe.
        </p>
      </Modal>
    </div>
  );
}

function SettingRow({ icon, label, value, noArrow, last, onClick }) {
  return (
    <div
      className="row-between"
      onClick={onClick}
      style={{ padding: "14px 12px", borderBottom: last ? "none" : "1px solid var(--border-glass)", cursor: onClick ? "pointer" : "default" }}
    >
      <div className="row" style={{ gap: 10 }}>
        <span style={{ width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center", background: "rgba(255,255,255,0.06)", color: "var(--sky-blue)" }}>
          {icon}
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 500 }}>{label}</span>
      </div>
      <div className="row" style={{ gap: 8 }}>
        {value && (
          <span className="text-tertiary" style={{ fontSize: 12.5 }}>
            {value}
          </span>
        )}
        {!noArrow && <RightOutlined style={{ fontSize: 11, color: "var(--text-tertiary)" }} />}
      </div>
    </div>
  );
}
