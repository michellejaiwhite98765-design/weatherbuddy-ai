import { useEffect, useState } from "react";
import { api } from "../store/api";

const POSTER_W = 140;
const POSTER_H = 205;

// Poster card used in both the Now Showing and Upcoming rails.
function MovieCard({ movie }) {
  return (
    <div style={{ width: POSTER_W, flexShrink: 0 }}>
      {movie.posterUrl ? (
        <img
          src={movie.posterUrl}
          alt={movie.title}
          loading="lazy"
          style={{ width: POSTER_W, height: POSTER_H, borderRadius: 18, objectFit: "cover", background: "#1e293b" }}
        />
      ) : (
        <div
          style={{
            width: POSTER_W,
            height: POSTER_H,
            borderRadius: 18,
            background: "var(--gradient-hero)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: 12,
            color: "var(--text-secondary)",
            fontSize: 12,
          }}
        >
          {movie.title}
        </div>
      )}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.3 }}>
          {movie.title}
        </div>
        <div style={{ marginTop: 3, fontSize: 11, color: "var(--text-tertiary)" }}>
          {movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "—"}
          {movie.rating > 0 ? `  •  ★ ${movie.rating.toFixed(1)}` : ""}
          {movie.language ? `  •  ${movie.language.toUpperCase()}` : ""}
        </div>
      </div>
    </div>
  );
}

function Rail({ title, movies }) {
  if (!movies || movies.length === 0) return null;
  return (
    <section style={{ marginTop: 26 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 14 }}>{title}</h2>
      <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
        {movies.map((m) => (
          <MovieCard key={m.id || m.title} movie={m} />
        ))}
      </div>
    </section>
  );
}

export default function Movies() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");

  const load = () => {
    setStatus("loading");
    api
      .get("/movies")
      .then((res) => {
        setData(res.data);
        setStatus("ok");
      })
      .catch(() => setStatus("failed"));
  };

  useEffect(load, []);

  return (
    <div className="screen" style={{ paddingTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)" }}>Movies</h1>
        {data && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "6px 10px",
              borderRadius: 999,
              color: data.source === "tmdb" ? "#34d399" : "var(--text-tertiary)",
              background: "var(--surface-glass)",
              border: "1px solid var(--border-glass)",
            }}
          >
            {data.source === "tmdb" ? "● Live · TMDB" : "Sample list"}
          </span>
        )}
      </div>
      <p style={{ marginTop: 4, fontSize: 13, color: "var(--text-tertiary)" }}>
        Now showing &amp; upcoming releases for India / Tamil Nadu. Live data from The Movie Database.
      </p>

      {status === "loading" && (
        <div style={{ marginTop: 24 }}>
          <div className="skeleton" style={{ height: 26, width: 140 }} />
          <div className="skeleton" style={{ height: POSTER_H, marginTop: 14 }} />
          <div className="skeleton" style={{ height: 26, width: 140, marginTop: 26 }} />
          <div className="skeleton" style={{ height: POSTER_H, marginTop: 14 }} />
        </div>
      )}

      {status === "failed" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginTop: 80, padding: "0 24px" }}>
          <h2 style={{ fontSize: 18, color: "var(--text-primary)" }}>Couldn't load movies</h2>
          <p className="text-secondary" style={{ fontSize: 13, marginTop: 8 }}>Check your connection and try again.</p>
          <button onClick={load} className="gradient-btn" style={{ marginTop: 20, padding: "13px 30px", borderRadius: 14, fontWeight: 700, cursor: "pointer" }}>
            Retry
          </button>
        </div>
      )}

      {status === "ok" && (
        <>
          <Rail title="Now Showing" movies={data.nowPlaying} />
          <Rail title="Upcoming" movies={data.upcoming} />
        </>
      )}
    </div>
  );
}
