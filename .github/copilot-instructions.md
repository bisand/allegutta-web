# AlleGutta Portfolio Management - AI Coding Instructions

## Architecture Overview
This is a **Nuxt 4** portfolio management application with a unique directory structure where all client code lives in `app/` (via `srcDir: 'app/'` in `nuxt.config.ts`). The server API remains at the root level in `server/`.

### Key Structural Patterns
- **Client**: `app/` contains pages, components, stores, middleware (Vue/Nuxt)
- **Server**: `server/api/` contains Nitro API routes with Prisma ORM
- **Auth Flow**: Development uses auto-login test user, production uses Kinde OAuth
- **Data Flow**: Client → Pinia stores → Server API → Prisma → SQLite (dev) / PostgreSQL (prod)

## Critical Developer Workflows

### Database Operations
```bash
# After schema changes
npx prisma generate && npx prisma db push
pnpm run db:seed  # Seeds test user + sample portfolio data
```

### Development Server
```bash
pnpm run dev  # Auto-login as test@example.com in development
```

### Docker Deployment
```bash
pnpm run docker:build && pnpm run docker:run
pnpm run deploy:swarm  # For Docker Swarm production
```

## Project-Specific Conventions

### API Route Patterns
Server routes follow REST conventions with Prisma:
- `server/api/portfolios/[id]/transactions.post.ts` - Handles transaction creation with holdings recalculation
- Authentication via `requireAuth()` helper that switches between test user (dev) and JWT validation (prod)
- Always validate portfolio ownership before operations

### State Management Pattern
Pinia store (`app/stores/portfolio.ts`) manages:
- Portfolio CRUD operations
- Real-time holdings calculations from transactions
- Public/private portfolio distinction
- Optimistic updates with server sync

### Component Architecture
- Portfolio components in `app/components/Portfolio/` handle specific domains (transactions, holdings)
- Modal components use Nuxt UI patterns with form validation
- Tables implement responsive design with mobile-friendly layouts

### Authentication Context Switching
```typescript
// server/lib/auth.ts automatically detects environment
// Development: Auto-login test user (kindeId: 'test_user_1')
// Production: JWT validation with Kinde
const user = await requireAuth(event)
```

### Holdings Calculation Logic
Critical business logic in transaction POST endpoints:
1. Add transaction to database
2. Recalculate holdings for affected symbol
3. Update average cost basis using weighted average
4. Handle different transaction types (BUY/SELL/DIVIDEND/SPLIT/MERGER)

## Integration Points

### Database Schema Dependencies
- Users link to Kinde via `kindeId` field
- Portfolios cascade delete with user removal
- Holdings are calculated from transactions, not stored independently
- Transaction types enum affects holdings calculation logic

### External Services
- **Kinde**: OAuth authentication (configure `KINDE_*` env vars for production)
- **Future**: Stock price APIs (Alpha Vantage, Yahoo Finance) will integrate at holdings calculation level

### Environment Configuration
Development mode detection via `config.public.baseUrl?.includes('localhost')` enables:
- Auto-login bypass
- Test data access
- Different error handling strategies

## Key Files for Understanding Context
- `prisma/schema.prisma` - Core data relationships
- `server/api/portfolios/[id]/transactions.post.ts` - Holdings calculation business logic
- `app/stores/portfolio.ts` - Client state management patterns
- `server/lib/auth.ts` - Authentication context switching
- `scripts/seed.js` - Sample data structure and relationships
