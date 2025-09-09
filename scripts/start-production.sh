#!/bin/sh

# Production startup script for AlleGutta
# Ensures database is properly initialized before starting the application

set -e

echo "🚀 Starting AlleGutta production setup..."

# Check for required NUXT_DATABASE_URL environment variable
if [ -z "$NUXT_DATABASE_URL" ]; then
    echo "❌ FATAL ERROR: NUXT_DATABASE_URL environment variable is required but not set."
    echo "   Please set NUXT_DATABASE_URL to a valid database connection string."
    echo "   Examples:"
    echo "   - SQLite: NUXT_DATABASE_URL=\"file:/app/data/production.db\""
    echo "   - PostgreSQL: NUXT_DATABASE_URL=\"postgresql://user:password@host:port/database\""
    echo "   - MySQL: NUXT_DATABASE_URL=\"mysql://user:password@host:port/database\""
    echo "   - Turso: NUXT_DATABASE_URL=\"libsql://your-database-url.turso.io?authToken=your-auth-token\""
    exit 1
fi

echo "✅ NUXT_DATABASE_URL is configured"

# Print all environment variables for debugging
echo "🔧 Environment Variables:"
echo "========================="
env | sort
echo "========================="

# Create data directory if it doesn't exist
mkdir -p /app/data

echo "📊 Checking database status and setting up schema..."

# Run our new production-safe database initialization
if [ -f "/app/scripts/init-db.sh" ]; then
    echo "🔄 Running production-safe database initialization..."
    if /app/scripts/init-db.sh production; then
        echo "✅ Database schema setup completed successfully"
    else
        echo "❌ Database schema setup failed"
        echo "🔧 Note: Application will attempt auto-recovery on startup"
        echo "⚠️  Continuing with application startup..."
    fi
else
    echo "⚠️  Production database script not found, using legacy approach..."
    
    # Note: The application will auto-initialize via server plugin
    echo "� Database will be initialized automatically by application startup"
fi

echo "🚀 Starting AlleGutta application..."

# Start the application
exec node .output/server/index.mjs
