# ── Stage 1: Build the Angular app ────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app/frontend

# Install dependencies first (layer cache)
COPY frontend/package*.json ./
RUN npm ci

# Copy the rest of the frontend source and build in production mode
COPY frontend/ ./
RUN npx ng build --configuration production

# ── Stage 2: Run the Express server ───────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies for the backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy the Express server
COPY backend/server.js ./

# Copy the Angular build output from the builder stage.
# Angular 17 application-builder puts browser assets in dist/skullking/browser/.
COPY --from=builder /app/frontend/dist/skullking/browser ./dist/browser

EXPOSE 3000

CMD ["node", "server.js"]
