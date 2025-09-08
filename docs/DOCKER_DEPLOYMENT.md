# Docker Deployment Guide

## Overview

This repository contains a **multi-stage Docker build** setup optimized for minimal production image size and robust deployment of the AlleGutta portfolio management application.

## Docker Images

### 1. Production Multi-Stage Build (`Dockerfile`)
- **Builder stage**: Alpine Linux with zero build dependencies
- **Production stage**: Alpine Linux runtime for minimal size
- **Benefits**: Smallest possible image size, fastest builds
- **Image size**: ~120MB (estimated)
- **Recommended**: Production deployments

### 2. Alpine-Only Build (`Dockerfile.alpine`)
- **Purpose**: Pure Alpine Linux approach - optimized and minimal!
- **Benefits**: Smallest images, fastest builds, zero build dependencies
- **Build dependencies**: None! (no python3, make, g++ needed)
- **Runtime dependencies**: Only sqlite, curl, dumb-init
- **Image size**: ~120MB (estimated) 
- **Use case**: ✅ **RECOMMENDED** - Production deployments

### 3. Fast Development Build (`Dockerfile.fast`)
- **Purpose**: Development and testing with Debian slim
- **Benefits**: Single-stage simplicity, minimal dependencies
- **Dependencies**: Only sqlite3, curl, dumb-init (no build tools)
- **Image size**: ~300MB (estimated)
- **Use case**: Development, CI/CD testing

## Build Scripts

### `scripts/build-and-push.sh`
Automated build and push to Docker Hub with 4-part version management:
```bash
# Increment build number only (default)
./scripts/build-and-push.sh

# Increment patch version (build number always increments)
./scripts/build-and-push.sh patch

# Increment minor version (resets patch, build always increments)
./scripts/build-and-push.sh minor

# Increment major version (resets minor and patch, build always increments)
./scripts/build-and-push.sh major
```
- Uses semantic versioning: `MAJOR.MINOR.PATCH.BUILD`
- **Build number always increments** regardless of increment type
- Builds production Docker image
- Pushes to `bisand/allegutta-web:latest` and `bisand/allegutta-web:x.x.x.x`
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
- Format: `MAJOR.MINOR.PATCH.BUILD`
- **BUILD**: Always increments for every Docker build
- **PATCH**: Bug fixes and small changes (resets to 0, but build continues incrementing)
- **MINOR**: New features (resets patch to 0, but build continues incrementing)  
- **MAJOR**: Breaking changes (resets minor and patch to 0, but build continues incrementing)
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

## ✅ **Build Issues Resolved!**

**Problem**: `@nuxt/content` module was causing `better-sqlite3` compilation errors during Docker builds due to Alpine Linux musl/glibc compatibility issues.

**Solution**: Removed `@nuxt/content` dependency since it wasn't being used in the application, eliminating the build-time `better-sqlite3` requirement.

### Build Issues
- **✅ better-sqlite3 compilation errors**: RESOLVED by removing unused `@nuxt/content`
- **Alpine Linux compatibility**: Now works perfectly with pure Alpine builds
- **Permission errors**: User/group properly configured
- **Memory issues**: Multi-stage build reduces memory usage
- **Clean builds**: Fast, reliable compilation without native module issues

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
