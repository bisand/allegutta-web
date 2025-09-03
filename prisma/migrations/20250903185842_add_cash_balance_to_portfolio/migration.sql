-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_holdings" (
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
INSERT INTO "new_holdings" ("avgPrice", "createdAt", "currency", "id", "isin", "portfolioId", "quantity", "symbol", "updatedAt") SELECT "avgPrice", "createdAt", "currency", "id", "isin", "portfolioId", "quantity", "symbol", "updatedAt" FROM "holdings";
DROP TABLE "holdings";
ALTER TABLE "new_holdings" RENAME TO "holdings";
CREATE UNIQUE INDEX "holdings_portfolioId_symbol_key" ON "holdings"("portfolioId", "symbol");
CREATE TABLE "new_portfolios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'NOK',
    "cashBalance" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "portfolios_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_portfolios" ("createdAt", "currency", "description", "id", "isDefault", "name", "updatedAt", "userId") SELECT "createdAt", "currency", "description", "id", "isDefault", "name", "updatedAt", "userId" FROM "portfolios";
DROP TABLE "portfolios";
ALTER TABLE "new_portfolios" RENAME TO "portfolios";
CREATE TABLE "new_transactions" (
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
INSERT INTO "new_transactions" ("amount", "createdAt", "currency", "date", "fees", "id", "isin", "notes", "portfolioId", "price", "quantity", "saldo", "symbol", "type", "updatedAt") SELECT "amount", "createdAt", "currency", "date", "fees", "id", "isin", "notes", "portfolioId", "price", "quantity", "saldo", "symbol", "type", "updatedAt" FROM "transactions";
DROP TABLE "transactions";
ALTER TABLE "new_transactions" RENAME TO "transactions";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
