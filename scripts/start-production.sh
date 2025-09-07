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

echo "📊 Checking database status..."

# Extract database file path from NUXT_DATABASE_URL (for SQLite only)
if echo "$NUXT_DATABASE_URL" | grep -q "^file:"; then
    DB_FILE=$(echo "$NUXT_DATABASE_URL" | sed 's|^file:||')

    # Check if database file exists and has tables
    if [ ! -f "$DB_FILE" ] || [ $(sqlite3 "$DB_FILE" "SELECT count(name) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0") -eq 0 ]; then
        echo "📊 Database not found or empty, initializing schema..."

        # Create database with proper schema
        sqlite3 "$DB_FILE" < /app/prisma/schema.sql

        echo "✅ Database initialized with schema"
    else
        echo "📊 Database exists and has tables"
    fi
else
    echo "📊 Non-SQLite database detected, assuming external database is configured"
fi

echo "🚀 Starting AlleGutta application..."

# Start the application
exec node .output/server/index.mjs
