#!/bin/bash

# Script to prepare the application for production deployment
# This creates initial migrations from the current schema

set -e

echo "🏭 Preparing AlleGutta for production deployment..."

# Check if we're in a git repository
if ! git rev-parse --git-dir >/dev/null 2>&1; then
    echo "❌ Not in a git repository. Please run this from the project root."
    exit 1
fi

# Check if migrations already exist
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    echo "✅ Migrations already exist. Production ready!"
    ls -la prisma/migrations/
    exit 0
fi

# Check for backed up migrations
BACKUP_DIR=$(find prisma -name "migrations_backup_*" -type d 2>/dev/null | head -1)
if [ -n "$BACKUP_DIR" ]; then
    echo "📁 Found backed up migrations: $BACKUP_DIR"
    echo "🔄 Restoring backed up migrations..."
    
    mv "$BACKUP_DIR" prisma/migrations
    echo "✅ Migrations restored from backup"
else
    echo "🔄 Creating initial migration from current schema..."
    
    # Create initial migration
    if npx prisma migrate dev --name init --skip-generate; then
        echo "✅ Initial migration created successfully"
    else
        echo "❌ Failed to create initial migration"
        exit 1
    fi
fi

# Remove migrations from .gitignore if present
if grep -q "prisma/migrations/" .gitignore 2>/dev/null; then
    echo "🔄 Removing migrations from .gitignore..."
    sed -i.bak '/# Prisma migrations (development - using schema push)/,+1d' .gitignore
    rm -f .gitignore.bak
    echo "✅ Updated .gitignore for production"
fi

# Generate Prisma client
echo "🔄 Regenerating Prisma client..."
npx prisma generate

echo ""
echo "🎉 Production preparation completed!"
echo ""
echo "📋 What changed:"
echo "  ✅ Migrations directory created/restored"
echo "  ✅ .gitignore updated for production"
echo "  ✅ Prisma client regenerated"
echo ""
echo "📦 Migration files:"
ls -la prisma/migrations/ 2>/dev/null || echo "  (No migration files found)"
echo ""
echo "🚀 Next steps:"
echo "  1. Commit the migration files:"
echo "     git add prisma/migrations/"
echo "     git commit -m 'feat: add production migrations'"
echo ""
echo "  2. Deploy to production with:"
echo "     docker build -t allegutta-prod ."
echo "     # Production deployment will now use migrations instead of schema push"
echo ""
echo "  3. Set production environment variables:"
echo "     NODE_ENV=production (or ENVIRONMENT=production)"
echo ""
echo "⚠️  Important: Production deployments will now preserve data during schema changes!"
