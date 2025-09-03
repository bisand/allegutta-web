/*
  Warnings:

  - You are about to drop the column `currentPrice` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `exchange` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `exchangeTimezoneName` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `exchangeTimezoneShortName` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `fiftyTwoWeekHigh` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `fiftyTwoWeekHighChange` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `fiftyTwoWeekHighChangePercent` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `fiftyTwoWeekLow` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `fiftyTwoWeekLowChange` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `fiftyTwoWeekLowChangePercent` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `fiftyTwoWeekRange` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `firstTradeDateMilliseconds` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `fullExchangeName` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `lastUpdated` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `longName` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `marketState` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `quoteType` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `regularMarketChange` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `regularMarketChangePercent` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `regularMarketDayHigh` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `regularMarketDayLow` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `regularMarketDayRange` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `regularMarketPreviousClose` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `regularMarketTime` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `regularMarketVolume` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `shortName` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `symbolYahoo` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `typeDisp` on the `holdings` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "market_data" (
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
    CONSTRAINT "holdings_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "holdings_isin_fkey" FOREIGN KEY ("isin") REFERENCES "market_data" ("isin") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_holdings" ("avgPrice", "createdAt", "currency", "id", "isin", "portfolioId", "quantity", "symbol", "updatedAt") SELECT "avgPrice", "createdAt", "currency", "id", "isin", "portfolioId", "quantity", "symbol", "updatedAt" FROM "holdings";
DROP TABLE "holdings";
ALTER TABLE "new_holdings" RENAME TO "holdings";
CREATE UNIQUE INDEX "holdings_portfolioId_symbol_key" ON "holdings"("portfolioId", "symbol");
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
    CONSTRAINT "transactions_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transactions_isin_fkey" FOREIGN KEY ("isin") REFERENCES "market_data" ("isin") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_transactions" ("amount", "createdAt", "currency", "date", "fees", "id", "isin", "notes", "portfolioId", "price", "quantity", "saldo", "symbol", "type", "updatedAt") SELECT "amount", "createdAt", "currency", "date", "fees", "id", "isin", "notes", "portfolioId", "price", "quantity", "saldo", "symbol", "type", "updatedAt" FROM "transactions";
DROP TABLE "transactions";
ALTER TABLE "new_transactions" RENAME TO "transactions";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
