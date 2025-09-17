# Ultra-minimal Dockerfile optimized for size while keeping essential functionality

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy application code (filtered by .dockerignore)
COPY . .

# Force build step to run by adding timestamp and cache-busting
ARG BUILD_DATE
ARG BUILD_VERSION
ENV BUILD_DATE=${BUILD_DATE:-"manual-build"}
ENV BUILD_VERSION=${BUILD_VERSION:-"dev"}

# Build the application (timestamp ensures this always runs)
RUN echo "Building application version $BUILD_VERSION at $BUILD_DATE" && \
    pnpm run build

# Production stage - minimal alpine with only essential runtime tools
FROM node:22-alpine AS production

# Install only absolute minimal runtime dependencies
RUN apk add --no-cache dumb-init

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nuxtjs -u 1001

# Copy only essential runtime files
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/prisma/schema.sql ./schema.sql
COPY scripts/start-production.sh ./start-production.sh

# Make scripts executable and create data directory
RUN chmod +x ./start-production.sh && \
    mkdir -p /app/data && \
    chown -R nuxtjs:nodejs /app

# Switch to non-root user
USER nuxtjs

# Expose port
EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application with initialization support
CMD ["./start-production.sh"]
