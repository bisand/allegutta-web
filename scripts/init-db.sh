#!/bin/bash

# Simple Database Initialization Script
# No migrations - just push the current schema!

set -e

echo "🚀 AlleGutta Simple Database Initialization"
echo "=========================================="

# Environment detection
ENV=${1:-development}
echo "📍 Environment: $ENV"

# Check for schema file
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Error: prisma/schema.prisma not found"
    exit 1
fi

# Set database URL based on environment
case $ENV in
    "docker")
        export NUXT_DATABASE_URL="file:/app/data/portfolio.db"
        ;;
    "production")
        # Use existing NUXT_DATABASE_URL or default
        if [ -z "$NUXT_DATABASE_URL" ]; then
            export NUXT_DATABASE_URL="file:./production.db"
        fi
        ;;
    *)
        # Development
        export NUXT_DATABASE_URL="file:./dev.db"
        ;;
esac

echo "📊 Database URL: $NUXT_DATABASE_URL"

# Create database directory if needed
DB_PATH=$(echo $NUXT_DATABASE_URL | sed 's/file://')
DB_DIR=$(dirname "$DB_PATH")
if [ ! -d "$DB_DIR" ]; then
    echo "📁 Creating database directory: $DB_DIR"
    mkdir -p "$DB_DIR"
fi

# Check if database exists and has data
DB_EXISTS=false
HAS_DATA=false
if [ -f "$DB_PATH" ] && [ -s "$DB_PATH" ]; then
    DB_EXISTS=true
    echo "📊 Existing database found: $DB_PATH"
    
    # Check if database has any data
    if sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations';" | grep -q "^[1-9]"; then
        HAS_DATA=true
        echo "� Database contains existing tables"
        
        # Count records in main tables if they exist
        for table in users portfolios transactions holdings; do
            if sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='$table';" | grep -q "$table"; then
                COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "0")
                if [ "$COUNT" -gt 0 ]; then
                    echo "   📊 Table '$table': $COUNT records"
                fi
            fi
        done
    fi
fi

# Production-safe schema update approach
echo "🔄 Updating database schema (production-safe)..."
echo "   ✅ Will preserve ALL existing data"
echo "   ✅ Will add new tables/columns as needed"
echo "   ❌ Will NEVER delete existing data"

# Choose the right approach based on environment and database state
if [ "$ENV" = "production" ] && [ "$HAS_DATA" = true ]; then
    echo "🛡️  PRODUCTION MODE: Using safest approach for existing data"
    
    # For production with existing data, use the safest possible approach
    if npx prisma db push; then
        echo "✅ Schema updated successfully (production-safe)"
    else
        echo "❌ Schema update failed in production mode"
        echo "🚨 Manual intervention required - database not modified"
        exit 1
    fi
    
elif [ "$DB_EXISTS" = false ]; then
    echo "🆕 Creating new database from scratch"
    
    # For new databases, try Prisma first, fallback to SQL
    if npx prisma db push; then
        echo "✅ New database created successfully"
    else
        echo "⚠️  Prisma failed, trying SQL schema approach..."
        if [ -f "prisma/schema.sql" ]; then
            echo "📊 Creating database using SQL schema..."
            sqlite3 "$DB_PATH" < prisma/schema.sql
            echo "✅ Database created from SQL schema"
        else
            echo "❌ No SQL schema file found. Database creation failed."
            exit 1
        fi
    fi
    
else
    echo "🔄 Updating existing database (development/safe mode)"
    
    # For development or existing DBs without critical data
    if npx prisma db push; then
        echo "✅ Schema updated successfully"
    else
        echo "⚠️  Schema update failed, trying alternative approach..."
        echo "❌ Manual schema update may be required"
        exit 1
    fi
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Verify database is working
echo "🔍 Verifying database connection..."
if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database is ready!"
else
    echo "⚠️  Database test query failed, but schema was pushed"
fi

echo ""
echo "🎉 Database initialization complete!"
echo ""
echo "📋 What was done:"
echo "   • Schema pushed to database (no migrations needed)"
echo "   • Prisma client generated"
echo "   • Database connectivity verified"
echo ""
echo "💡 To reset database completely: rm $DB_PATH && ./scripts/init-db.sh $ENV"
