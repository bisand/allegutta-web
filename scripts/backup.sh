#!/bin/bash

# Simple Database Backup Script
# Complements the migration-free database strategy

set -e

ENV=${1:-development}
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "📦 AlleGutta Database Backup"
echo "=========================="
echo "🕐 Timestamp: $TIMESTAMP"
echo "📍 Environment: $ENV"

# Determine database path
case $ENV in
    "docker")
        DB_PATH="/app/data/portfolio.db"
        BACKUP_DIR="/app/backups"
        ;;
    "production")
        if [ -n "$NUXT_DATABASE_URL" ]; then
            DB_PATH=$(echo $NUXT_DATABASE_URL | sed 's/file://')
        else
            DB_PATH="./production.db"
        fi
        ;;
    *)
        DB_PATH="./dev.db"
        ;;
esac

echo "📊 Database: $DB_PATH"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database file not found: $DB_PATH"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup filename
BACKUP_FILE="$BACKUP_DIR/portfolio_backup_${ENV}_${TIMESTAMP}.db"

# Create backup
echo "📦 Creating backup..."
cp "$DB_PATH" "$BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    echo "✅ Backup created successfully!"
    echo "📁 Location: $BACKUP_FILE"
    echo "📊 Size: $BACKUP_SIZE"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Cleanup old backups (keep last 10)
echo "🧹 Cleaning up old backups (keeping 10 most recent)..."
find "$BACKUP_DIR" -name "portfolio_backup_${ENV}_*.db" -type f | sort -r | tail -n +11 | xargs rm -f

echo ""
echo "🎉 Backup complete!"
echo ""
echo "📋 To restore this backup:"
echo "   cp $BACKUP_FILE $DB_PATH"
