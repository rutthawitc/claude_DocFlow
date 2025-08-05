# /Users/rutthawit/my-coding/Next15-APPS/nextjs15-pnpm-boilerplate/pwa_boilerplate_next15_pnpm_v1/Dockerfile

# Stage 1: Dependencies and build
FROM node:24.0-slim AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prefer-offline

# Copy application code
COPY . .

# Build application
RUN pnpm build

# Stage 2: Production runtime
FROM node:24.0-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install pnpm
RUN npm install -g pnpm

# Copy production dependencies and built application
COPY --from=builder /app/package.json /app/pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile --prefer-offline

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./

# Create user with proper home directory
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 --home /home/nextjs --shell /bin/bash nextjs

# Set up pnpm directories with proper permissions
RUN mkdir -p /home/nextjs/.local/share/pnpm
RUN chown -R nextjs:nodejs /home/nextjs
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose port
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]

# PostgreSQL database service
# Use in docker-compose.yml:
# services:
#   db:
#     image: postgres:17.4-alpine
#     environment:
#       - POSTGRES_USER=postgres
#       - POSTGRES_PASSWORD=postgres
#       - POSTGRES_DB=nextjs_db
#     volumes:
#       - postgres_data:/var/lib/postgresql/data
#     ports:
#       - "5432:5432"

# pgAdmin service
# Use in docker-compose.yml:
# services:
#   pgadmin:
#     image: elestio/pgadmin:latest
#     environment:
#       - PGADMIN_DEFAULT_EMAIL=admin@example.com
#       - PGADMIN_DEFAULT_PASSWORD=adminpassword
#     ports:
#       - "5050:80"
#     depends_on:
#       - db
