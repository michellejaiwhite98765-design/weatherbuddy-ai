import { LockFilled, CrownFilled, ArrowRightOutlined } from "@ant-design/icons";

export default function PremiumLock({ onUpgrade }) {
  return (
    <div
      className="glass-card"
      style={{
        marginTop: 20,
        padding: 20,
        background: "linear-gradient(135deg, rgba(37,99,235,0.16), rgba(124,58,237,0.16))",
        border: "1px dashed rgba(124,58,237,0.45)",
      }}
    >
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
          <CrownFilled style={{ fontSize: 14 }} />
        </span>
        <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.3 }}>AI WEATHER SUMMARY</span>
      </div>

      <p style={{ fontSize: 15, fontWeight: 600, marginTop: 14, lineHeight: 1.4 }}>
        Unlock AI insights, smart activity scores &amp; live radar.
      </p>
      <p className="text-secondary" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
        Go Premium to see a personalized AI summary of today's weather, tailored scores for gym, walks and travel — plus a real live radar.
      </p>

      <button
        onClick={onUpgrade}
        className="gradient-btn"
        style={{
          marginTop: 16,
          padding: "12px 0",
          width: "100%",
          borderRadius: 14,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <LockFilled style={{ fontSize: 13 }} /> Upgrade to Premium <ArrowRightOutlined style={{ fontSize: 13 }} />
      </button>
    </div>
  );
}
