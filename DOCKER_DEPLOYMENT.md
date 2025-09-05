# Docker Deployment Guide

## Overview

This repository contains a **multi-stage Docker build** setup optimized for minimal production image size and robust deployment of the AlleGutta portfolio management application.

## Docker Images

### 1. Production Multi-Stage Build (`Dockerfile`)
- **Builder stage**: Full development environment with build tools
- **Production stage**: Minimal runtime environment (Alpine Linux + Node.js 20)
- **Benefits**: Smallest possible image size, better security
- **Image size**: ~150MB (estimated)

### 2. Fast Single-Stage Build (`Dockerfile.fast`)
- **Purpose**: Development and testing
- **Benefits**: Faster build times, easier debugging
- **Image size**: ~400MB (estimated)

## Build Scripts

### `scripts/build-and-push.sh`
Automated build and push to Docker Hub with version management:
```bash
./scripts/build-and-push.sh
```
- Increments version number automatically
- Builds production Docker image
- Pushes to `bisand/allegutta-web:latest` and `bisand/allegutta-web:x.x.x`
- Requires Docker Hub authentication

### `scripts/test-build.sh`
Quick build test without pushing:
```bash
./scripts/test-build.sh
```
- Tests Docker build process
- Cleans up test images automatically
- Perfect for CI/CD validation

### `scripts/setup-env.sh`
Environment setup for production deployment:
```bash
./scripts/setup-env.sh
```
- Creates `.env` template with required variables
- Includes Kinde authentication setup
- Ready for Docker Swarm deployment

## Deployment Files

### `docker-compose.swarm.yml`
Production Docker Swarm configuration:
- **SQLite persistence** with host volume binding
- **Health checks** with automatic restarts
- **Rolling updates** with rollback capability
- **Single replica** (SQLite constraint)
- **Network isolation** with overlay network

### Version Management
Version information is stored in `VERSION` file:
- Format: `MAJOR.MINOR.PATCH`
- Automatically incremented by build script
- Used for Docker image tagging

## Quick Start

### 1. Build Test (Local)
```bash
# Test the build process
./scripts/test-build.sh
```

### 2. Production Build & Push
```bash
# Login to Docker Hub
docker login

# Build and push to Docker Hub
./scripts/build-and-push.sh
```

### 3. Deploy to Production
```bash
# Setup environment
./scripts/setup-env.sh
# Edit .env file with your values

# Deploy to Docker Swarm
docker stack deploy -c docker-compose.swarm.yml allegutta
```

## Environment Variables

### Required for Production
```bash
# Security
NUXT_SECRET_KEY=your-32-character-secret-key

# Kinde Authentication
NUXT_KINDE_ISSUER_BASE_URL=https://your-domain.kinde.com
NUXT_KINDE_CLIENT_ID=your-client-id
NUXT_KINDE_CLIENT_SECRET=your-client-secret
NUXT_KINDE_CALLBACK_URL=https://your-domain.com/api/auth/kinde_callback
NUXT_KINDE_POST_LOGOUT_REDIRECT_URL=https://your-domain.com
```

## Image Size Optimization

The multi-stage build achieves minimal image size through:

1. **Separation of Concerns**: Build dependencies only in builder stage
2. **Alpine Linux**: Minimal base image (~5MB)
3. **Selective Copying**: Only runtime artifacts in production stage
4. **Native Dependencies**: Pre-built better-sqlite3 bindings
5. **No Package Manager**: Direct Node.js execution

### Build Stages Breakdown:
- **Builder**: ~800MB (full toolchain, dependencies, source code)
- **Production**: ~150MB (Alpine + Node.js + built app + SQLite)

## Security Features

- **Non-root user**: Application runs as `nuxtjs` user
- **Minimal attack surface**: Only required packages in production
- **Signal handling**: Proper process management with `dumb-init`
- **Health checks**: Automatic container restart on failure

## Troubleshooting

### Build Issues
- **better-sqlite3 errors**: Native bindings rebuilt for Alpine
- **Permission errors**: User/group properly configured
- **Memory issues**: Multi-stage build reduces memory usage

### Runtime Issues
- **Database errors**: SQLite file permissions and volume mounting
- **Authentication errors**: Kinde environment variables
- **Health check failures**: API endpoint availability

## CI/CD Integration

Example GitHub Actions workflow:
```yaml
- name: Build and Push Docker Image
  run: |
    echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
    ./scripts/build-and-push.sh
```

## Monitoring

The application includes:
- **Health endpoint**: `/api/health`
- **Structured logging**: Application-level logging
- **Process monitoring**: Container health checks
- **Volume monitoring**: SQLite database persistence

## Migration Notes

When upgrading versions:
1. Database migrations are automatic (Prisma)
2. Volume data persists across container updates
3. Zero-downtime rolling updates supported
4. Rollback capability included in Swarm config
