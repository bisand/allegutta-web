#!/bin/bash

# AlleGutta Web - Build and Push Docker Image Script
# This script builds the Docker image, tags it with version, and pushes to Docker Hub

set -e  # Exit on any error

# Configuration
DOCKER_REGISTRY="docker.io"
IMAGE_NAME="bisand/allegutta-web"
VERSION_FILE="VERSION"
DOCKERFILE="Dockerfile"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 AlleGutta Web - Docker Build & Push Script${NC}"
echo "=================================================="

# Check if VERSION file exists
if [ ! -f "$VERSION_FILE" ]; then
    echo -e "${RED}❌ VERSION file not found!${NC}"
    exit 1
fi

# Read current version
CURRENT_VERSION=$(cat $VERSION_FILE)
echo -e "${BLUE}📋 Current version: ${YELLOW}$CURRENT_VERSION${NC}"

# Parse version components
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Increment patch version
NEW_PATCH=$((PATCH + 1))
NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"

echo -e "${BLUE}📈 New version: ${GREEN}$NEW_VERSION${NC}"

# Ask for confirmation
read -p "🤔 Do you want to build and push version $NEW_VERSION? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Build cancelled by user${NC}"
    exit 0
fi

# Update VERSION file
echo "$NEW_VERSION" > $VERSION_FILE
echo -e "${GREEN}✅ Updated VERSION file to $NEW_VERSION${NC}"

# Build Docker image
echo -e "${BLUE}🔨 Building Docker image...${NC}"
docker build -t "$IMAGE_NAME:$NEW_VERSION" -t "$IMAGE_NAME:latest" -f $DOCKERFILE .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker image built successfully${NC}"
else
    echo -e "${RED}❌ Docker build failed${NC}"
    # Revert VERSION file
    echo "$CURRENT_VERSION" > $VERSION_FILE
    exit 1
fi

# Check if logged in to Docker Hub
echo -e "${BLUE}🔐 Checking Docker Hub authentication...${NC}"
if ! docker info | grep -q "Username:"; then
    echo -e "${YELLOW}⚠️  Not logged in to Docker Hub. Please login first:${NC}"
    echo "docker login"
    exit 1
fi

# Push to Docker Hub
echo -e "${BLUE}📤 Pushing to Docker Hub...${NC}"

# Push versioned tag
echo -e "${BLUE}📤 Pushing $IMAGE_NAME:$NEW_VERSION...${NC}"
docker push "$IMAGE_NAME:$NEW_VERSION"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Successfully pushed $IMAGE_NAME:$NEW_VERSION${NC}"
else
    echo -e "${RED}❌ Failed to push versioned image${NC}"
    exit 1
fi

# Push latest tag
echo -e "${BLUE}📤 Pushing $IMAGE_NAME:latest...${NC}"
docker push "$IMAGE_NAME:latest"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Successfully pushed $IMAGE_NAME:latest${NC}"
else
    echo -e "${RED}❌ Failed to push latest image${NC}"
    exit 1
fi

# Success summary
echo ""
echo -e "${GREEN}🎉 Build and push completed successfully!${NC}"
echo "=================================================="
echo -e "${BLUE}📦 Image: ${GREEN}$IMAGE_NAME:$NEW_VERSION${NC}"
echo -e "${BLUE}📦 Image: ${GREEN}$IMAGE_NAME:latest${NC}"
echo -e "${BLUE}🔖 Version: ${GREEN}$CURRENT_VERSION → $NEW_VERSION${NC}"
echo ""
echo -e "${YELLOW}💡 Next steps:${NC}"
echo "   1. Deploy using: docker service update --image $IMAGE_NAME:$NEW_VERSION allegutta-web"
echo "   2. Or use docker-compose: docker stack deploy -c docker-compose.swarm.yml allegutta"
echo ""
echo -e "${BLUE}🔗 Docker Hub: ${NC}https://hub.docker.com/r/bisand/allegutta-web"
