FROM node:22-slim

WORKDIR /app

# Native build dependencies required by better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Backend dependencies
COPY backend/package.json backend/package-lock.json backend/
RUN npm ci --prefix backend --omit=dev

# Frontend dependencies
COPY frontend/package.json frontend/package-lock.json frontend/
RUN npm ci --prefix frontend

# Source code
COPY backend backend/
COPY frontend frontend/

# Build frontend
RUN npm --prefix frontend run build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "backend/server.js"]