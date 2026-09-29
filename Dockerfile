FROM node:24.21.0-bookworm-slim AS frontend-builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html tsconfig.json vite.config.mjs ./
COPY src ./src
RUN npm run build

FROM node:24.21.0-bookworm-slim AS backend-builder

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend ./
RUN npm run build

FROM node:24.21.0-bookworm-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./backend/
RUN npm --prefix backend ci --omit=dev

COPY --from=frontend-builder /app/dist ./dist
COPY --from=backend-builder /app/backend/dist ./backend/dist

USER node

EXPOSE 4000

CMD ["node", "backend/dist/proxyServer.js"]
