# Multi-stage production build for AegisPay Sentinel
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests
COPY package.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm install --prefix backend && npm install --prefix frontend

# Copy sources and data
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY osm_shops.json ./

# Build backend and frontend
RUN npm run build --prefix backend && npm run build --prefix frontend

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/osm_shops.json ./osm_shops.json
COPY --from=builder /app/backend/src/data/osm_shops.json ./backend/src/data/osm_shops.json
COPY package.json ./

EXPOSE 5000

CMD ["node", "backend/dist/index.js"]
