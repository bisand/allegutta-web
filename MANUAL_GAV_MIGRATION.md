# Manual GAV Production Migration Guide

## Problem
The production application is failing with this error:
```
The column `main.holdings.manualAvgPrice` does not exist in the current database.
```

This occurs because the Manual GAV feature was added to the codebase but the database schema was never updated in production.

## Solution

### Option 1: Quick Migration (Recommended)
Run this single command in the production environment:

```bash
./scripts/migrate-manual-gav.sh
```

### Option 2: Manual Migration
If you prefer to run the steps manually:

1. **Backup the database:**
   ```bash
   cp /app/data/portfolio.db /app/data/portfolio.db.backup.$(date +%Y%m%d_%H%M%S)
   ```

2. **Apply the schema changes:**
   ```bash
   sqlite3 /app/data/portfolio.db < scripts/migrate-manual-gav.sql
   ```

3. **Regenerate Prisma client:**
   ```bash
   npx prisma generate
   ```

4. **Restart the application:**
   ```bash
   # Restart your Docker container or application process
   ```

### Option 3: Using Prisma Migration (Alternative)
If you prefer using Prisma's migration system:

```bash
# Generate the migration
npx prisma migrate dev --name add-manual-gav-fields

# Apply to production
npx prisma migrate deploy
```

## Verification

After applying the migration, verify it worked:

```bash
sqlite3 /app/data/portfolio.db "PRAGMA table_info(holdings);" | grep -E "(manualAvgPrice|useManualAvgPrice)"
```

You should see output similar to:
```
7|manualAvgPrice|REAL|0||0
8|useManualAvgPrice|BOOLEAN|1|0|0
9|manualAvgPriceReason|TEXT|0||0
10|manualAvgPriceDate|DATETIME|0||0
```

## What This Fixes

After migration, these features will work:
- ✅ Portfolio holdings loading (fixes the 500 errors)
- ✅ Manual GAV editing in admin interface
- ✅ GAV override functionality for correcting transaction data issues
- ✅ Audit trail for manual GAV changes

## Rollback Plan

If something goes wrong, restore the backup:

```bash
cp /app/data/portfolio.db.backup.* /app/data/portfolio.db
# Restart the application
```

## Files Changed

- `prisma/schema.prisma` - Added manual GAV fields
- `server/lib/portfolioCalculations.ts` - Preserve manual GAV during recalculations
- `server/api/portfolios/[id]/holdings/[symbol]/manual-gav.*` - API endpoints
- `app/pages/admin/holdings.vue` - Admin interface
- `app/components/Portfolio/EditManualGavModal.vue` - GAV editor modal
