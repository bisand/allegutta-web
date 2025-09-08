# AlleGutta Database Migration Guide

## Overview

This guide explains how to ensure proper database migration when deploying AlleGutta to production. The migration system has been designed to handle both fresh deployments and updates to existing databases.

## Migration System Components

### 1. Core Migration Script (`scripts/migrate-db.sh`)
- **Purpose**: Handles database initialization and migration using Prisma
- **Features**: 
  - Auto-detects SQLite vs external databases
  - Runs Prisma migrations with fallback to schema.sql
  - Validates database connectivity and schema
  - Creates directories as needed

### 2. Production Startup Script (`scripts/start-production.sh`)
- **Purpose**: Production container entrypoint with migration
- **Features**:
  - Environment validation
  - Database migration before app start
  - Comprehensive logging
  - Error handling with graceful degradation

### 3. Enhanced Dockerfile
- **Includes**: Prisma CLI for production migrations
- **Supports**: Both SQLite and external databases
- **Security**: Non-root user execution
- **Volumes**: Persistent data storage

## Quick Start - Production Deployment

### For SQLite (Recommended for small-medium deployments)

```bash
# 1. Build the Docker image
docker build -t allegutta-prod .

# 2. Create data directory with proper permissions
mkdir -p /path/to/data
chmod 755 /path/to/data

# 3. Run container with persistent storage
docker run -d \
  --name allegutta-prod \
  -p 3000:3000 \
  -e "NUXT_DATABASE_URL=file:/app/data/production.db" \
  -e "NUXT_KINDE_CLIENT_ID=your-kinde-client-id" \
  -e "NUXT_KINDE_CLIENT_SECRET=your-kinde-client-secret" \
  -e "NUXT_KINDE_ISSUER_URL=https://your-domain.kinde.com" \
  -e "NUXT_KINDE_SITE_URL=https://your-domain.com" \
  -e "NUXT_KINDE_POST_LOGOUT_REDIRECT_URL=https://your-domain.com" \
  -e "NUXT_KINDE_POST_LOGIN_REDIRECT_URL=https://your-domain.com" \
  -v /path/to/data:/app/data \
  allegutta-prod
```

### For External Database (PostgreSQL/MySQL)

```bash
# Run with external database connection
docker run -d \
  --name allegutta-prod \
  -p 3000:3000 \
  -e "NUXT_DATABASE_URL=postgresql://user:password@host:5432/database" \
  -e "NUXT_KINDE_CLIENT_ID=your-kinde-client-id" \
  -e "NUXT_KINDE_CLIENT_SECRET=your-kinde-client-secret" \
  -e "NUXT_KINDE_ISSUER_URL=https://your-domain.kinde.com" \
  -e "NUXT_KINDE_SITE_URL=https://your-domain.com" \
  -e "NUXT_KINDE_POST_LOGOUT_REDIRECT_URL=https://your-domain.com" \
  -e "NUXT_KINDE_POST_LOGIN_REDIRECT_URL=https://your-domain.com" \
  allegutta-prod
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

## Migration History

- `20250902192932_add_amount_field`: Added amount field to transactions
- `20250903141014_add_market_data_fields`: Enhanced market data fields
- `20250903151501_create_market_data_table`: Created market data table
- `20250903185842_add_cash_balance_to_portfolio`: Added cash balance tracking

Each migration is automatically applied in the correct order during deployment.
