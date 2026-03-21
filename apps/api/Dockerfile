FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --workspace=apps/api --workspace=packages/db --workspace=packages/shared

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./package.json
COPY tsconfig.json ./tsconfig.json
COPY apps/api ./apps/api
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared

RUN npx prisma generate --schema=packages/db/prisma/schema.prisma
RUN npm run build --workspace=packages/db
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/api

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json

EXPOSE 3001
CMD ["node", "apps/api/dist/apps/api/src/index.js"]