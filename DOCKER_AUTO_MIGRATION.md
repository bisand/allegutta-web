# 🐳 Docker Production Deployment with Auto-Migration

## 🚀 **YES! Automatic Database Migration in Docker**

When your Docker container starts in production, the database will **automatically** be migrated safely without any manual intervention!

## 🔄 **How It Works**

### **Startup Flow**
1. 🐳 **Docker container starts**
2. 📋 **Production startup script runs** (`start-production.sh`)
3. 🔍 **Initial database check** (optional pre-check)
4. 🚀 **Nuxt application starts**
5. 🔌 **Database plugin activates** (`server/plugins/database-init.ts`)
6. 🛡️ **Production-safe auto-migration**:
   - ✅ **Detects existing data**
   - ✅ **Creates automatic backup**
   - ✅ **Updates schema safely**
   - ✅ **Preserves all data**
   - ✅ **Logs everything**

### **Safety Guarantees**
- 🛡️ **NEVER deletes data** - only adds tables/columns
- 📦 **Automatic backup** before any changes
- 🔍 **Validates schema** before proceeding
- ⚠️ **Graceful fallback** if issues occur
- 📝 **Comprehensive logging** for monitoring

## 🐳 **Docker Deployment Commands**

### **Fresh Deployment**
```bash
# Build and deploy new container
docker build -t allegutta-web:latest .
docker run -d \
  --name allegutta-app \
  -p 3000:3000 \
  -v allegutta_data:/app/data \
  -e NODE_ENV=production \
  -e NUXT_DATABASE_URL="file:/app/data/portfolio.db" \
  -e NUXT_AUTO_DB_UPDATE="true" \
  allegutta-web:latest
```

### **Update Existing Deployment**
```bash
# Pull latest code and rebuild
docker build -t allegutta-web:latest .

# Stop old container
docker stop allegutta-app
docker rm allegutta-app

# Start new container (data volume preserves database)
docker run -d \
  --name allegutta-app \
  -p 3000:3000 \
  -v allegutta_data:/app/data \
  -e NODE_ENV=production \
  -e NUXT_DATABASE_URL="file:/app/data/portfolio.db" \
  -e NUXT_AUTO_DB_UPDATE="true" \
  allegutta-web:latest
```

### **Using Docker Compose**
```yaml
# docker-compose.yml
version: '3.8'
services:
  allegutta:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - allegutta_data:/app/data
      - allegutta_backups:/app/backups
    environment:
      - NODE_ENV=production
      - NUXT_DATABASE_URL=file:/app/data/portfolio.db
      - NUXT_AUTO_DB_UPDATE=true
    restart: unless-stopped

volumes:
  allegutta_data:
  allegutta_backups:
```

## ⚙️ **Environment Variables**

### **Required**
- `NODE_ENV=production` - Enables production mode
- `NUXT_DATABASE_URL` - Database connection string

### **Optional**
- `NUXT_AUTO_DB_UPDATE=true` - Enable automatic schema updates (default: true)
- `NUXT_AUTO_DB_UPDATE=false` - Disable auto-updates (verification only)

## 📋 **Startup Logs to Monitor**

### **Successful Auto-Migration**
```
🚀 Starting AlleGutta production setup...
✅ NUXT_DATABASE_URL is configured
📊 Checking database status and setting up schema...
🔄 Running production-safe database initialization...
📊 Existing database found: /app/data/portfolio.db
📋 Database contains existing tables
   📊 Table 'users': 150 records
   📊 Table 'portfolios': 25 records
🛡️  PRODUCTION MODE: Using safest approach for existing data
✅ Schema updated successfully (production-safe)
🎉 Database initialization complete!
🚀 Starting AlleGutta application...
🔍 Production mode: Verifying database schema...
🛡️  Auto-update enabled (production-safe)
✅ Table 'users' is accessible
✅ Table 'portfolios' is accessible
🎉 Database initialization complete - server ready!
```

### **First-Time Deployment**
```
🚀 Starting AlleGutta production setup...
✅ NUXT_DATABASE_URL is configured
📊 Checking database status and setting up schema...
🆕 Creating new database from scratch
✅ New database created successfully
🚀 Starting AlleGutta application...
🔍 Production mode: Verifying database schema...
🎉 Database initialization complete - server ready!
```

### **Auto-Recovery Flow**
```
🔍 Production mode: Verifying database schema...
💥 Database initialization failed
⚠️  Table 'new_table' needs schema update
🔄 Attempting automatic schema update (production-safe)...
📦 Creating automatic backup...
✅ Backup created: /app/backups/portfolio_backup_production_20250909_120000.db
🔧 Updating schema safely...
✅ Automatic schema update completed!
🔄 Retrying database initialization...
🎉 Database now ready after automatic update!
```

## 🔍 **Health Monitoring**

### **Health Check Endpoint**
```bash
# Check if application is ready
curl http://localhost:3000/api/health

# Expected response for healthy app
{"status": "ok", "database": "connected"}
```

### **Docker Health Check**
```bash
# Check container health
docker ps

# View health check logs
docker inspect --format='{{.State.Health.Status}}' allegutta-app
```

### **Database Status Check**
```bash
# Enter container to check database
docker exec -it allegutta-app sh

# Check database tables
sqlite3 /app/data/portfolio.db ".tables"

# Check record counts
sqlite3 /app/data/portfolio.db "
  SELECT 'users', COUNT(*) FROM users
  UNION ALL
  SELECT 'portfolios', COUNT(*) FROM portfolios;
"
```

## 🚨 **Troubleshooting**

### **Schema Update Failed**
```bash
# Check container logs
docker logs allegutta-app

# If auto-update failed, run manual update
docker exec -it allegutta-app ./scripts/deploy-production.sh
```

### **Database Corruption**
```bash
# Restore from automatic backup
docker exec -it allegutta-app sh -c "
  ls -la /app/backups/
  cp /app/backups/portfolio_backup_production_LATEST.db /app/data/portfolio.db
"

# Restart container
docker restart allegutta-app
```

### **Disable Auto-Updates**
```bash
# Start container with auto-updates disabled
docker run -d \
  --name allegutta-app \
  -p 3000:3000 \
  -v allegutta_data:/app/data \
  -e NODE_ENV=production \
  -e NUXT_DATABASE_URL="file:/app/data/portfolio.db" \
  -e NUXT_AUTO_DB_UPDATE="false" \
  allegutta-web:latest
```

## 📊 **Data Persistence**

### **Volume Mounts**
- `/app/data` - **Database files** (persistent across container updates)
- `/app/backups` - **Automatic backups** (optional, recommended)

### **Backup Strategy**
- ✅ **Automatic backups** before every schema update
- ✅ **Retention**: 10 most recent backups kept
- ✅ **Location**: `/app/backups/` in container
- ✅ **Format**: `portfolio_backup_production_TIMESTAMP.db`

## 🎯 **Best Practices**

1. **Always use volumes** for data persistence
2. **Monitor startup logs** for schema updates
3. **Regular backups** outside container (optional)
4. **Test deployments** in staging first
5. **Keep auto-update enabled** for seamless updates

## 🎉 **Summary**

**YES!** Your Docker deployment will:
- ✅ **Automatically detect** database schema changes
- ✅ **Create backups** before any updates
- ✅ **Update schema safely** without losing data
- ✅ **Start successfully** even with schema changes
- ✅ **Log everything** for monitoring
- ✅ **Provide rollback** capabilities if needed

**No manual intervention required!** 🚀
