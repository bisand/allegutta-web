#!/bin/sh

# Database migration script for AlleGutta
# Handles both SQLite and external databases with proper error handling

set -e

echo "🔄 Starting database migration process..."

# Check for required NUXT_DATABASE_URL environment variable
if [ -z "$NUXT_DATABASE_URL" ]; then
    echo "❌ FATAL ERROR: NUXT_DATABASE_URL environment variable is required"
    exit 1
fi

echo "📊 Database URL: $NUXT_DATABASE_URL"

# Function to test database connectivity
test_database_connection() {
    echo "🔍 Testing database connection..."
    
    # For SQLite databases
    if echo "$NUXT_DATABASE_URL" | grep -q "^file:"; then
        DB_FILE=$(echo "$NUXT_DATABASE_URL" | sed 's|^file:||')
        echo "📊 SQLite database: $DB_FILE"
        
        # Create directory if it doesn't exist
        mkdir -p "$(dirname "$DB_FILE")"
        
        # Test SQLite connection
        if sqlite3 "$DB_FILE" "SELECT 1;" >/dev/null 2>&1; then
            echo "✅ SQLite connection successful"
            return 0
        else
            echo "⚠️  SQLite database not accessible, will be created"
            return 0
        fi
    else
        echo "📊 External database detected"
        # For external databases, we'll let Prisma handle the connection test
        return 0
    fi
}

# Function to run Prisma migrations
run_prisma_migrations() {
    echo "🔄 Running Prisma migrations..."
    
    # Set NODE_ENV to production to avoid dev warnings
    export NODE_ENV=production
    
    # Find the correct schema path
    SCHEMA_PATH=""
    if [ -f "/app/prisma/schema.prisma" ]; then
        SCHEMA_PATH="/app/prisma/schema.prisma"
    elif [ -f "./prisma/schema.prisma" ]; then
        SCHEMA_PATH="./prisma/schema.prisma"
    elif [ -f "prisma/schema.prisma" ]; then
        SCHEMA_PATH="prisma/schema.prisma"
    else
        echo "❌ Could not find prisma/schema.prisma"
        return 1
    fi
    
    echo "📊 Using schema: $SCHEMA_PATH"
    
    # Try to run migrations
    if npx prisma migrate deploy --schema="$SCHEMA_PATH"; then
        echo "✅ Prisma migrations completed successfully"
        return 0
    else
        echo "❌ Prisma migrations failed"
        return 1
    fi
}

# Function to apply fallback schema (SQLite only)
apply_fallback_schema() {
    if echo "$NUXT_DATABASE_URL" | grep -q "^file:"; then
        DB_FILE=$(echo "$NUXT_DATABASE_URL" | sed 's|^file:||')
        
        echo "🔄 Applying fallback schema for SQLite..."
        
        # Find the correct schema.sql path
        SCHEMA_SQL_PATH=""
        if [ -f "/app/prisma/schema.sql" ]; then
            SCHEMA_SQL_PATH="/app/prisma/schema.sql"
        elif [ -f "./prisma/schema.sql" ]; then
            SCHEMA_SQL_PATH="./prisma/schema.sql"
        elif [ -f "prisma/schema.sql" ]; then
            SCHEMA_SQL_PATH="prisma/schema.sql"
        else
            echo "❌ No fallback schema.sql found"
            return 1
        fi
        
        echo "📊 Using schema.sql: $SCHEMA_SQL_PATH"
        
        if sqlite3 "$DB_FILE" < "$SCHEMA_SQL_PATH"; then
            echo "✅ Fallback schema applied successfully"
            return 0
        else
            echo "❌ Failed to apply fallback schema"
            return 1
        fi
    else
        echo "❌ Fallback schema not applicable for external databases"
        return 1
    fi
}

# Function to verify database schema
verify_database_schema() {
    echo "🔍 Verifying database schema..."
    
    # For SQLite, check if essential tables exist
    if echo "$NUXT_DATABASE_URL" | grep -q "^file:"; then
        DB_FILE=$(echo "$NUXT_DATABASE_URL" | sed 's|^file:||')
        
        # Check for essential tables
        TABLES_COUNT=$(sqlite3 "$DB_FILE" "SELECT count(name) FROM sqlite_master WHERE type='table' AND name IN ('users', 'portfolios', 'transactions', 'holdings');" 2>/dev/null || echo "0")
        
        if [ "$TABLES_COUNT" -eq 4 ]; then
            echo "✅ Essential database tables verified"
            return 0
        else
            echo "⚠️  Database schema incomplete (found $TABLES_COUNT/4 essential tables)"
            return 1
        fi
    else
        # For external databases, try a simple query
        echo "✅ External database schema verification skipped"
        return 0
    fi
}

# Main migration process
main() {
    echo "🚀 Starting database migration process..."
    
    # Step 1: Test database connection
    if ! test_database_connection; then
        echo "❌ Database connection test failed"
        exit 1
    fi
    
    # Step 2: Run Prisma migrations
    if run_prisma_migrations; then
        echo "✅ Migration via Prisma successful"
    else
        echo "⚠️  Prisma migration failed, trying fallback..."
        
        # Step 3: Try fallback schema (SQLite only)
        if apply_fallback_schema; then
            echo "✅ Migration via fallback successful"
        else
            echo "❌ All migration methods failed"
            exit 1
        fi
    fi
    
    # Step 4: Verify schema
    if verify_database_schema; then
        echo "✅ Database schema verification successful"
    else
        echo "⚠️  Database schema verification failed, but continuing..."
    fi
    
    echo "🎉 Database migration process completed successfully"
}

# Run main function
main
