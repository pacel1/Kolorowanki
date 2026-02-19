# Stage 1: Base
FROM node:20-alpine AS base
RUN corepack enable

# Stage 2: Dependencies
FROM base AS deps
WORKDIR /app

# Copy monorepo config files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/db/package.json packages/db/
COPY packages/ai/package.json packages/ai/
COPY packages/config/package.json packages/config/
COPY packages/pdf/package.json packages/pdf/
COPY packages/storage/package.json packages/storage/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod

# Stage 3: Build
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN pnpm --filter @coloring/db exec prisma generate

# Build worker
RUN pnpm --filter worker build

# Stage 4: Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built worker
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker/package.json ./apps/worker/

# Start worker
CMD ["node", "apps/worker/dist/worker.js"]
