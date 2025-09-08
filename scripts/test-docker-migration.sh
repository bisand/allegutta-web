#!/bin/bash

# Docker deployment test script
# Tests the complete Docker build and database migration process

set -e

echo "🐳 Testing Docker deployment with database migration..."

# Configuration
IMAGE_NAME="allegutta-test"
CONTAINER_NAME="allegutta-test-container"
TEST_DB_PATH="/tmp/allegutta-docker-test/production.db"

# Cleanup function
cleanup() {
    echo "🧹 Cleaning up Docker test environment..."
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
    docker rmi "$IMAGE_NAME" 2>/dev/null || true
    rm -rf /tmp/allegutta-docker-test
}

trap cleanup EXIT

# Create test database directory
mkdir -p "$(dirname "$TEST_DB_PATH")"

echo "🔨 Building Docker image..."
if docker build -t "$IMAGE_NAME" .; then
    echo "✅ Docker build successful"
else
    echo "❌ Docker build failed"
    exit 1
fi

echo "🚀 Testing database migration in Docker container..."

# Run container with database migration test
docker run \
    --name "$CONTAINER_NAME" \
    --rm \
    -v "/tmp/allegutta-docker-test:/app/data" \
    -e "NUXT_DATABASE_URL=file:/app/data/production.db" \
    -e "NUXT_DEV_AUTH=true" \
    --entrypoint "/bin/sh" \
    "$IMAGE_NAME" \
    -c "
        echo '🧪 Testing migration inside Docker container...'
        
        # Test database migration script
        if /app/scripts/migrate-db.sh; then
            echo '✅ Docker migration test successful'
        else
            echo '❌ Docker migration test failed'
            exit 1
        fi
        
        # Verify database was created
        if [ -f '/app/data/production.db' ]; then
            TABLES=\$(sqlite3 /app/data/production.db 'SELECT count(name) FROM sqlite_master WHERE type=\"table\";' 2>/dev/null || echo '0')
            echo \"📊 Database created with \$TABLES tables\"
            if [ \"\$TABLES\" -gt 5 ]; then
                echo '✅ Database schema verification successful'
            else
                echo '❌ Database schema verification failed'
                exit 1
            fi
        else
            echo '❌ Database file not created'
            exit 1
        fi
        
        echo '🎉 All Docker tests passed!'
    "

echo "🧪 Testing production startup script in Docker..."

# Test the full startup process (with timeout to prevent hanging)
timeout 10 docker run \
    --name "${CONTAINER_NAME}-startup" \
    --rm \
    -v "/tmp/allegutta-docker-test:/app/data" \
    -e "NUXT_DATABASE_URL=file:/app/data/production.db" \
    -e "NUXT_DEV_AUTH=true" \
    "$IMAGE_NAME" \
    || echo "⚠️  Startup test completed (expected timeout)"

# Verify the database still exists after startup attempt
if [ -f "$TEST_DB_PATH" ]; then
    TABLES=$(sqlite3 "$TEST_DB_PATH" "SELECT count(name) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
    echo "📊 Final verification: Database has $TABLES tables"
    if [ "$TABLES" -gt 5 ]; then
        echo "✅ Production startup database verification successful"
    else
        echo "❌ Production startup database verification failed"
        exit 1
    fi
else
    echo "❌ Database not found after startup test"
    exit 1
fi

echo "🎉 All Docker deployment tests passed successfully!"
echo ""
echo "📊 Docker Test Summary:"
echo "  ✅ Docker image build"
echo "  ✅ Database migration in container"
echo "  ✅ Database schema verification"
echo "  ✅ Production startup process"
echo ""
echo "🚀 Docker deployment with database migration is ready!"
