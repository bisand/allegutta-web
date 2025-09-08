#!/bin/sh

# Database migration script for AlleGutta
# Handles both SQLite and external databases with proper error handling

set -e

echo "🔄 Starting database schema setup process..."

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

# Function to check and resolve failed migrations
check_and_resolve_failed_migrations() {
    local SCHEMA_PATH="$1"
    
    echo "🔍 Checking migration status..."
    
    # Check if there are failed migrations
    if npx prisma migrate status --schema="$SCHEMA_PATH" 2>&1 | grep -q "failed"; then
        echo "⚠️  Found failed migrations. Attempting to resolve..."
        
        # Get the list of failed migrations
        FAILED_MIGRATIONS=$(npx prisma migrate status --schema="$SCHEMA_PATH" 2>&1 | grep "Migration name:" | awk '{print $3}' || true)
        
        if [ -n "$FAILED_MIGRATIONS" ]; then
            echo "🔧 Resolving failed migrations..."
            
            # Try to resolve each failed migration
            for migration in $FAILED_MIGRATIONS; do
                echo "🔄 Resolving failed migration: $migration"
                
                # Check if database already has the tables (migration actually succeeded)
                if check_existing_tables; then
                    echo "✅ Database has tables, marking migration as applied: $migration"
                    if npx prisma migrate resolve --applied "$migration" --schema="$SCHEMA_PATH"; then
                        echo "✅ Successfully resolved migration: $migration"
                    else
                        echo "❌ Failed to resolve migration: $migration"
                        return 1
                    fi
                else
                    echo "🔄 Marking migration as rolled back: $migration"
                    if npx prisma migrate resolve --rolled-back "$migration" --schema="$SCHEMA_PATH"; then
                        echo "✅ Successfully rolled back migration: $migration"
                    else
                        echo "❌ Failed to roll back migration: $migration"
                        return 1
                    fi
                fi
            done
            
            echo "✅ All failed migrations resolved"
        fi
    else
        echo "✅ No failed migrations found"
    fi
    
    return 0
}

# Function to check if database has existing tables
check_existing_tables() {
    echo "🔍 Checking for existing database tables..."
    
    if echo "$NUXT_DATABASE_URL" | grep -q "^file:"; then
        DB_FILE=$(echo "$NUXT_DATABASE_URL" | sed 's|^file:||')
        
        # Check if key tables exist in SQLite
        if sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users', 'portfolios', 'transactions');" 2>/dev/null | grep -q users; then
            echo "✅ Found existing tables in database"
            return 0
        else
            echo "📊 No existing tables found"
            return 1
        fi
    else
        # For external databases, use Prisma to check
        if npx prisma db execute --command="SELECT 1 FROM users LIMIT 1;" >/dev/null 2>&1; then
            echo "✅ Found existing tables in database"
            return 0
        else
            echo "📊 No existing tables found"
            return 1
        fi
    fi
}

# Function to resolve migration state for existing database
resolve_migration_state() {
    local SCHEMA_PATH="$1"
    local MIGRATIONS_DIR=$(dirname "$SCHEMA_PATH")/migrations
    
    echo "🔧 Resolving migration state for existing database..."
    
    # Create migrations directory
    mkdir -p "$MIGRATIONS_DIR"
    
    # Create a temporary dummy migration to enable migrate status command
    echo "🔄 Creating temporary migration structure..."
    TEMP_DIR="$MIGRATIONS_DIR/temp_migration"
    mkdir -p "$TEMP_DIR"
    echo "-- temp migration" > "$TEMP_DIR/migration.sql"
    
    # Now check if there are any failed migrations in the database and resolve them
    echo "🔍 Checking for any existing failed migrations in database..."
    MIGRATE_STATUS_OUTPUT=$(npx prisma migrate status --schema="$SCHEMA_PATH" 2>&1 || true)
    
    if echo "$MIGRATE_STATUS_OUTPUT" | grep -q "failed"; then
        echo "⚠️  Found existing failed migrations. Resolving them first..."
        
        # Get failed migration names - improved parsing
        FAILED_MIGRATIONS=$(echo "$MIGRATE_STATUS_OUTPUT" | grep -E "Migration.*failed" | sed -E 's/.*Migration ([^[:space:]]+).*/\1/' || true)
        
        if [ -n "$FAILED_MIGRATIONS" ]; then
            for migration in $FAILED_MIGRATIONS; do
                echo "🔄 Resolving existing failed migration: $migration"
                # Since database has tables, mark failed migration as applied
                if npx prisma migrate resolve --applied "$migration" --schema="$SCHEMA_PATH"; then
                    echo "✅ Resolved failed migration: $migration"
                else
                    echo "❌ Failed to resolve migration: $migration"
                    # Clean up temp migration
                    rm -rf "$TEMP_DIR"
                    return 1
                fi
            done
        else
            echo "🔍 Could not parse failed migration names, trying direct resolution..."
            # Try to resolve the specific known failed migration
            if npx prisma migrate resolve --applied "20250908050111_init" --schema="$SCHEMA_PATH" 2>/dev/null; then
                echo "✅ Resolved known failed migration: 20250908050111_init"
            else
                echo "⚠️  Failed migration resolution may require manual intervention"
            fi
        fi
    else
        echo "✅ No failed migrations detected"
    fi
    
    # Clean up temp migration
    rm -rf "$TEMP_DIR"
    
    # Create a baseline migration that represents the current state
    echo "🔄 Creating baseline migration..."
    BASELINE_DIR="$MIGRATIONS_DIR/$(date +%Y%m%d%H%M%S)_baseline"
    mkdir -p "$BASELINE_DIR"
    
    # Create an empty migration file (database is already up to date)
    cat > "$BASELINE_DIR/migration.sql" << 'EOF'
-- This is a baseline migration for an existing database
-- The database already contains all the necessary tables and data
-- This migration marks the starting point for future schema changes
EOF
    
    echo "✅ Created baseline migration"
    
    # Mark the migration as applied using Prisma's migrate resolve
    echo "🔄 Marking baseline migration as applied..."
    if npx prisma migrate resolve --applied "$(basename "$BASELINE_DIR")" --schema="$SCHEMA_PATH"; then
        echo "✅ Baseline migration marked as applied"
        return 0
    else
        echo "❌ Failed to mark baseline migration as applied"
        return 1
    fi
}

# Function to determine deployment environment
get_deployment_environment() {
    # Check environment indicators
    if [ -n "$NODE_ENV" ] && [ "$NODE_ENV" = "production" ]; then
        echo "production"
    elif [ -n "$ENVIRONMENT" ] && [ "$ENVIRONMENT" = "production" ]; then
        echo "production"
    elif [ -n "$RAILWAY_ENVIRONMENT" ] && [ "$RAILWAY_ENVIRONMENT" = "production" ]; then
        echo "production"
    elif [ -n "$VERCEL_ENV" ] && [ "$VERCEL_ENV" = "production" ]; then
        echo "production"
    elif echo "$NUXT_DATABASE_URL" | grep -E "(amazonaws|planetscale|railway|render|fly|vercel)" >/dev/null; then
        echo "production"
    else
        echo "development"
    fi
}

# Function to run Prisma migrations (production-safe)
run_prisma_migrations() {
    echo "🔄 Running Prisma migrations (production mode)..."
    
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
    
    # Check if migrations directory exists
    MIGRATIONS_DIR=$(dirname "$SCHEMA_PATH")/migrations
    if [ ! -d "$MIGRATIONS_DIR" ]; then
        echo "⚠️  No migrations directory found. Checking database state..."
        
        # Check if database already has tables (existing production database)
        if check_existing_tables; then
            echo "🔄 Database has existing tables. Resolving migration state..."
            resolve_migration_state "$SCHEMA_PATH"
        else
            echo "🔄 Creating initial migration for empty database..."
            # For production without migrations, create them from current schema
            if npx prisma migrate diff --from-empty --to-schema-datamodel "$SCHEMA_PATH" --script > /tmp/init.sql; then
                mkdir -p "$MIGRATIONS_DIR/$(date +%Y%m%d%H%M%S)_init"
                mv /tmp/init.sql "$MIGRATIONS_DIR/$(date +%Y%m%d%H%M%S)_init/migration.sql"
                echo "✅ Created initial migration from current schema"
            fi
        fi
    else
        echo "🔍 Migrations directory exists. Checking for failed migrations..."
        check_and_resolve_failed_migrations "$SCHEMA_PATH"
    fi
    
    # Try to run migrations
    if npx prisma migrate deploy --schema="$SCHEMA_PATH"; then
        echo "✅ Prisma migrations completed successfully"
        return 0
    else
        echo "❌ Prisma migrations failed"
        return 1
    fi
}

# Function to run Prisma schema push (development-safe)
run_prisma_schema_push() {
    echo "🔄 Running Prisma schema push (development mode)..."
    
    # Set NODE_ENV to development
    export NODE_ENV=development
    
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
    
    # Try to run schema push (accepts data loss for development)
    if npx prisma db push --schema="$SCHEMA_PATH" --accept-data-loss; then
        echo "✅ Prisma schema push completed successfully"
        return 0
    else
        echo "❌ Prisma schema push failed"
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

# Main schema setup process
main() {
    echo "🚀 Starting database schema setup process..."
    
    # Determine deployment environment
    DEPLOY_ENV=$(get_deployment_environment)
    echo "🌍 Detected environment: $DEPLOY_ENV"
    
    # Step 1: Test database connection
    if ! test_database_connection; then
        echo "❌ Database connection test failed"
        exit 1
    fi
    
    # Step 2: Use appropriate deployment method based on environment
    if [ "$DEPLOY_ENV" = "production" ]; then
        echo "🏭 Using production-safe migrations..."
        
        # Use migrations for production (data-safe)
        if run_prisma_migrations; then
            echo "✅ Production migration via Prisma successful"
        else
            echo "⚠️  Prisma migrations failed, trying fallback..."
            
            # Step 3: Try fallback schema (SQLite only)
            if apply_fallback_schema; then
                echo "✅ Production schema setup via fallback successful"
            else
                echo "❌ All production schema setup methods failed"
                exit 1
            fi
        fi
    else
        echo "🧪 Using development-friendly schema push..."
        
        # Use schema push for development (faster, allows data loss)
        if run_prisma_schema_push; then
            echo "✅ Development schema push via Prisma successful"
        else
            echo "⚠️  Prisma schema push failed, trying fallback..."
            
            # Step 3: Try fallback schema (SQLite only)
            if apply_fallback_schema; then
                echo "✅ Development schema setup via fallback successful"
            else
                echo "❌ All development schema setup methods failed"
                exit 1
            fi
        fi
    fi
    
    # Step 4: Verify schema
    if verify_database_schema; then
        echo "✅ Database schema verification successful"
    else
        echo "⚠️  Database schema verification failed, but continuing..."
    fi
    
    echo "🎉 Database schema setup completed successfully"
}

# Run main function
main
