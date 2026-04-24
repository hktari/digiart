FROM node:20-alpine AS base
RUN npm i -g pnpm@9

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml pnpm-approved-builds.json ./
COPY apps/pdf-worker/package.json ./apps/pdf-worker/
COPY apps/mvp/package.json ./apps/mvp/
RUN pnpm install --frozen-lockfile --prod=false

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/pdf-worker/node_modules ./apps/pdf-worker/node_modules
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/pdf-worker ./apps/pdf-worker
COPY tsconfig.base.json ./
RUN cd apps/pdf-worker && npx prisma generate
RUN pnpm --filter pdf-worker build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/apps/pdf-worker/dist ./apps/pdf-worker/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/pdf-worker/package.json ./apps/pdf-worker/
COPY --from=builder --chown=nestjs:nodejs /app/apps/pdf-worker/prisma ./apps/pdf-worker/prisma

# Copy production dependencies (from builder to include generated Prisma client)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/pdf-worker/node_modules ./apps/pdf-worker/node_modules

USER nestjs

EXPOSE 3001

CMD ["node", "apps/pdf-worker/dist/main.js"]
