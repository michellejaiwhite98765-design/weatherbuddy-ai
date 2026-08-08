# node:20-slim (Debian/glibc) so better-sqlite3 uses a prebuilt binary instead of
# compiling from source on alpine/musl.
FROM node:20-slim

WORKDIR /app

# --- backend deps first (best layer caching) ---
COPY backend/package.json backend/package-lock.json backend/
RUN npm ci --prefix backend --omit=dev

# --- frontend deps (dev deps needed for the Vite build) ---
COPY frontend/package.json frontend/package-lock.json frontend/
RUN npm ci --prefix frontend

# --- sources ---
COPY backend backend/
COPY frontend frontend/

# Build the frontend INTO backend/public so the Express server can serve it.
RUN npm --prefix frontend run build

ENV NODE_ENV=production
EXPOSE 3000

# Mount target for future SQLite persistence (free tier disk is ephemeral).

CMD ["node", "backend/server.js"]
