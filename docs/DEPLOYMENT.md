# 🚀 Deployment Guide: SQLite Persistence Strategies

## 📊 Overview

This guide covers different strategies for deploying AlleGutta with persistent SQLite storage across various platforms.

## 🐳 Docker Swarm Deployment

### Prerequisites
- Docker Swarm cluster
- Persistent storage on manager nodes

### Steps

1. **Prepare the host:**
```bash
# Create data directory on the swarm manager
sudo mkdir -p /opt/allegutta/data
sudo chown -R 1000:1000 /opt/allegutta/data
```

2. **Build and deploy:**
```bash
# Build the image
docker build -t allegutta-web:latest .

# Deploy to swarm
docker stack deploy -c docker-compose.swarm.yml allegutta
```

3. **Initialize database:**
```bash
# Run database setup in container
docker exec $(docker ps -q -f name=allegutta_allegutta-web) /app/scripts/init-db.sh docker
```

### ⚠️ Important Notes
- **Single replica only**: SQLite doesn't support multiple writers
- **Manager node placement**: Ensures consistent file location
- **Volume binding**: Maps to host filesystem for persistence

---

## ☁️ Cloudflare Pages/Workers with D1

### Prerequisites
- Cloudflare account with D1 access
- Wrangler CLI installed

### Steps

1. **Create D1 database:**
```bash
# Install Wrangler
npm install -g wrangler

# Create D1 database
wrangler d1 create allegutta-production

# Note the database ID from output
```

2. **Update wrangler.toml:**
```toml
[[env.production.d1_databases]]
binding = "DB"
database_name = "allegutta-production"
database_id = "your-actual-d1-database-id"
```

3. **Set secrets:**
```bash
wrangler secret put NUXT_KINDE_CLIENT_ID
wrangler secret put NUXT_KINDE_CLIENT_SECRET
wrangler secret put NUXT_KINDE_PASSWORD
wrangler secret put JWT_SECRET
wrangler secret put NUXT_SESSION_PASSWORD
```

4. **Deploy:**
```bash
# Deploy to Cloudflare
wrangler pages deploy

# Initialize database
wrangler d1 execute allegutta-production --file=./schema.sql
```

### ✅ Benefits
- **Global edge distribution**
- **Zero cold start**
- **Automatic scaling**
- **Built-in persistence**

---

## 🔺 Vercel Deployment Options

### Option A: Turso (SQLite-compatible)

1. **Create Turso database:**
```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Create database
turso db create allegutta-production

# Get connection details
turso db show allegutta-production
```

2. **Set environment variables in Vercel:**
```bash
NUXT_DATABASE_URL="libsql://your-database-url.turso.io?authToken=your-auth-token"
```

### Option B: PlanetScale (MySQL)

1. **Update Prisma schema:**
```prisma
datasource db {
  provider = "mysql"
  url      = env("NUXT_DATABASE_URL")
  relationMode = "prisma"
}
```

2. **Set environment variables:**
```bash
NUXT_DATABASE_URL="mysql://username:password@host:port/database?sslaccept=strict"
```

### Option C: Neon (PostgreSQL)

1. **Update Prisma schema:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("NUXT_DATABASE_URL")
}
```

2. **Set environment variables:**
```bash
NUXT_DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
```

---

## 🔧 Database Migration Strategy

### For Docker/Self-hosted:
```bash
# In container startup
./scripts/init-db.sh docker
```

### For Cloudflare D1:
```bash
# Generate SQL schema
npx prisma db push --force-reset
npx prisma db push --preview-feature

# Apply to D1
wrangler d1 execute allegutta-production --file=./migrations/schema.sql
```

### For Vercel (external DB):
```bash
# Set build command in vercel.json
npx prisma db push
npm run build
```

---

## 📈 Monitoring & Backup

### Health Checks
All deployments include `/api/health` endpoint:
```json
{
  "status": "healthy",
  "timestamp": "2025-09-01T18:00:00.000Z",
  "database": "connected",
  "version": "1.0.0"
}
```

### Backup Strategies

#### Docker/Self-hosted:
```bash
# Backup SQLite file
cp /opt/allegutta/data/production.db /backup/allegutta-$(date +%Y%m%d).db

# Automated backup script
0 2 * * * /opt/allegutta/backup.sh
```

#### Cloudflare D1:
```bash
# Export database
wrangler d1 backup create allegutta-production
wrangler d1 backup download allegutta-production backup-id
```

#### External databases:
- Use provider's backup features
- Turso: Automatic backups included
- PlanetScale: Built-in branching and backups
- Neon: Point-in-time recovery

---

## 🎯 Recommendation by Use Case

| Use Case | Recommended Solution | Why |
|----------|---------------------|-----|
| **High Performance** | Docker Swarm + SSD | Direct SQLite access, no network latency |
| **Global Scale** | Cloudflare D1 | Edge distribution, zero cold start |
| **Quick Deploy** | Vercel + Turso | Easy setup, SQLite compatibility |
| **Enterprise** | Docker + PostgreSQL | Full control, robust ecosystem |

## 🚨 Important Considerations

1. **SQLite Limitations:**
   - Single writer only
   - No horizontal scaling
   - File-based locking

2. **Container Best Practices:**
   - Always use persistent volumes
   - Single replica for SQLite
   - Regular backups

3. **Edge Deployment:**
   - Consider read replicas
   - Cache frequently accessed data
   - Use CDN for static assets

Choose the strategy that best fits your performance, scaling, and operational requirements!
