#!/bin/bash

# AlleGutta Web - Build and Push Docker Image Script
# This script builds the Docker image, tags it with version, andecho ""
echo -e "${YELLOW}💡 Next steps:${NC}"
echo "   1. Deploy using: docker service update --image $IMAGE_NAME:$NEW_VERSION allegutta-web"
echo "   2. Or use docker-compose: docker stack deploy -c docker-compose.swarm.yml allegutta"
echo ""
echo -e "${BLUE}🔧 Version increment options:${NC}"
echo "   • $0 build   - Increment build number only"
echo "   • $0 patch   - Increment patch, reset to x.x.PATCH.BUILD"
echo "   • $0 minor   - Increment minor, reset to x.MINOR.0.BUILD"
echo "   • $0 major   - Increment major, reset to MAJOR.0.0.BUILD"
echo "   ${YELLOW}Note: BUILD number always increments regardless of increment type${NC}"
echo ""
echo -e "${BLUE}🔗 Docker Hub: ${NC}https://hub.docker.com/r/bisand/allegutta-web"ocker Hub

set -e  # Exit on any error

# Configuration
DOCKER_REGISTRY="docker.io"
IMAGE_NAME="bisand/allegutta-web"
VERSION_FILE="VERSION"
DOCKERFILE=${2:-"Dockerfile"}  # Allow custom Dockerfile as second argument

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 AlleGutta Web - Docker Build & Push Script${NC}"
echo "=================================================="
echo -e "${BLUE}Usage: $0 [major|minor|patch|build] [Dockerfile]${NC}"
echo -e "${BLUE}Default: build increment with Dockerfile${NC}"
echo -e "${BLUE}Alternative Dockerfiles: Dockerfile.fast, Dockerfile.alpine${NC}"
echo ""

# Check if VERSION file exists
if [ ! -f "$VERSION_FILE" ]; then
    echo -e "${RED}❌ VERSION file not found!${NC}"
    exit 1
fi

# Read current version
CURRENT_VERSION=$(cat $VERSION_FILE)
echo -e "${BLUE}📋 Current version: ${YELLOW}$CURRENT_VERSION${NC}"

# Parse version components
IFS='.' read -r MAJOR MINOR PATCH BUILD <<< "$CURRENT_VERSION"

# Default: increment build number
INCREMENT_TYPE=${1:-build}

# Always increment build number
NEW_BUILD=$((BUILD + 1))

case "$INCREMENT_TYPE" in
    "major")
        NEW_MAJOR=$((MAJOR + 1))
        NEW_VERSION="$NEW_MAJOR.0.0.$NEW_BUILD"
        ;;
    "minor")
        NEW_MINOR=$((MINOR + 1))
        NEW_VERSION="$MAJOR.$NEW_MINOR.0.$NEW_BUILD"
        ;;
    "patch")
        NEW_PATCH=$((PATCH + 1))
        NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH.$NEW_BUILD"
        ;;
    "build"|*)
        NEW_VERSION="$MAJOR.$MINOR.$PATCH.$NEW_BUILD"
        ;;
esac

echo -e "${BLUE}📈 New version: ${GREEN}$NEW_VERSION${NC}"

# Ask for confirmation
read -p "🤔 Do you want to build $DOCKERFILE and push version $NEW_VERSION? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Build cancelled by user${NC}"
    exit 0
fi

# Update VERSION file
echo "$NEW_VERSION" > $VERSION_FILE
echo -e "${GREEN}✅ Updated VERSION file to $NEW_VERSION${NC}"

# Build Docker image
echo -e "${BLUE}🔨 Building Docker image using $DOCKERFILE...${NC}"
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
docker build \
    --build-arg BUILD_DATE="$BUILD_DATE" \
    --build-arg BUILD_VERSION="$NEW_VERSION" \
    -t "$IMAGE_NAME:$NEW_VERSION" \
    -t "$IMAGE_NAME:latest" \
    -f $DOCKERFILE .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker image built successfully${NC}"
else
    echo -e "${RED}❌ Docker build failed${NC}"
    # Revert VERSION file
    echo "$CURRENT_VERSION" > $VERSION_FILE
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
echo -e "${BLUE}� Version increment options:${NC}"
echo "   • $0 build   - Increment build number (default)"
echo "   • $0 patch   - Increment patch, reset build to 0"
echo "   • $0 minor   - Increment minor, reset patch and build to 0"
echo "   • $0 major   - Increment major, reset minor, patch and build to 0"
echo ""
echo -e "${BLUE}�🔗 Docker Hub: ${NC}https://hub.docker.com/r/bisand/allegutta-web"
