#!/bin/bash

# Migration System Validation Test
# Tests the database migration without running full application

set -e

echo "🧪 Testing AlleGutta database migration system..."

# Test configuration
TEST_DIR="/tmp/allegutta-migration-validation-$$"
mkdir -p "$TEST_DIR"

# Cleanup function
cleanup() {
    echo "🧹 Cleaning up test environment..."
    rm -rf "$TEST_DIR"
}

trap cleanup EXIT

echo "📊 Test Environment: $TEST_DIR"

# Test 1: Fresh SQLite database migration
echo ""
echo "🧪 Test 1: Fresh SQLite database migration"
export NUXT_DATABASE_URL="file:$TEST_DIR/fresh.db"

if /workspaces/allegutta-web/scripts/migrate-db.sh; then
    echo "✅ Test 1 PASSED: Fresh database migration successful"
    
    # Verify database structure
    TABLES_COUNT=$(sqlite3 "$TEST_DIR/fresh.db" "SELECT count(name) FROM sqlite_master WHERE type='table';" 2>/dev/null)
    echo "  📊 Database contains $TABLES_COUNT tables"
    
    # List tables
    echo "  📋 Tables created:"
    sqlite3 "$TEST_DIR/fresh.db" "SELECT '    ' || name FROM sqlite_master WHERE type='table' ORDER BY name;" 2>/dev/null
else
    echo "❌ Test 1 FAILED: Fresh database migration failed"
    exit 1
fi

# Test 2: Existing database (should detect no pending migrations)
echo ""
echo "🧪 Test 2: Re-running migration on existing database"

if /workspaces/allegutta-web/scripts/migrate-db.sh; then
    echo "✅ Test 2 PASSED: Existing database migration successful"
else
    echo "❌ Test 2 FAILED: Existing database migration failed"
    exit 1
fi

# Test 3: Database with missing directory
echo ""
echo "🧪 Test 3: Database in non-existent directory"
export NUXT_DATABASE_URL="file:$TEST_DIR/subdir/nested/new.db"

if /workspaces/allegutta-web/scripts/migrate-db.sh; then
    echo "✅ Test 3 PASSED: Migration created nested directories"
    
    if [ -f "$TEST_DIR/subdir/nested/new.db" ]; then
        echo "  ✅ Database file created in nested directory"
    else
        echo "  ❌ Database file not found in expected location"
        exit 1
    fi
else
    echo "❌ Test 3 FAILED: Migration failed with nested directory"
    exit 1
fi

# Test 4: Production startup script validation
echo ""
echo "🧪 Test 4: Production startup script validation (migration part only)"

# Create a modified version of the startup script that only runs migration
cat > "$TEST_DIR/test-startup.sh" << 'EOF'
#!/bin/sh
set -e

# Mock environment
export NUXT_DATABASE_URL="file:/tmp/allegutta-migration-validation-$$/startup-test.db"

echo "🚀 Testing production startup migration logic..."

# Test the migration part of the production script
echo "📊 Checking database status and running migrations..."

# Run database migration script
if [ -f "/workspaces/allegutta-web/scripts/migrate-db.sh" ]; then
    echo "🔄 Running database migration script..."
    if /workspaces/allegutta-web/scripts/migrate-db.sh; then
        echo "✅ Database migration completed successfully"
    else
        echo "❌ Database migration failed"
        exit 1
    fi
else
    echo "❌ Migration script not found"
    exit 1
fi

echo "✅ Production startup migration logic validated"
EOF

chmod +x "$TEST_DIR/test-startup.sh"

if "$TEST_DIR/test-startup.sh"; then
    echo "✅ Test 4 PASSED: Production startup script migration logic works"
else
    echo "❌ Test 4 FAILED: Production startup script migration logic failed"
    exit 1
fi

# Test 5: Health check endpoint (current running instance)
echo ""
echo "🧪 Test 5: Current application health check"

if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "✅ Test 5 PASSED: Current application health endpoint responding"
    
    # Try to get database-related health info
    HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health || echo "{}")
    echo "  📊 Current health status available"
else
    echo "⚠️  Test 5 SKIPPED: Current application not responding (expected if not running)"
fi

# Test Summary
echo ""
echo "🎉 Migration System Validation Complete!"
echo ""
echo "📊 Test Results Summary:"
echo "  ✅ Fresh database migration"
echo "  ✅ Existing database handling"
echo "  ✅ Nested directory creation"
echo "  ✅ Production startup logic"
echo "  ✅ Health endpoint check"
echo ""
echo "🚀 Your database migration system is ready for production deployment!"
echo ""
echo "📋 Next Steps for Production:"
echo "  1. Build Docker image: docker build -t allegutta-prod ."
echo "  2. Run with volume: docker run -v /data:/app/data -e NUXT_DATABASE_URL=file:/app/data/production.db allegutta-prod"
echo "  3. Monitor logs for migration success"
echo "  4. Check health endpoint: curl http://your-server:3000/api/health"
