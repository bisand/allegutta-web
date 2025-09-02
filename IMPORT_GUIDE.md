# Transaction Import Feature

## Overview

The transaction import feature allows you to bulk import transactions from Norwegian brokerage CSV exports directly into your portfolio. This eliminates the need to manually enter each transaction one by one.

## Supported File Formats

- **Norwegian Brokerage CSV Export**: Tab-separated values file with Norwegian headers
- **File Extensions**: `.csv`, `.txt`

## Supported Transaction Types

The import function automatically maps Norwegian transaction types to our internal system:

| Norwegian Type | Internal Type | Description |
|----------------|---------------|-------------|
| KJØPT | BUY | Stock purchase |
| SALG | SELL | Stock sale |
| UTBYTTE | DIVIDEND | Dividend payment |
| INNSKUDD | DEPOSIT | Cash deposit |
| UTTAK INTERNET | WITHDRAWAL | Cash withdrawal |
| TILBAKEBETALING | REFUND | Capital refund |
| INNL. VP LIKVID | LIQUIDATION | Security liquidation |
| INNLØSN. UTTAK VP | REDEMPTION | Security redemption |
| BYTTE INNLEGG VP | EXCHANGE_IN | Security exchange in |
| BYTTE UTTAK VP | EXCHANGE_OUT | Security exchange out |
| UTSKILLING FISJON IN | SPIN_OFF_IN | Spin-off transaction |
| SLETTING DESIM. LIKV | DECIMAL_LIQUIDATION | Decimal liquidation |
| SLETTING DESIM. UTTA | DECIMAL_WITHDRAWAL | Decimal withdrawal |

## Required CSV Columns

The CSV file must contain the following Norwegian column headers:

- `Bokføringsdag` - Transaction date
- `Transaksjonstype` - Transaction type
- `Verdipapir` - Security symbol
- `Antall` - Quantity
- `Kurs` - Price per share
- `Totale Avgifter` or `Kurtasje` - Transaction fees
- `Transaksjonstekst` - Transaction description

## How to Import Transactions

1. **Navigate to Portfolio**: Go to the portfolio page where you want to import transactions
2. **Click Import Button**: Click the "Import Transactions" button (upload icon)
3. **Select CSV File**: Choose your Norwegian brokerage export file
4. **Preview Data**: Review the parsed transactions in the preview table
5. **Import**: Click "Import Transactions" to proceed
6. **Review Results**: Check the import summary for successful imports, skipped items, and errors

## Import Behavior

- **Duplicate Detection**: The system checks for existing transactions and skips duplicates
- **Data Validation**: Invalid transactions are reported as errors
- **Holdings Update**: Portfolio holdings are automatically recalculated after import
- **Transaction Processing**: Only transactions with valid securities are processed
- **Cash Transactions**: Pure cash transactions (deposits/withdrawals) without securities are skipped

## Example CSV Structure

```
"Id"	"Bokføringsdag"	"Transaksjonstype"	"Verdipapir"	"Antall"	"Kurs"	...
2110569769	2025-05-27	"KJØPT"	"MOWI"	156	192.3	...
2107671137	2025-05-23	"SALG"	"ELO"	280	42.1	...
2208800073	2025-08-28	"UTBYTTE"	"EQNR"	152	3.774	...
```

## Error Handling

Common errors and their solutions:

- **Invalid Date Format**: Ensure dates are in YYYY-MM-DD format
- **Missing Required Fields**: Check that all required columns are present
- **Invalid Transaction Type**: Unsupported transaction types are skipped
- **Duplicate Transactions**: Already imported transactions are automatically skipped

## Notes

- The import preserves original transaction dates from your brokerage
- Transaction notes include the original Norwegian description
- Fees are automatically included in the transaction records
- The system handles Norwegian number formatting (decimal commas)
- Only transactions with securities (stocks) are imported for portfolio tracking

## Troubleshooting

If you encounter issues:

1. Verify your CSV file has the correct Norwegian headers
2. Check that the file is tab-separated (not comma-separated)
3. Ensure the file contains at least one valid transaction with a security
4. Review the error messages in the import result for specific issues

## Security

- File processing is done server-side for security
- Only authenticated users can import to their own portfolios
- No sensitive data is stored beyond the transaction records
- Files are processed in memory and not permanently stored
