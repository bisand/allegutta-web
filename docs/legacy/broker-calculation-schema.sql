-- Enhanced Portfolio Schema for Broker-Specific Calculations
-- Add these fields to the portfolios table

ALTER TABLE portfolios ADD COLUMN brokerType VARCHAR(50) DEFAULT 'nordnet';
ALTER TABLE portfolios ADD COLUMN calculationMode VARCHAR(50) DEFAULT 'fifo_include_fees';
ALTER TABLE portfolios ADD COLUMN feeAllocationStrategy VARCHAR(50) DEFAULT 'all_to_buys';

-- Broker calculation modes:
-- 'nordnet' - Nordnet-specific calculations (include all fees)
-- 'degiro' - DeGiro-specific calculations  
-- 'dnb' - DNB Markets calculations
-- 'generic' - Generic FIFO calculations

-- Fee allocation strategies:
-- 'all_to_buys' - Add all fees to buy transaction cost basis (current behavior)
-- 'exclude_all' - Exclude all fees from cost basis calculations
-- 'proportional' - Allocate fees proportionally to transaction value
-- 'buys_only' - Only include fees from buy transactions
-- 'half_fees' - Include 50% of fees in cost basis

COMMENT ON COLUMN portfolios.brokerType IS 'Broker-specific calculation methodology';
COMMENT ON COLUMN portfolios.calculationMode IS 'FIFO calculation mode for this portfolio';
COMMENT ON COLUMN portfolios.feeAllocationStrategy IS 'How to handle fees in cost basis calculations';
