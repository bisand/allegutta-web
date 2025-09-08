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

echo "📊 Checking database status and running migrations..."

# Run database migration script
if [ -f "/app/scripts/migrate-db.sh" ]; then
    echo "🔄 Running database migration script..."
    if /app/scripts/migrate-db.sh; then
        echo "✅ Database migration completed successfully"
    else
        echo "❌ Database migration failed"
        exit 1
    fi
else
    echo "⚠️  Migration script not found, using legacy migration..."

    # Legacy fallback migration logic
    if echo "$NUXT_DATABASE_URL" | grep -q "^file:"; then
        DB_FILE=$(echo "$NUXT_DATABASE_URL" | sed 's|^file:||')
        echo "📊 SQLite database detected: $DB_FILE"

        # Create database directory if it doesn't exist
        mkdir -p "$(dirname "$DB_FILE")"

        # Try Prisma migrations first
        echo "🔄 Running Prisma database migrations..."
        if npx prisma migrate deploy; then
            echo "✅ Database migrations completed successfully"
        else
            echo "❌ Database migration failed, attempting fallback to schema.sql..."

            # Fallback: use schema.sql if migrations fail
            if [ -f "/app/prisma/schema.sql" ]; then
                sqlite3 "$DB_FILE" < /app/prisma/schema.sql
                echo "⚠️  Database initialized with schema.sql (fallback method)"
            else
                echo "❌ FATAL: No schema.sql fallback found and migrations failed"
                exit 1
            fi
        fi
    else
        echo "📊 External database detected, running migrations..."
        if npx prisma migrate deploy; then
            echo "✅ Database migrations completed successfully"
        else
            echo "❌ Database migration failed for external database"
            exit 1
        fi
    fi
fi

echo "🚀 Starting AlleGutta application..."

# Start the application
exec node .output/server/index.mjs
