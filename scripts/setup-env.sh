#!/bin/bash

# AlleGutta Web - Environment Setup Script
# Sets up environment variables for Docker Swarm deployment

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 AlleGutta Web - Environment Setup${NC}"
echo "========================================"

# Check if .env file exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
    read -p "🤔 Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}⚠️  Setup cancelled by user${NC}"
        exit 0
    fi
fi

# Create .env template
cat > .env << 'EOF'
# AlleGutta Web - Production Environment Variables
# Copy this file and fill in your actual values

# Application Settings
NODE_ENV=production
NUXT_DEV_AUTH=false

# Security
NUXT_SECRET_KEY=your-secret-key-here-min-32-characters

# Kinde Authentication (https://kinde.com)
NUXT_KINDE_ISSUER_BASE_URL=https://your-domain.kinde.com
NUXT_KINDE_CLIENT_ID=your-client-id
NUXT_KINDE_CLIENT_SECRET=your-client-secret
NUXT_KINDE_CALLBACK_URL=https://your-domain.com/api/auth/kinde_callback
NUXT_KINDE_POST_LOGOUT_REDIRECT_URL=https://your-domain.com

# Database (automatically configured for SQLite in container)
DATABASE_URL=file:/app/data/production.db
EOF

echo -e "${GREEN}✅ Created .env template file${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Please edit .env file with your actual values before deployment!${NC}"
echo ""
echo -e "${BLUE}📝 Required steps:${NC}"
echo "   1. Edit .env file with your Kinde credentials"
echo "   2. Generate a secure NUXT_SECRET_KEY (min 32 characters)"
echo "   3. Update domain URLs to match your deployment"
echo ""
echo -e "${BLUE}🔗 Kinde Setup Guide:${NC}"
echo "   https://docs.kinde.com/get-started/guides/add-login-to-nuxt/"
echo ""
echo -e "${BLUE}🚀 Deploy with:${NC}"
echo "   docker stack deploy -c docker-compose.swarm.yml allegutta"
