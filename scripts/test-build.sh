#!/bin/bash

# AlleGutta Web - Build Test Script
# Tests the Docker build process without pushing to ensure everything works

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧪 AlleGutta Web - Docker Build Test${NC}"
echo "==========================================="

# Read current version
VERSION=$(cat VERSION 2>/dev/null || echo "1.0.0")
TEST_TAG="allegutta-web:test-$VERSION"

echo -e "${BLUE}📋 Testing build for version: ${YELLOW}$VERSION${NC}"
echo -e "${BLUE}🏷️  Test tag: ${YELLOW}$TEST_TAG${NC}"

# Build test image
echo -e "${BLUE}🔨 Building test Docker image...${NC}"
docker build -t "$TEST_TAG" -f Dockerfile .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker build test completed successfully!${NC}"
    
    # Show image info
    echo -e "${BLUE}📊 Image information:${NC}"
    docker images | grep "$TEST_TAG" || echo "Image not found in listing"
    
    # Clean up test image
    echo -e "${BLUE}🧹 Cleaning up test image...${NC}"
    docker rmi "$TEST_TAG" >/dev/null 2>&1 && echo -e "${GREEN}✅ Test image removed${NC}" || echo -e "${YELLOW}⚠️  Could not remove test image${NC}"
    
    echo ""
    echo -e "${GREEN}🎉 Build test passed! Ready for production build.${NC}"
    echo -e "${BLUE}💡 Run './scripts/build-and-push.sh' to build and push to Docker Hub${NC}"
else
    echo -e "${RED}❌ Docker build test failed!${NC}"
    echo -e "${RED}Please fix the build issues before running the production build.${NC}"
    exit 1
fi
