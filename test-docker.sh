#!/bin/bash

# Simple Docker build test without cleanup for debugging
set -e

echo "🔨 Starting Docker build test..."
docker build -t allegutta-web:test-multistage -f Dockerfile . 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Show image sizes for comparison
    echo "📊 Image information:"
    docker images | grep "allegutta-web:test"
    
    echo "🧹 Cleaning up..."
    docker rmi allegutta-web:test-multistage
else
    echo "❌ Build failed!"
    exit 1
fi
