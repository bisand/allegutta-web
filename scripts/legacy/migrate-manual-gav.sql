-- Add manual GAV fields to holdings table
-- This migration adds support for manual GAV overrides

ALTER TABLE holdings ADD COLUMN manualAvgPrice REAL;
ALTER TABLE holdings ADD COLUMN useManualAvgPrice BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE holdings ADD COLUMN manualAvgPriceReason TEXT;
ALTER TABLE holdings ADD COLUMN manualAvgPriceDate DATETIME;

-- Add comments for documentation
-- manualAvgPrice: Manual GAV override value
-- useManualAvgPrice: Flag to indicate if manual GAV should be used
-- manualAvgPriceReason: Justification for manual override
-- manualAvgPriceDate: Timestamp when manual GAV was set
