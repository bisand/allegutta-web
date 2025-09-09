#!/bin/bash

# Manual GAV Migration Script for Production
# This script applies the database schema changes for manual GAV functionality

set -e

echo "🔄 Starting Manual GAV database migration..."

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

# Check if database file exists (for SQLite)
if [ ! -f "./dev.db" ] && [ ! -f "/app/data/portfolio.db" ]; then
    echo "❌ Error: Database file not found"
    exit 1
fi

# Backup the database first
echo "📦 Creating database backup..."
if [ -f "/app/data/portfolio.db" ]; then
    # Production backup
    cp /app/data/portfolio.db /app/data/portfolio.db.backup.$(date +%Y%m%d_%H%M%S)
    DB_PATH="/app/data/portfolio.db"
elif [ -f "./dev.db" ]; then
    # Development backup
    cp ./dev.db ./dev.db.backup.$(date +%Y%m%d_%H%M%S)
    DB_PATH="./dev.db"
fi

echo "✅ Database backed up"

# Apply the migration
echo "🔧 Applying manual GAV schema changes..."

# Use sqlite3 to apply the migration
sqlite3 "$DB_PATH" < scripts/migrate-manual-gav.sql

echo "✅ Migration applied successfully"

# Regenerate Prisma client
echo "🔄 Regenerating Prisma client..."
npx prisma generate

echo "✅ Prisma client regenerated"

# Verify the migration
echo "🔍 Verifying migration..."
sqlite3 "$DB_PATH" "PRAGMA table_info(holdings);" | grep -E "(manualAvgPrice|useManualAvgPrice|manualAvgPriceReason|manualAvgPriceDate)"

if [ $? -eq 0 ]; then
    echo "✅ Migration verification successful - Manual GAV fields are present"
else
    echo "❌ Migration verification failed - Manual GAV fields not found"
    exit 1
fi

echo "🎉 Manual GAV migration completed successfully!"
echo "📝 The application now supports manual GAV overrides"
