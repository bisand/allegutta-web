CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                    TEXT PRIMARY KEY NOT NULL,
    "checksum"              TEXT NOT NULL,
    "finished_at"           DATETIME,
    "migration_name"        TEXT NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        DATETIME,
    "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
    "applied_steps_count"   INTEGER UNSIGNED NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kindeId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "picture" TEXT,
    "roles" TEXT NOT NULL DEFAULT '[]',
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "users_kindeId_key" ON "users"("kindeId");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE TABLE IF NOT EXISTS "market_data" (
    "isin" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "symbolYahoo" TEXT,
    "longName" TEXT,
    "shortName" TEXT,
    "currency" TEXT,
    "currentPrice" REAL,
    "regularMarketChange" REAL,
    "regularMarketChangePercent" REAL,
    "regularMarketPreviousClose" REAL,
    "regularMarketDayHigh" REAL,
    "regularMarketDayLow" REAL,
    "regularMarketDayRange" TEXT,
    "regularMarketVolume" REAL,
    "regularMarketTime" DATETIME,
    "fiftyTwoWeekLow" REAL,
    "fiftyTwoWeekHigh" REAL,
    "fiftyTwoWeekLowChange" REAL,
    "fiftyTwoWeekHighChange" REAL,
    "fiftyTwoWeekLowChangePercent" REAL,
    "fiftyTwoWeekHighChangePercent" REAL,
    "fiftyTwoWeekRange" TEXT,
    "exchange" TEXT,
    "exchangeTimezoneName" TEXT,
    "exchangeTimezoneShortName" TEXT,
    "fullExchangeName" TEXT,
    "marketState" TEXT,
    "quoteType" TEXT,
    "typeDisp" TEXT,
    "firstTradeDateMilliseconds" REAL,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "holdings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "isin" TEXT,
    "quantity" REAL NOT NULL,
    "avgPrice" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NOK',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "holdings_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "holdings_portfolioId_symbol_key" ON "holdings"("portfolioId", "symbol");
CREATE TABLE IF NOT EXISTS "portfolios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'NOK',
    "cashBalance" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL, "athDate" DATETIME, "athValue" REAL,
    CONSTRAINT "portfolios_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "isin" TEXT,
    "type" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "price" REAL NOT NULL,
    "fees" REAL NOT NULL DEFAULT 0,
    "amount" REAL,
    "currency" TEXT NOT NULL DEFAULT 'NOK',
    "date" DATETIME NOT NULL,
    "saldo" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "transactions_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "ath_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "athValue" REAL NOT NULL,
    "athDate" DATETIME NOT NULL,
    "surpassedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "newAthValue" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ath_history_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
