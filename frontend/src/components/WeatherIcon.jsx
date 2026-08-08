const palette = {
  sunny: "#F59E0B",
  clouds: "#94A3B8",
  rain: "#38BDF8",
  snow: "#E2E8F0",
  night: "#A5B4FC",
};

/**
 * Lightweight animated SVG weather icon — avoids external icon packs so the
 * bundle stays small while still feeling premium and motion-rich.
 */
export default function WeatherIcon({ condition = "clouds", size = 40 }) {
  const color = palette[condition] || palette.clouds;

  if (condition === "sunny") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="10" fill={color}>
          <animate attributeName="r" values="10;11;10" dur="2.6s" repeatCount="indefinite" />
        </circle>
        {[...Array(8)].map((_, i) => {
          const angle = (i * Math.PI) / 4;
          const x1 = 24 + Math.cos(angle) * 16;
          const y1 = 24 + Math.sin(angle) * 16;
          const x2 = 24 + Math.cos(angle) * 21;
          const y2 = 24 + Math.sin(angle) * 21;
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2.5" strokeLinecap="round">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="2.6s" begin={`${i * 0.1}s`} repeatCount="indefinite" />
            </line>
          );
        })}
      </svg>
    );
  }

  if (condition === "rain") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <ellipse cx="24" cy="18" rx="14" ry="9" fill="#64748B" />
        <ellipse cx="15" cy="21" rx="9" ry="7" fill="#64748B" />
        {[14, 22, 30].map((x, i) => (
          <line key={x} x1={x} y1="30" x2={x - 3} y2="40" stroke={color} strokeWidth="2.5" strokeLinecap="round">
            <animate attributeName="y1" values="28;32;28" dur="1s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
            <animate attributeName="y2" values="38;42;38" dur="1s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.3;1" dur="1s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
          </line>
        ))}
      </svg>
    );
  }

  if (condition === "snow") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <ellipse cx="24" cy="18" rx="14" ry="9" fill="#94A3B8" />
        {[16, 24, 32].map((x, i) => (
          <circle key={x} cx={x} cy="32" r="2" fill={color}>
            <animate attributeName="cy" values="30;40;30" dur="2.2s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.2;1" dur="2.2s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>
    );
  }

  if (condition === "night") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <path
          d="M30 12a12 12 0 1 0 8 20.8A14 14 0 0 1 30 12Z"
          fill={color}
        >
          <animate attributeName="opacity" values="0.85;1;0.85" dur="3s" repeatCount="indefinite" />
        </path>
        {[[10, 12], [14, 20], [8, 26]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.3" fill="#fff">
            <animate attributeName="opacity" values="0.2;1;0.2" dur="1.8s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>
    );
  }

  // clouds (default)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <ellipse cx="24" cy="24" rx="15" ry="10" fill={color}>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 2 0; 0 0"
          dur="4s"
          repeatCount="indefinite"
        />
      </ellipse>
      <ellipse cx="14" cy="27" rx="9" ry="7" fill={color} opacity="0.85" />
    </svg>
  );
}
