#!/bin/bash

# Test script for database migration functionality
# This script tests the migration process in various scenarios

set -e

echo "🧪 Testing database migration functionality..."

# Test data directory
TEST_DIR="/tmp/allegutta-test-$$"
mkdir -p "$TEST_DIR"

# Cleanup function
cleanup() {
    echo "🧹 Cleaning up test environment..."
    rm -rf "$TEST_DIR"
}

trap cleanup EXIT

# Test 1: Fresh SQLite database
echo "🧪 Test 1: Fresh SQLite database migration"
export NUXT_DATABASE_URL="file:$TEST_DIR/fresh.db"

if /workspaces/allegutta-web/scripts/migrate-db.sh; then
    echo "✅ Test 1 passed: Fresh database migration successful"
else
    echo "❌ Test 1 failed: Fresh database migration failed"
    exit 1
fi

# Verify the database was created with proper schema
if [ -f "$TEST_DIR/fresh.db" ]; then
    TABLES_COUNT=$(sqlite3 "$TEST_DIR/fresh.db" "SELECT count(name) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
    if [ "$TABLES_COUNT" -gt 5 ]; then
        echo "✅ Test 1 verification: Database has $TABLES_COUNT tables"
    else
        echo "❌ Test 1 verification failed: Database has only $TABLES_COUNT tables"
        exit 1
    fi
else
    echo "❌ Test 1 verification failed: Database file not created"
    exit 1
fi

# Test 2: Existing database
echo "🧪 Test 2: Existing database migration"
# The database from Test 1 should still exist

if /workspaces/allegutta-web/scripts/migrate-db.sh; then
    echo "✅ Test 2 passed: Existing database migration successful"
else
    echo "❌ Test 2 failed: Existing database migration failed"
    exit 1
fi

# Test 3: Invalid database path (should create directory)
echo "🧪 Test 3: Database in non-existent directory"
export NUXT_DATABASE_URL="file:$TEST_DIR/subdir/new.db"

if /workspaces/allegutta-web/scripts/migrate-db.sh; then
    echo "✅ Test 3 passed: Migration created directory and database"
else
    echo "❌ Test 3 failed: Migration failed to create directory"
    exit 1
fi

# Test 4: Production startup script
echo "🧪 Test 4: Full production startup script (dry run)"
export NUXT_DATABASE_URL="file:$TEST_DIR/production.db"

# Create a mock application environment
mkdir -p "$TEST_DIR/app/prisma"
mkdir -p "$TEST_DIR/app/scripts"
cp /workspaces/allegutta-web/prisma/schema.sql "$TEST_DIR/app/prisma/"
cp /workspaces/allegutta-web/scripts/migrate-db.sh "$TEST_DIR/app/scripts/"
chmod +x "$TEST_DIR/app/scripts/migrate-db.sh"

# Set paths to our test environment
sed "s|/app/|$TEST_DIR/app/|g" /workspaces/allegutta-web/scripts/start-production.sh > "$TEST_DIR/test-startup.sh"
chmod +x "$TEST_DIR/test-startup.sh"

# Mock the final application start
echo 'echo "🚀 Mock application start successful"' >> "$TEST_DIR/test-startup.sh"
echo 'exit 0' >> "$TEST_DIR/test-startup.sh"

if "$TEST_DIR/test-startup.sh"; then
    echo "✅ Test 4 passed: Production startup script works"
else
    echo "❌ Test 4 failed: Production startup script failed"
    exit 1
fi

echo "🎉 All migration tests passed successfully!"
echo ""
echo "📊 Test Summary:"
echo "  ✅ Fresh database migration"
echo "  ✅ Existing database migration"
echo "  ✅ Directory creation"
echo "  ✅ Production startup script"
echo ""
echo "🚀 Database migration system is ready for production!"
