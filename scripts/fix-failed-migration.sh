#!/bin/sh

# Quick fix for failed migration in production
# This script resolves the failed migration and gets the database back to a working state

set -e

echo "🔧 AlleGutta Production Migration Fix"
echo "===================================="

# Check if we're in the right directory
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Error: prisma/schema.prisma not found. Run this script from the app root directory."
    exit 1
fi

echo "🔍 Checking migration status..."

# Check current migration status
echo "📊 Current migration status:"
npx prisma migrate status --schema=prisma/schema.prisma || true

echo ""
echo "🔧 Resolving failed migration 20250908050111_init..."

# The database already has the tables, so we mark the failed migration as applied
if npx prisma migrate resolve --applied "20250908050111_init" --schema=prisma/schema.prisma; then
    echo "✅ Successfully resolved failed migration 20250908050111_init"
else
    echo "❌ Failed to resolve migration. Trying alternative approach..."
    
    # Alternative: mark as rolled back and then apply current migrations
    echo "🔄 Marking migration as rolled back..."
    if npx prisma migrate resolve --rolled-back "20250908050111_init" --schema=prisma/schema.prisma; then
        echo "✅ Migration marked as rolled back"
    else
        echo "❌ Failed to mark migration as rolled back"
        exit 1
    fi
fi

echo ""
echo "🔄 Running migrate deploy to apply any pending migrations..."

# Now run migrate deploy to apply any pending migrations
if npx prisma migrate deploy --schema=prisma/schema.prisma; then
    echo "✅ All migrations applied successfully"
else
    echo "❌ Failed to apply migrations"
    exit 1
fi

echo ""
echo "📊 Final migration status:"
npx prisma migrate status --schema=prisma/schema.prisma

echo ""
echo "🎉 Migration fix completed successfully!"
echo "===================================="
echo "Your database should now be in a consistent state."
