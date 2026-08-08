import { useMemo, useState } from "react";

const rand = (min, max) => Math.random() * (max - min) + min;

// Curated, watermark-free cinematic Unsplash photos per condition.
// Each entry is [primaryId, fallbackId]. The fallback covers a broken primary.
const PHOTOS = {
  sunny: ["1501594907352-04cda38ebc29", "1507525428034-b723cf961d3e"],
  rain: ["1562157873-818bc0726f68", "1519692933481-e162a57d6721"],
  storm: ["1534088568595-a066f410bcda", "1562157873-818bc0726f68"],
  clouds: ["1501630834273-4b5604d2ee31", "1500534314209-a25ddb2bd429"],
  snow: ["1491002052546-bf38f186af56", "1501630834273-4b5604d2ee31"],
  night: ["1419242902214-272b3f66ee7a", "1519681393784-d120267933ba"],
};

// Solid fallback gradient shown behind the photo (and alone if the image fails).
function gradientFor(condition, temp, isDay) {
  const night = !isDay && condition !== "snow";
  if (night || condition === "night") return "linear-gradient(160deg, #0d0520 0%, #1a0b2e 45%, #241240 100%)";
  if (condition === "rain" || condition === "storm") return "linear-gradient(160deg, #3b2a63 0%, #2d1b4e 45%, #1a0b2e 100%)";
  if (condition === "snow") return "linear-gradient(160deg, #7b6ba6 0%, #5b4a8a 55%, #2d1b4e 100%)";
  if (condition === "clouds") return "linear-gradient(160deg, #4c3a78 0%, #3b2a63 40%, #241240 78%, #1a0b2e 100%)";
  if (temp >= 32) return "linear-gradient(160deg, #9333ea 0%, #a855f7 28%, #7c3aed 72%, #2d1b4e 100%)";
  if (temp >= 26) return "linear-gradient(160deg, #9d5cff 0%, #7c3aed 30%, #4c1d95 72%, #1a0b2e 100%)";
  return "linear-gradient(160deg, #b96bff 0%, #7c3aed 50%, #4c1d95 82%, #1a0b2e 100%)";
}

function imgUrl(id, w = 1200) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=72`;
}

export default function WeatherBackground({ condition = "clouds", temp = 25, isDay = true }) {
  const effCondition = !isDay && condition !== "snow" ? "night" : condition;
  const photos = PHOTOS[effCondition] || PHOTOS.rain;
  const bg = useMemo(() => gradientFor(effCondition, temp, isDay), [effCondition, temp, isDay]);

  // Swap to the fallback photo if the primary 404s.
  const [imgIdx, setImgIdx] = useState(0);
  const url = imgUrl(photos[imgIdx]);

  const isRain = effCondition === "rain";
  const rainStreaks = isRain ? Array.from({ length: 30 }) : [];
  const rainDrops = isRain ? Array.from({ length: 14 }) : [];
  const snowflakes = effCondition === "snow" ? Array.from({ length: 18 }) : [];
  const stars = effCondition === "night" ? Array.from({ length: 30 }) : [];

  return (
    <div
      className={`weather-bg weather-bg--${effCondition}`}
      style={{ background: bg, transition: "background 1.2s ease" }}
    >
      {/* Cinematic photo — onError swaps to the fallback ID, gradient shows behind */}
      <img
        key={url}
        src={url}
        alt=""
        className="weather-photo"
        onError={() => setImgIdx((i) => (i < photos.length - 1 ? i + 1 : i))}
      />
      <div className="weather-photo-shade" />
      <div className="bg-glow bg-glow--a" />
      <div className="bg-glow bg-glow--b" />

      {/* Falling rain streaks */}
      {rainStreaks.map((_, i) => (
        <div
          key={i}
          className="rain-streak"
          style={{
            left: `${rand(0, 100)}%`,
            height: `${rand(40, 90)}px`,
            opacity: rand(0.4, 0.9),
            animationDuration: `${rand(0.5, 1.1)}s`,
            animationDelay: `${rand(0, 1.5)}s`,
          }}
        />
      ))}

      {/* Droplets on the "screen" */}
      {rainDrops.map((_, i) => (
        <div
          key={i}
          className="rain-droplet"
          style={{
            left: `${rand(2, 96)}%`,
            top: `${rand(2, 92)}%`,
            width: `${rand(3, 7)}px`,
            height: `${rand(5, 10)}px`,
            animationDuration: `${rand(3, 6)}s`,
            animationDelay: `${rand(0, 4)}s`,
          }}
        />
      ))}

      {snowflakes.map((_, i) => {
        const s = rand(2, 5);
        return (
          <div
            key={i}
            className="snowflake"
            style={{
              left: `${rand(0, 100)}%`,
              width: s,
              height: s,
              animationDuration: `${rand(4, 8)}s`,
              animationDelay: `${rand(0, 4)}s`,
            }}
          />
        );
      })}

      {stars.map((_, i) => (
        <div
          key={i}
          className="star"
          style={{
            left: `${rand(0, 100)}%`,
            top: `${rand(0, 60)}%`,
            animationDuration: `${rand(1.5, 3.5)}s`,
            animationDelay: `${rand(0, 3)}s`,
          }}
        />
      ))}
    </div>
  );
}
