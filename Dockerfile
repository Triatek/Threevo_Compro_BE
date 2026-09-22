# syntax=docker/dockerfile:1

# ---------- Base ----------
FROM node:22-alpine AS base
# Prisma query engine needs OpenSSL on Alpine.
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

# ---------- Dependencies ----------
FROM base AS deps
COPY package.json package-lock.json ./
# Production dependencies only. The Prisma CLI is a devDependency but is needed to run
# `prisma migrate deploy` on start, so its exact version is taken from the lockfile.
RUN npm ci --omit=dev \
 && PRISMA_VERSION="$(node -p "require('./package-lock.json').packages['node_modules/prisma'].version")" \
 && npm install --no-save --omit=dev "prisma@${PRISMA_VERSION}" \
 && npm cache clean --force
COPY prisma.config.js ./
COPY prisma ./prisma
RUN npx prisma generate

# ---------- Runtime ----------
FROM base AS runner
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json package-lock.json prisma.config.js ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node src ./src
COPY --chown=node:node docs/openapi.yaml ./docs/openapi.yaml
RUN mkdir -p uploads && chown node:node uploads

# Never run as root.
USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-4000}/api/v1/health" > /dev/null || exit 1

# Applies pending migrations, then starts the server.
CMD ["npm", "run", "start:prod"]
