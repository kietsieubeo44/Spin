FROM node:20-bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 \
  build-essential \
  pkg-config \
  libsqlite3-dev \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --production

COPY . .

FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
  libsqlite3-0 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# copy app source and node_modules from builder
COPY --from=builder /app /app

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "server.js"]
FROM node:20-bullseye-slim AS builder
WORKDIR /usr/src/app

# Install build dependencies required for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    pkg-config \
    libsqlite3-dev \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# copy package manifests first for cached installs
COPY package.json package-lock.json* ./

# Install production dependencies (use npm ci when lockfile exists)
RUN if [ -f package-lock.json ]; then npm ci --only=production; else npm install --production; fi

# Copy app sources
COPY . .

FROM node:20-bullseye-slim AS runner
WORKDIR /usr/src/app

# Runtime library for sqlite
RUN apt-get update && apt-get install -y --no-install-recommends libsqlite3-0 ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy built app from builder
COPY --from=builder /usr/src/app /usr/src/app

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node","server.js"]