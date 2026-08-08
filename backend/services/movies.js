// Live movies from The Movie Database (TMDB) — https://www.themoviedb.org/documentation/api
//
// Endpoints used:
//   GET https://api.themoviedb.org/3/movie/now_playing  → currently in theatres
//   GET https://api.themoviedb.org/3/movie/upcoming     → releasing soon
// Both are scoped to region=IN and language=ta-IN so Indian/Tamil releases and
// Tamil metadata show up for viewers in Tamil Nadu.
//
// TMDB is free to use. Get an API key here: https://www.themoviedb.org/settings/api
// then put it in backend/.env as TMDB_API_KEY.
//
// When no key is set (or TMDB is unreachable) we fall back to a small curated
// list of Tamil titles so the Movies tab always has content — the response's
// `source` field tells the UI whether it's "tmdb" (live) or "fallback" (sample).

const TMDB_URL = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";

const nowPlayingFallback = [
  { title: "Coolie", releaseDate: "2025-08-14", overview: "Action entertainer. A dock worker's past catches up with him.", rating: 7.8, language: "ta" },
  { title: "Vidaamuyarchi", releaseDate: "2025-02-06", overview: "A man fights to bring his wife home.", rating: 6.9, language: "ta" },
  { title: "Jailer 2", releaseDate: "2026-07-03", overview: "The sequel to the blockbuster action drama.", rating: 7.1, language: "ta" },
  { title: "Vettaiyan", releaseDate: "2025-10-10", overview: "A retired police officer returns to the field.", rating: 6.8, language: "ta" },
  { title: "GOAT", releaseDate: "2025-09-05", overview: "Time-bending spy thriller with mass appeal.", rating: 7.0, language: "ta" },
];

const upcomingFallback = [
  { title: "Thug Life", releaseDate: "2026-12-18", overview: "Mani Ratnam's crime drama.", rating: 0, language: "ta" },
  { title: "Retro", releaseDate: "2026-10-09", overview: "A gritty rural action film.", rating: 0, language: "ta" },
  { title: "Jailer 3", releaseDate: "2027-01-14", overview: "Third installment of the franchise.", rating: 0, language: "ta" },
  { title: "Coolie 2", releaseDate: "2026-11-20", overview: "Lokesh Kanagaraj's next actioner.", rating: 0, language: "ta" },
  { title: "Indian 3", releaseDate: "2027-04-14", overview: "Senapathy returns.", rating: 0, language: "ta" },
];

const toCard = (m) => ({
  id: m.id,
  title: m.title,
  releaseDate: m.release_date || "",
  posterUrl: m.poster_path ? `${IMG_BASE}${m.poster_path}` : null,
  backdropUrl: m.backdrop_path ? `https://image.tmdb.org/t/p/w300${m.backdrop_path}` : null,
  overview: m.overview || "",
  rating: m.vote_average || 0,
  language: m.original_language || "",
  genres: m.genre_ids || [],
});

async function tmdbFetch(path) {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("No TMDB_API_KEY configured");
  const url = `${TMDB_URL}${path}&api_key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

export async function getMovies() {
  if (process.env.TMDB_API_KEY) {
    try {
      const [now, upcoming] = await Promise.all([
        tmdbFetch("/movie/now_playing?language=ta-IN&region=IN&page=1"),
        tmdbFetch("/movie/upcoming?language=ta-IN&region=IN&page=1"),
      ]);
      return {
        source: "tmdb",
        nowPlaying: (now.results || []).slice(0, 20).map(toCard),
        upcoming: (upcoming.results || []).slice(0, 20).map(toCard),
      };
    } catch (err) {
      console.error("TMDB unavailable, using fallback list:", err.message);
    }
  }
  // Fallback: curated Tamil list (works with no key / when TMDB is down).
  return { source: "fallback", nowPlaying: nowPlayingFallback, upcoming: upcomingFallback };
}
