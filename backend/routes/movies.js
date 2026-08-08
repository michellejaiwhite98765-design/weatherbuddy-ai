import { Router } from "express";
import { getMovies } from "../services/movies.js";

const router = Router();

// GET /api/movies — now playing + upcoming, from TMDB (live) or the curated
// fallback list. Public: it's a movie catalog, no account required.
router.get("/", async (_req, res) => {
  try {
    const data = await getMovies();
    res.json(data);
  } catch (err) {
    console.error("movies error:", err.message);
    res.status(502).json({ error: "Could not load movies right now." });
  }
});

export default router;
