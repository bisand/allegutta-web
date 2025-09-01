#!/bin/bash

# Database initialization and migration script
# Usage: ./scripts/init-db.sh [environment]

set -e

ENVIRONMENT=${1:-development}

echo "🚀 Initializing database for environment: $ENVIRONMENT"

case $ENVIRONMENT in
  "development")
    echo "📊 Setting up development database..."
    export DATABASE_URL="file:./dev.db"
    ;;
  "docker")
    echo "🐳 Setting up Docker database..."
    # Ensure data directory exists
    mkdir -p /app/data
    export DATABASE_URL="file:/app/data/production.db"
    ;;
  "production")
    echo "🏭 Setting up production database..."
    if [ -z "$DATABASE_URL" ]; then
      echo "❌ ERROR: DATABASE_URL environment variable is required for production"
      exit 1
    fi
    ;;
  *)
    echo "❌ ERROR: Unknown environment: $ENVIRONMENT"
    echo "Available environments: development, docker, production"
    exit 1
    ;;
esac

echo "📋 Current DATABASE_URL: $DATABASE_URL"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
pnpm prisma generate

# Run database migrations
echo "🔄 Running database migrations..."
pnpm prisma db push

# Check if database needs seeding
if [ "$ENVIRONMENT" = "development" ] || [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database..."
  if [ -f "scripts/seed.js" ]; then
    node scripts/seed.js
  else
    echo "⚠️  No seed script found, skipping..."
  fi
fi

echo "✅ Database initialization complete!"

# Health check
echo "🏥 Running health check..."
if command -v curl &> /dev/null; then
  # Wait for server to start (if running)
  sleep 2
  curl -f http://localhost:3000/api/health || echo "⚠️  Health check failed (server may not be running)"
else
  echo "ℹ️  curl not available, skipping health check"
fi

echo "🎉 Database setup completed successfully!"
