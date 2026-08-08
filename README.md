# WeatherBuddy AI

A premium, AI-flavored **live** weather app — dark-mode-first, glassmorphic UI built
with **React + Vite + Redux Toolkit + Ant Design**, backed by an **Express** API with
**SQLite**, real user accounts, **Stripe** billing, and **plan-gated** premium features.

```
weatherbuddy-ai/
├── frontend/   React app (Vite, Redux Toolkit, Ant Design)
└── backend/    Express API (real weather, auth, billing, SQLite)
```

## Quick start

Open two terminals.

**1. Backend (http://localhost:5000)**
```bash
cd backend
cp .env.example .env    # optional — works with defaults too
npm install
npm run dev             # or: npm start
```

**2. Frontend (http://localhost:5173)**
```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api/*` to `http://localhost:5000`. Open
http://localhost:5173 in your browser (best at mobile width — the app is capped at 480px).

## What actually works now

- **Real weather data** — live current / hourly / 7-day forecasts and air quality from
  [Open-Meteo](https://open-meteo.com) (no API key required). City search uses real geocoding.
- **Now playing & upcoming movies** — live from [The Movie Database (TMDB)](https://developers.themoviedb.org/3)
  (`/movie/now_playing` + `/movie/upcoming`, scoped to `region=IN`, `language=ta-IN` for
  India/Tamil releases). Free API key → set `TMDB_API_KEY`. Without a key it shows a curated
  Tamil list instead (the `/api/movies` response's `source` field reports `tmdb` or `fallback`).
- **Real user accounts** — signup / login with bcrypt-hashed passwords and JWT sessions.
  The "user" on the Profile screen is now the logged-in account, not hardcoded text.
- **A real database** — SQLite stores users, preferences, favorites, and subscriptions, so
  nothing resets when the backend restarts.
- **Plans that persist** — which user has which plan lives in the DB.
- **Backend plan-gating** — premium-only data (AI weather summary, smart insight scores,
  live radar) is only returned to users whose plan says they've paid. Free users get 403 on
  premium endpoints.
- **Frontend plan-locking** — free users see a locked AI-summary card and a locked radar
  screen with an upgrade call-to-action instead of the premium content.
- **A real payment processor** — Stripe Checkout (test mode) charges a card and a webhook
  records the subscription. Without Stripe keys it falls back to a simulated checkout that
  still records the plan in the DB, so the whole upgrade flow is testable today.
- **Live radar** — real precipitation tiles from [RainViewer](https://www.rainviewer.com) (no key),
  shown only to premium users.
- **Tapping a search result loads that city** — pick any search/favorite/recent city and it
  becomes the Home forecast. Favorites can be starred and are saved per account.
- **Profile settings actually work** — working logout, theme (dark/light), units (°C/°F, converts
  temperatures), notification toggle, and real Privacy / About dialogs.

## Premium features (gated by plan)

| Feature | Free | Premium |
|---|---|---|
| Current + hourly + 7-day forecast | ✅ | ✅ |
| City search & per-account favorites | ✅ | ✅ |
| Alerts / notifications | ✅ | ✅ |
| AI weather summary | ❌ (locked) | ✅ |
| Smart activity insights | ❌ | ✅ |
| Live radar (RainViewer) | ❌ (locked) | ✅ |

Plans: **Free**, **Premium** ($4.99/mo), **Premium Plus** ($9.99/mo), **Family** ($14.99/mo).

## Backend structure

```
backend/
├── server.js              Express app, JSON/raw-body parsing, routes
├── routes/
│   ├── auth.js            signup, login, /me, prefs
│   ├── weather.js         live forecast, search, favorites, notifications, plans, radar
│   └── billing.js         Stripe checkout + webhook (with dev fallback)
├── services/
│   └── weather.js         Open-Meteo + AI-summary/insights generation
├── middleware/
│   └── auth.js            JWT sign/verify, optionalAuth, requireAuth
└── data/
    ├── db.js              SQLite schema + queries
    └── weatherbuddy.db    created on first run (gitignored)
```

## Stripe setup (optional, for real card payments)

The app works out of the box using the built-in **dev checkout**. To actually charge a card:

1. Create a [Stripe](https://stripe.com) account and grab your **test** secret key.
2. Put it in `backend/.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_xxx
   ```
3. For live webhooks, forward to the backend and set `STRIPE_WEBHOOK_SECRET`:
   ```bash
   stripe listen --forward-to localhost:5000/api/billing/webhook
   ```
   Then use the `whsec_...` value it prints in `STRIPE_WEBHOOK_SECRET`.

Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

## Environment

| Variable | Where | Purpose |
|---|---|---|
| `PORT` | backend/.env | Backend port (default 5000) |
| `JWT_SECRET` | backend/.env | Token signing secret (change in prod) |
| `STRIPE_SECRET_KEY` | backend/.env | Enables real Stripe checkout (test mode) |
| `STRIPE_WEBHOOK_SECRET` | backend/.env | Verifies Stripe webhook signatures |
| `TMDB_API_KEY` | backend/.env | Live movies via TMDB (https://www.themoviedb.org/settings/api) |
| `VITE_API_BASE_URL` | frontend/.env | Backend URL if not proxied |

**Note:** A demo account `test@wb.com` (password `secret123`) may exist from testing. Delete
`backend/data/weatherbuddy.db` and restart to reset all data.
