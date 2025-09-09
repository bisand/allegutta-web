# AlleGutta Portfolio - AI Coding Agent Instructions

## Architecture Overview

This is a **Nuxt 4** portfolio management application with a unique **client/server separation**:

- **Client code**: `app/` directory (pages, components, stores, composables)
- **Server API**: `server/` directory (Nitro backend with Prisma ORM)
- **Database**: SQLite (dev) with Prisma migrations in `prisma/`

The app uses **dual authentication modes**:

- **Development**: Kinde OAuth integration using @nuxtjs/kinde module
- **Production**: Kinde OAuth integration using @nuxtjs/kinde module

## Key Technical Patterns

### 1. Database Schema & Business Logic

- **Transactions** drive everything - holdings are **calculated, not stored**
- **ISIN codes** are primary identifiers for securities (not symbols)
- **Multi-currency support** with NOK as default
- **Transaction types**: BUY/SELL/DIVIDEND/SPLIT/MERGER/DEPOSIT/WITHDRAWAL and more
- Use `server/lib/portfolioCalculations.ts` for holdings recalculation

### 2. State Management (Pinia)

- Central store: `app/stores/portfolio.ts`
- Reactive holdings/transactions with real-time calculations
- Always call `portfolioStore.fetchPortfolios()` after mutations

### 3. API Patterns

- **Public portfolios**: `/api/portfolios` (read-only for unauthenticated)
- **User portfolios**: `/api/portfolios/[id]/*` (requires auth)
- **Authentication**: Use `getRequiredAuth()` vs `getOptionalAuth()` in server handlers
- **Error handling**: Always wrap in try/catch with proper HTTP status codes

### 4. Component Architecture
- Keep pages clean. Extract as many components as you can.
- **Modal components**: Use `Portfolio/CreateModal.vue` pattern with reactive refs
- **Table components**: Responsive design with empty states (see `HoldingsTable.vue`)
- **Form validation**: Zod schemas with real-time validation feedback

## Essential Commands

```bash
# Database operations
npx prisma db push            # Apply schema changes
npx prisma generate           # Regenerate client after schema changes

# Development
Assume that the development server is alvays running in debug mode in the background
pnpm run build                # Production build
pnpm run docker:build         # Build Docker image

# Portfolio
curl -s -X POST http://localhost:3000/api/portfolios/{PORTFOLIO_ID}/recalculate-holdings | jq '.holdings[] | select(.symbol == "{SYMBOL}")' # Recalculate all holdings and display a symbol

# Market data
curl -X POST localhost:3000/api/market-data/update    # Manual price update
```

## Development Workflows

### Adding New Transaction Types

1. Update `TransactionType` enum in `prisma/schema.prisma`
2. Run `npx prisma db push && npx prisma generate`
3. Update calculation logic in `server/lib/portfolioCalculations.ts`
4. Add UI handling in `app/components/Portfolio/AddTransactionModal.vue`

### Authentication Context

- **Development**: `NUXT_DEV_AUTH=true` bypasses Kinde, auto-logs test user
- **Production**: Requires Kinde environment variables (`NUXT_KINDE_*`)
- **Middleware**: Use `auth.ts` (server+client) or `auth.client.ts` (client-only)

### Market Data Integration

- Background worker: `server/lib/marketDataWorkerV2.ts`
- Yahoo Finance integration for Norwegian stocks (`.OL` suffix)
- Rate limiting: 5 requests/minute for Alpha Vantage API
- Always update via ISIN, fallback to symbol for lookups

## Critical Files to Understand

- `server/lib/portfolioCalculations.ts` - Holdings calculation engine
- `app/stores/portfolio.ts` - Client state management (542 lines)
- `prisma/schema.prisma` - Complete data model
- `nuxt.config.ts` - Module configuration and runtime config

## Common Gotchas

- **Holdings are calculated**: Never insert directly, always recalculate from transactions
- **Nuxt 4 structure**: Client code must be in `app/`, server in `server/`
- **Market data**: Use ISIN as primary key, symbols can be ambiguous
- **Currency handling**: Every transaction/holding has currency field
- **Dev vs Prod auth**: Check `NUXT_DEV_AUTH` for authentication mode

## Integration Points

- **Kinde OAuth**: Social login with role/permission management
- **Yahoo Finance**: Real-time market data (rate limited)
- **Docker**: Production deployment with volume mounts for data
- **i18n**: Norwegian/English support with `no` as default locale

## Testing Guidelines

### When Testing APIs

1. Start development server in background: `pnpm dev &`
2. Use curl or testing scripts
3. Clean up test data and temporary files
4. Stop background server when done: `pkill -f "pnpm dev"`

### Cleanup After Testing

- Remove test files and scripts
- Clean up database test data
- Remove temporary environment variables
- Ensure no background processes are left running

When working on this codebase, always consider the transaction→holdings calculation pipeline and respect the client/server boundary defined by the `app/` and `server/` directories.
Remember: Keep solutions simple, clean up after testing, and use background mode (`pnpm dev &`) when running shell scripts or API tests.
