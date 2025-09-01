#!/bin/bash

# SQLite backup script for production deployments
# Usage: ./scripts/backup.sh [backup-type] [destination]

set -e

BACKUP_TYPE=${1:-local}
DESTINATION=${2:-./backups}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATABASE_PATH=${DATABASE_PATH:-"/app/data/production.db"}

echo "🔄 Starting backup process..."
echo "📊 Backup type: $BACKUP_TYPE"
echo "📂 Destination: $DESTINATION"
echo "📅 Timestamp: $TIMESTAMP"

# Ensure backup destination exists
mkdir -p "$DESTINATION"

# Function to create local backup
backup_local() {
    local backup_file="$DESTINATION/allegutta_backup_$TIMESTAMP.db"
    echo "💾 Creating local backup: $backup_file"
    
    if [ -f "$DATABASE_PATH" ]; then
        # Use SQLite's .backup command for consistent backup
        sqlite3 "$DATABASE_PATH" ".backup '$backup_file'"
        
        # Compress the backup
        gzip "$backup_file"
        echo "✅ Backup created: ${backup_file}.gz"
        
        # Verify backup integrity
        if gunzip -c "${backup_file}.gz" | sqlite3 :memory: ".schema" > /dev/null 2>&1; then
            echo "✅ Backup integrity verified"
        else
            echo "❌ Backup integrity check failed!"
            exit 1
        fi
    else
        echo "❌ Database file not found: $DATABASE_PATH"
        exit 1
    fi
}

# Function to upload to cloud storage (example for AWS S3)
backup_s3() {
    if [ -z "$S3_BUCKET" ]; then
        echo "❌ S3_BUCKET environment variable is required for S3 backup"
        exit 1
    fi
    
    backup_local
    local backup_file="$DESTINATION/allegutta_backup_$TIMESTAMP.db.gz"
    
    echo "☁️ Uploading to S3 bucket: $S3_BUCKET"
    aws s3 cp "$backup_file" "s3://$S3_BUCKET/backups/allegutta_backup_$TIMESTAMP.db.gz"
    echo "✅ S3 backup completed"
}

# Function to keep only recent backups
cleanup_old_backups() {
    local keep_days=${BACKUP_RETENTION_DAYS:-7}
    echo "🧹 Cleaning up backups older than $keep_days days..."
    
    find "$DESTINATION" -name "allegutta_backup_*.db.gz" -mtime +$keep_days -delete
    echo "✅ Cleanup completed"
}

# Execute backup based on type
case $BACKUP_TYPE in
    "local")
        backup_local
        cleanup_old_backups
        ;;
    "s3")
        backup_s3
        cleanup_old_backups
        ;;
    "docker")
        # Special case for Docker volumes
        DATABASE_PATH="/app/data/production.db"
        backup_local
        cleanup_old_backups
        ;;
    *)
        echo "❌ Unknown backup type: $BACKUP_TYPE"
        echo "Available types: local, s3, docker"
        exit 1
        ;;
esac

echo "🎉 Backup process completed successfully!"

# Optional: Send notification (webhook, email, etc.)
if [ -n "$BACKUP_WEBHOOK_URL" ]; then
    curl -X POST "$BACKUP_WEBHOOK_URL" \
         -H "Content-Type: application/json" \
         -d "{\"message\": \"AlleGutta backup completed\", \"timestamp\": \"$TIMESTAMP\", \"type\": \"$BACKUP_TYPE\"}"
fi
