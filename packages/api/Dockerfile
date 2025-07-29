# Multi-stage build for HandoverKey API
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY packages/api/package*.json ./packages/api/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/core/package*.json ./packages/core/
COPY packages/database/package*.json ./packages/database/

# Install dependencies (production only)
RUN npm ci --omit=dev && npm cache clean --force

# Build stage
FROM base AS builder
WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package*.json ./
COPY turbo.json ./
COPY packages/api/package*.json ./packages/api/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/core/package*.json ./packages/core/
COPY packages/database/package*.json ./packages/database/

RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/core ./packages/core
COPY packages/database ./packages/database
COPY packages/api ./packages/api
COPY tsconfig.json ./

# Build the application
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/core
RUN npm run build --workspace=packages/database
RUN npm run build --workspace=packages/api

# Production stage
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 handoverkey

# Copy production dependencies (hoisted to root in monorepo)
COPY --from=deps --chown=handoverkey:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=handoverkey:nodejs /app/packages/api/dist ./dist

# Copy built internal packages to their expected locations in node_modules
COPY --from=builder --chown=handoverkey:nodejs /app/packages/shared/dist ./node_modules/@handoverkey/shared/dist
COPY --from=builder --chown=handoverkey:nodejs /app/packages/shared/package.json ./node_modules/@handoverkey/shared/package.json
COPY --from=builder --chown=handoverkey:nodejs /app/packages/core/dist ./node_modules/@handoverkey/core/dist
COPY --from=builder --chown=handoverkey:nodejs /app/packages/core/package.json ./node_modules/@handoverkey/core/package.json
COPY --from=builder --chown=handoverkey:nodejs /app/packages/database/dist ./node_modules/@handoverkey/database/dist
COPY --from=builder --chown=handoverkey:nodejs /app/packages/database/package.json ./node_modules/@handoverkey/database/package.json

# Copy package.json for runtime
COPY --chown=handoverkey:nodejs packages/api/package*.json ./

USER handoverkey

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/index.js"]