import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Segmented } from "antd";
import { AimOutlined, PlusOutlined, MinusOutlined, LockFilled, ReloadOutlined } from "@ant-design/icons";
import { fetchRadar } from "../store/weatherSlice";

const LAYERS = ["Radar", "Temperature", "Wind", "Clouds"];

// Convert lat/lon to slippy-map tile coordinates at a given zoom.
function latLonToTile(lat, lon, z) {
  const x = Math.floor(((lon + 180) / 360) * 2 ** z);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * 2 ** z);
  return { x, y };
}

export default function MapScreen() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { radar, radarStatus, selectedCity } = useSelector((s) => s.weather);
  const { user } = useSelector((s) => s.auth);
  const [layer, setLayer] = useState("Radar");
  const [zoom, setZoom] = useState(1);

  const premium = !!user && user.plan !== "free";

  useEffect(() => {
    if (premium) dispatch(fetchRadar(selectedCity));
  }, [dispatch, premium, selectedCity]);

  const frame = useMemo(() => {
    if (!radar?.frames?.length) return null;
    return radar.frames[radar.frames.length - 1];
  }, [radar]);

  // 3x3 tile grid centered on the location.
  const center = radar?.location || { lat: 8.1772, lon: 77.4247 };
  const TILE_Z = 5;
  const tiles = useMemo(() => {
    const c = latLonToTile(center.lat, center.lon, TILE_Z);
    const grid = [];
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) grid.push({ x: c.x + dx, y: c.y + dy });
    return grid;
  }, [center.lat, center.lon]);

  const tint =
    layer === "Temperature" ? "hue-rotate(80deg)" : layer === "Wind" ? "hue-rotate(200deg)" : layer === "Clouds" ? "grayscale(0.9) brightness(0.9)" : "none";

  // ---- Non-premium: locked state ----------------------------------------
  if (!premium) {
    return (
      <div className="screen" style={{ display: "flex", flexDirection: "column", minHeight: "80vh", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 28px" }}>
        <span
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            display: "grid",
            placeItems: "center",
            background: "var(--gradient-premium)",
            fontSize: 30,
          }}
        >
          <LockFilled />
        </span>
        <h2 style={{ fontSize: 22, marginTop: 20 }}>Live Radar is Premium</h2>
        <p className="text-secondary" style={{ fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
          See real-time precipitation moving across the region with our live radar overlay.
        </p>
        <button
          onClick={() => navigate("/premium")}
          className="gradient-btn"
          style={{ marginTop: 22, padding: "14px 34px", borderRadius: 14, fontWeight: 700, cursor: "pointer" }}
        >
          Unlock Live Radar
        </button>
      </div>
    );
  }

  return (
    <div className="screen" style={{ paddingLeft: 0, paddingRight: 0 }}>
      <div style={{ padding: "22px 20px 14px" }}>
        <div className="row-between">
          <div>
            <h2 style={{ fontSize: 22 }}>Live Radar</h2>
            <p className="text-secondary" style={{ fontSize: 13, marginTop: 4 }}>
              Precipitation around {center.name || "your location"}
            </p>
          </div>
          <button
            onClick={() => dispatch(fetchRadar(selectedCity))}
            className="glass-card glass-card--tight"
            style={{ border: "none", cursor: "pointer", color: "var(--sky-blue)", padding: "8px 12px", fontSize: 12, fontWeight: 600 }}
          >
            <ReloadOutlined /> Refresh
          </button>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          height: 460,
          margin: "0 20px",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          background: "linear-gradient(160deg, #0b1224, #142042)",
          border: "1px solid var(--border-glass)",
        }}
      >
        {/* Base radar tile grid (real RainViewer data) */}
        {frame && (
          <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transition: "transform 0.35s ease" }}>
            {tiles.map((t, i) => (
              <img
                key={i}
                src={`${radar.host}${frame.path}/256/${TILE_Z}/${t.x}/${t.y}/2/1_1.png`}
                alt=""
                draggable={false}
                onError={(e) => (e.currentTarget.style.display = "none")}
                style={{
                  position: "absolute",
                  left: `calc(50% + ${(t.x - latLonToTile(center.lat, center.lon, TILE_Z).x) * 100}%)`,
                  top: `calc(50% + ${(t.y - latLonToTile(center.lat, center.lon, TILE_Z).y) * 100}%)`,
                  width: "100%",
                  height: "100%",
                  transform: "translate(-50%, -50%)",
                  opacity: 0.9,
                  filter: tint,
                  mixBlendMode: "screen",
                  pointerEvents: "none",
                }}
              />
            ))}
          </div>
        )}

        {/* Radar sweep */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 220,
            height: 220,
            marginLeft: -110,
            marginTop: -110,
            borderRadius: "50%",
            border: "1px solid rgba(56,189,248,0.35)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 220,
            height: 220,
            marginLeft: -110,
            marginTop: -110,
            borderRadius: "50%",
            background: "conic-gradient(from 0deg, rgba(56,189,248,0.35), transparent 40%)",
            animation: "spin 4s linear infinite",
            pointerEvents: "none",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 10,
            height: 10,
            marginLeft: -5,
            marginTop: -5,
            borderRadius: "50%",
            background: "var(--sky-blue)",
            boxShadow: "0 0 0 8px rgba(56,189,248,0.25)",
          }}
        />

        {/* Floating controls */}
        <div className="col" style={{ position: "absolute", right: 14, top: 14, gap: 8 }}>
          <ControlButton icon={<PlusOutlined />} onClick={() => setZoom((z) => Math.min(z + 0.2, 2))} />
          <ControlButton icon={<MinusOutlined />} onClick={() => setZoom((z) => Math.max(z - 0.2, 0.6))} />
          <ControlButton icon={<AimOutlined />} onClick={() => setZoom(1)} />
        </div>

        <div style={{ position: "absolute", bottom: 14, left: 14, right: 14 }}>
          <div className="glass-card glass-card--tight" style={{ padding: "10px 14px" }}>
            <Segmented block value={layer} onChange={setLayer} options={LAYERS} style={{ background: "transparent" }} />
          </div>
        </div>
      </div>

      <p className="text-tertiary" style={{ fontSize: 12, textAlign: "center", marginTop: 14 }}>
        {radarStatus === "loading" ? "Loading live radar…" : "Live radar from RainViewer · updates every 5 minutes"}
      </p>
    </div>
  );
}

function ControlButton({ icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="glass-card glass-card--tight"
      style={{ width: 38, height: 38, display: "grid", placeItems: "center", border: "none", cursor: "pointer", color: "#fff" }}
    >
      {icon}
    </button>
  );
}
