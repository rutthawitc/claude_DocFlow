# Production Dockerfile for Claude DocFlow
# Using Node.js 22 'Jod' (LTS) for latest LTS features and stability
FROM node:22-alpine3.22 AS base

# Install dependencies only when needed
FROM base AS deps
# Add security updates and essential packages
RUN apk add --no-cache \
    libc6-compat \
    dumb-init \
    && apk upgrade --no-cache

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies with security and performance optimizations
RUN corepack enable pnpm && \
    pnpm install --frozen-lockfile --prefer-offline --production=false --ignore-scripts && \
    pnpm store prune

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application with necessary native dependencies
RUN corepack enable pnpm && \
    pnpm rebuild esbuild sharp && \
    pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Install runtime dependencies and security updates
RUN apk add --no-cache \
    curl \
    dumb-init \
    && apk upgrade --no-cache \
    && rm -rf /var/cache/apk/*

# Create nextjs user with specific UID/GID for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

# Copy necessary files from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create directories and set proper permissions
RUN mkdir -p /app/tmp /app/uploads /app/logs && \
    chown -R nextjs:nodejs /app && \
    chmod -R 755 /app

# Switch to non-root user for security
USER nextjs

# Expose port
EXPOSE 3000

# Set runtime environment variables
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init to handle signals properly and run as PID 1
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "server.js"]