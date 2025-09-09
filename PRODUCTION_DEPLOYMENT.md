# 🛡️ Production-Safe Database Deployment

## Overview

AlleGutta uses a **production-safe database strategy** that **NEVER destroys data** during deployments. All updates are additive and include automatic backups.

## 🚀 Production Deployment Process

### Automatic Deployment (Recommended)

```bash
# Single command that handles everything safely
./scripts/deploy-production.sh
```

This script automatically:
1. ✅ **Creates backup** before any changes
2. ✅ **Validates existing database**
3. ✅ **Updates schema safely** (additive only)
4. ✅ **Verifies deployment** success
5. ✅ **Provides rollback instructions** if needed

### Manual Deployment Steps

If you prefer manual control:

```bash
# 1. Backup first (ALWAYS!)
./scripts/backup.sh production

# 2. Update schema safely
./scripts/init-db.sh production

# 3. Verify everything works
npx prisma db execute --stdin <<< "SELECT 1;"
```

## 🛡️ Data Safety Guarantees

### ✅ What WILL Happen
- ✅ **New tables** will be created
- ✅ **New columns** will be added to existing tables
- ✅ **All existing data** will be preserved
- ✅ **Automatic backup** before any changes
- ✅ **Schema validation** before deployment

### ❌ What will NEVER Happen
- ❌ **Existing data** will NEVER be deleted
- ❌ **Existing columns** will NEVER be removed
- ❌ **Tables** will NEVER be dropped
- ❌ **Destructive operations** will NEVER run automatically

## 🔄 Deployment Scenarios

### 1. Fresh Production Deployment
```bash
# First time deployment - creates everything from scratch
export NUXT_DATABASE_URL="file:/app/data/portfolio.db"
./scripts/deploy-production.sh
```

### 2. Update Existing Production
```bash
# Updates existing database - preserves all data
./scripts/deploy-production.sh
```

### 3. Docker Deployment
```bash
# Update Docker database volume
./scripts/init-db.sh docker
```

## 📦 Backup Strategy

### Automatic Backups
- **Every deployment** creates automatic backup
- **Backup location**: `./backups/portfolio_backup_production_TIMESTAMP.db`
- **Retention**: Keeps 10 most recent backups

### Manual Backups
```bash
# Create manual backup anytime
./scripts/backup.sh production

# List existing backups
ls -la ./backups/
```

### Restore from Backup
```bash
# If rollback is needed
cp ./backups/portfolio_backup_production_TIMESTAMP.db /app/data/portfolio.db
```

## 🚨 Emergency Procedures

### Deployment Failed
1. **Check error logs** from deployment script
2. **Restore backup** if needed:
   ```bash
   cp ./backups/portfolio_backup_production_LATEST.db $NUXT_DATABASE_URL
   ```
3. **Contact development team** with error details

### Database Corruption
1. **Stop application** immediately
2. **Restore latest backup**:
   ```bash
   ./scripts/backup.sh production  # Create current state backup first
   cp ./backups/portfolio_backup_production_KNOWN_GOOD.db $NUXT_DATABASE_URL
   ```
3. **Restart application**

### Schema Conflicts
If you see "column already exists" errors:
```bash
# This is usually safe - the schema is already up to date
npx prisma db execute --stdin <<< "SELECT 1;"  # Test connectivity
```

## 🔍 Health Checks

### Pre-Deployment Checks
```bash
# 1. Verify schema is valid
npx prisma validate

# 2. Test current database
sqlite3 $NUXT_DATABASE_URL ".tables"

# 3. Check disk space
df -h
```

### Post-Deployment Checks
```bash
# 1. Verify all tables exist
sqlite3 $NUXT_DATABASE_URL ".tables"

# 2. Check record counts
sqlite3 $NUXT_DATABASE_URL "
  SELECT 'users', COUNT(*) FROM users
  UNION ALL
  SELECT 'portfolios', COUNT(*) FROM portfolios
  UNION ALL
  SELECT 'transactions', COUNT(*) FROM transactions;
"

# 3. Test application startup
# (Application will verify schema automatically)
```

## 📊 Monitoring

The application automatically logs database status on startup:
- ✅ **Connection status**
- ✅ **Table accessibility**
- ✅ **Schema validation results**
- ⚠️ **Any issues found**

Watch application logs for these messages during deployment.

## 🔧 Troubleshooting

### "Table does not exist" errors
```bash
./scripts/init-db.sh production
```

### "Database locked" errors
```bash
# Stop application first, then:
./scripts/init-db.sh production
```

### Permission errors
```bash
# Ensure proper file permissions
chown -R app:app /app/data/
chmod 644 /app/data/portfolio.db
```

## 🎯 Best Practices

1. **Always backup** before deployments
2. **Test deployments** in staging first
3. **Monitor logs** during deployment
4. **Keep multiple backups** for important data
5. **Document any manual changes** made to production
6. **Use the automated script** unless you have specific needs

## 📱 Quick Reference

```bash
# Deploy to production (all-in-one)
./scripts/deploy-production.sh

# Manual backup
./scripts/backup.sh production

# Emergency restore
cp ./backups/BACKUP_FILE.db $NUXT_DATABASE_URL

# Health check
sqlite3 $NUXT_DATABASE_URL ".tables"
```
