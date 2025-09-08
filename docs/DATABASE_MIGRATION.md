# AlleGutta Database Setup Guide (Environment-Aware)

## Overview

This guide explains the **environment-aware** database setup for AlleGutta. The system automatically detects whether you're in development or production and uses the appropriate database strategy:

- **🧪 Development**: Uses `prisma db push` for fast iteration
- **🏭 Production**: Uses `prisma migrate deploy` for data safety

## Environment Detection

The system automatically detects your environment based on:

```bash
# Production indicators:
NODE_ENV=production
ENVIRONMENT=production  
RAILWAY_ENVIRONMENT=production
VERCEL_ENV=production

# Or production database URLs containing:
# amazonaws, planetscale, railway, render, fly, vercel
```

## Environment-Specific Behavior

### 🧪 **Development Mode (Default)**
- **Method**: `prisma db push --accept-data-loss`
- **Safety**: ⚠️ Can lose data (OK for development)
- **Speed**: ⚡ Very fast
- **Use Case**: Rapid development, testing, staging

### 🏭 **Production Mode**
- **Method**: `prisma migrate deploy`
- **Safety**: ✅ Preserves all data
- **Speed**: Slower (applies migration history)
- **Use Case**: Live production with real user data

## Database Setup Components

### 1. Core Setup Script (`scripts/migrate-db.sh`)
- **Purpose**: Handles database initialization using Schema Push
- **Method**: `npx prisma db push --accept-data-loss`
- **Features**: 
  - Auto-detects SQLite vs external databases
  - Creates directories as needed
  - Validates schema after setup
  - Fallback to schema.sql if needed

### 2. Production Startup Script (`scripts/start-production.sh`)
- **Purpose**: Container entrypoint with schema setup
- **Method**: Schema push before app start
- **Features**:
  - Environment validation
  - Schema setup with logging
  - Error handling with graceful degradation

### 3. Enhanced Dockerfile
- **Includes**: Prisma CLI for production migrations
- **Supports**: Both SQLite and external databases
- **Security**: Non-root user execution
- **Volumes**: Persistent data storage

## Quick Start - Environment-Aware Deployment

### Development/Staging (Default)
```bash
# Build and run (automatically uses schema push)
docker build -t allegutta-dev .
docker run -d \
  --name allegutta-dev \
  -p 3000:3000 \
  -e "NUXT_DATABASE_URL=file:/app/data/development.db" \
  -v /path/to/data:/app/data \
  allegutta-dev
```

### Production (Automatic Migration Detection)
```bash
# Prepare for production (creates migrations)
./scripts/prepare-production.sh

# Build and run with production environment
docker build -t allegutta-prod .
docker run -d \
  --name allegutta-prod \
  -p 3000:3000 \
  -e "NODE_ENV=production" \
  -e "NUXT_DATABASE_URL=postgresql://prod-database-url" \
  allegutta-prod
```

## Schema Setup Process Flow

### Development Mode (Current)
```
🚀 Container starts
├── ✅ Validate NUXT_DATABASE_URL
├── 🔄 Run database schema setup script
│   ├── 🔍 Test database connectivity
│   ├── 🔄 Run prisma db push --accept-data-loss
│   ├── 🔧 Fallback to schema.sql (SQLite only)
│   └── ✅ Verify schema
└── 🚀 Start application server
```

```bash
npx prisma migrate deploy
```

This applies all pending migrations in the correct order and maintains a migration history.

### 2. Fallback Method: Schema SQL

If Prisma migrations fail, the system falls back to applying the complete schema:

```bash
sqlite3 database.db < prisma/schema.sql
```

This ensures deployment can proceed even in edge cases.

## File Structure

```
scripts/
├── migrate-db.sh           # Core migration logic
├── start-production.sh     # Production startup script
├── test-migration.sh       # Local testing
└── test-docker-migration.sh # Docker testing

prisma/
├── schema.prisma          # Prisma schema definition
├── schema.sql            # Complete SQL schema (fallback)
└── migrations/           # Prisma migration files
    ├── 20250902192932_add_amount_field/
    ├── 20250903141014_add_market_data_fields/
    ├── 20250903151501_create_market_data_table/
    └── 20250903185842_add_cash_balance_to_portfolio/
```

## Production Deployment

### Environment Variables

**Required:**
- `NUXT_DATABASE_URL`: Database connection string

**Examples:**
```bash
# SQLite (recommended for small deployments)
NUXT_DATABASE_URL="file:/app/data/production.db"

# PostgreSQL
NUXT_DATABASE_URL="postgresql://user:password@host:port/database"

# MySQL
NUXT_DATABASE_URL="mysql://user:password@host:port/database"

# Turso (SQLite compatible)
NUXT_DATABASE_URL="libsql://your-database.turso.io?authToken=your-token"
```

### Docker Deployment

The Docker container automatically handles database migration:

1. **Build the image:**
   ```bash
   docker build -t allegutta .
   ```

2. **Run with proper database configuration:**
   ```bash
   docker run -d \
     --name allegutta \
     -p 3000:3000 \
     -v ./data:/app/data \
     -e NUXT_DATABASE_URL="file:/app/data/production.db" \
     allegutta
   ```

### Migration Process Flow

```mermaid
graph TD
    A[Container Start] --> B[Check NUXT_DATABASE_URL]
    B --> C[Create directories if needed]
    C --> D[Run migrate-db.sh]
    D --> E[Test database connection]
    E --> F[Try Prisma migrations]
    F --> G{Migrations successful?}
    G -->|Yes| H[Verify schema]
    G -->|No| I[Try fallback schema.sql]
    I --> J{Fallback successful?}
    J -->|Yes| H[Verify schema]
    J -->|No| K[FAIL - Exit]
    H --> L[Start application]
```

## Testing

### Local Testing

Test the migration system locally:

```bash
./scripts/test-migration.sh
```

This tests:
- Fresh database creation
- Existing database migration
- Directory creation
- Production startup simulation

### Docker Testing

Test the complete Docker deployment:

```bash
./scripts/test-docker-migration.sh
```

This tests:
- Docker image build
- Database migration in container
- Schema verification
- Production startup process

## Troubleshooting

### Common Issues

1. **"Foreign key constraint violated"**
   - **Cause:** Database schema mismatch
   - **Solution:** Run migrations or delete database for fresh start

2. **"Environment variable not found: DATABASE_URL"**
   - **Cause:** Missing NUXT_DATABASE_URL environment variable
   - **Solution:** Set the proper database URL

3. **"Prisma migrations failed"**
   - **Cause:** Migration conflicts or database corruption
   - **Solution:** System automatically tries fallback schema

4. **"Database connection failed"**
   - **Cause:** Incorrect database URL or permissions
   - **Solution:** Verify database URL and file permissions

### Manual Migration

If automatic migration fails, manually run:

```bash
# Option 1: Prisma migrations
npx prisma migrate deploy

# Option 2: Apply complete schema
sqlite3 database.db < prisma/schema.sql

# Option 3: Reset database (DANGER: loses data)
rm database.db
npx prisma migrate deploy
```

### Debug Mode

Enable detailed logging:

```bash
export DEBUG=prisma:*
export NUXT_DEV_AUTH=true  # Skip auth in development
```

## Best Practices

### Development

1. **Always create migrations** for schema changes:
   ```bash
   npx prisma migrate dev --name descriptive_name
   ```

2. **Test migrations locally** before deployment
3. **Backup databases** before major schema changes

### Production

1. **Set proper environment variables**
2. **Use persistent volumes** for database files
3. **Monitor migration logs** during deployment
4. **Test database connectivity** after deployment

### Monitoring

Check database health:

```bash
# Verify tables exist
sqlite3 database.db "SELECT name FROM sqlite_master WHERE type='table';"

# Check migration status
npx prisma migrate status

# Test application database connection
curl http://localhost:3000/api/health
```

## External Database Support

For production environments, consider external databases:

### PostgreSQL Setup

```bash
# Set connection string
export NUXT_DATABASE_URL="postgresql://user:password@host:5432/allegutta"

# Deploy migrations
npx prisma migrate deploy
```

### Turso Setup (Recommended for SQLite compatibility)

```bash
# Set connection string with auth token
export NUXT_DATABASE_URL="libsql://your-db.turso.io?authToken=your-token"

# Deploy migrations
npx prisma migrate deploy
```

## Transitioning to Production (When Ready)

When you're ready to deploy to production with persistent data that needs migration support:

### 1. Enable Migrations
```bash
# Create initial migration from current schema
npx prisma migrate dev --name init

# This creates:
# - prisma/migrations/[timestamp]_init/migration.sql
# - Updates prisma/migrations/migration_lock.toml
```

### 2. Update Deployment Scripts
```bash
# Update scripts to use migrations instead of schema push
sed -i 's/db push --accept-data-loss/migrate deploy/g' scripts/migrate-db.sh
sed -i 's/Schema push/Migration/g' scripts/migrate-db.sh
```

### 3. Update .gitignore
```bash
# Remove migrations from .gitignore
sed -i '/prisma\/migrations\//d' .gitignore
```

### 4. Commit Migration Files
```bash
git add prisma/migrations/
git commit -m "feat: add initial production migration"
```

### 5. Deploy to Production
```bash
# Build production image
docker build -t allegutta-prod .

# Deploy with migration support
docker run -d \
  --name allegutta-prod \
  -e "NUXT_DATABASE_URL=postgresql://prod-db" \
  allegutta-prod
```

## Development vs Production Comparison

| Aspect | Development (Current) | Production (Future) |
|--------|----------------------|-------------------|
| **Schema Changes** | `prisma db push` | `prisma migrate deploy` |
| **Data Persistence** | ⚠️ Can lose data | ✅ Data preserved |
| **Schema History** | ❌ No history | ✅ Migration history |
| **Rollbacks** | Redeploy | Specific migration rollback |
| **Team Sync** | Schema file only | Migration files in git |
| **Speed** | ⚡ Very fast | Slower (applies migrations) |
| **Safety** | ⚠️ Destructive OK | 🛡️ Non-destructive only |

## Previous Migration History (Backed Up)

The following migrations were removed during development mode transition:
- `20250902192932_add_amount_field`: Added amount field to transactions
- `20250903141014_add_market_data_fields`: Enhanced market data fields
- `20250903151501_create_market_data_table`: Created market data table
- `20250903185842_add_cash_balance_to_portfolio`: Added cash balance tracking

These are backed up in `prisma/migrations_backup_*` and will be recreated when transitioning to production.
