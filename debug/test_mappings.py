#!/usr/bin/env python3
"""
Test the updated Norwegian transaction type mappings
"""

def test_transaction_mappings():
    """Test if all Norwegian transaction types are now mapped"""
    
    # Current mapping from our updated code
    type_map = {
        'KJØPT': 'BUY',
        'SALG': 'SELL',
        'UTBYTTE': 'DIVIDEND',
        'INNSKUDD': 'DEPOSIT',
        'UTTAK INTERNET': 'WITHDRAWAL',
        'TILBAKEBETALING': 'REFUND',
        'INNL. VP LIKVID': 'LIQUIDATION',
        'INNLØSN. UTTAK VP': 'REDEMPTION',
        'BYTTE INNLEGG VP': 'EXCHANGE_IN',
        'BYTTE UTTAK VP': 'EXCHANGE_OUT',
        'UTSKILLING FISJON IN': 'SPIN_OFF_IN',
        'SLETTING DESIM. LIKV': 'DECIMAL_LIQUIDATION',
        'SLETTING DESIM. UTTA': 'DECIMAL_WITHDRAWAL',
        'SPLITT UTTAK VP': 'LIQUIDATION',
        'SPLITT INNLEGG VP': 'SPIN_OFF_IN',
        
        # Newly added mappings
        'INNSKUDD KONTANTER': 'DEPOSIT',
        'TILDELING INNLEGG RE': 'RIGHTS_ALLOCATION',
        'INNLEGG OVERFØRING': 'TRANSFER_IN',
        'SLETTING UTTAK VP': 'LIQUIDATION',
        'UTBYTTE INNLEGG VP': 'DIVIDEND',
        'REINVESTERT UTBYTTE': 'DIVIDEND_REINVEST',
        'OVERBELÅNINGSRENTE': 'INTEREST_CHARGE',
        'EMISJON INNLEGG VP': 'RIGHTS_ISSUE',
        'DEBETRENTE': 'INTEREST_CHARGE'
    }
    
    # Transaction counts from CSV analysis
    csv_types = {
        'UTBYTTE': 295,
        'KJØPT': 143,
        'SALG': 114,
        'INNSKUDD': 56,
        'UTTAK INTERNET': 20,
        'INNSKUDD KONTANTER': 15,
        'TILDELING INNLEGG RE': 12,
        'TILBAKEBETALING': 10,
        'INNLEGG OVERFØRING': 8,
        'INNLØSN. UTTAK VP': 7,
        'SLETTING UTTAK VP': 6,
        'BYTTE UTTAK VP': 6,
        'BYTTE INNLEGG VP': 6,
        'SPLITT UTTAK VP': 5,
        'SPLITT INNLEGG VP': 5,
        'SLETTING DESIM. UTTA': 3,
        'UTBYTTE INNLEGG VP': 2,
        'SLETTING DESIM. LIKV': 2,
        'REINVESTERT UTBYTTE': 2,
        'OVERBELÅNINGSRENTE': 2,
        'INNL. VP LIKVID': 2,
        'EMISJON INNLEGG VP': 2,
        'DEBETRENTE': 2,
        'UTSKILLING FISJON IN': 1
    }
    
    total_transactions = sum(csv_types.values())
    mapped_transactions = 0
    unmapped_transactions = 0
    
    print("=== TRANSACTION TYPE MAPPING ANALYSIS ===")
    print(f"Total transactions in CSV: {total_transactions}")
    print()
    
    print("=== MAPPED TYPES ===")
    for nor_type, count in sorted(csv_types.items(), key=lambda x: x[1], reverse=True):
        if nor_type in type_map:
            eng_type = type_map[nor_type]
            mapped_transactions += count
            print(f"✅ {nor_type:25} → {eng_type:20} ({count:3} transactions)")
        else:
            unmapped_transactions += count
            print(f"❌ {nor_type:25} → UNMAPPED           ({count:3} transactions)")
    
    print()
    print("=== SUMMARY ===")
    print(f"Mapped transactions:   {mapped_transactions:3} / {total_transactions} ({mapped_transactions/total_transactions*100:.1f}%)")
    print(f"Unmapped transactions: {unmapped_transactions:3} / {total_transactions} ({unmapped_transactions/total_transactions*100:.1f}%)")
    
    if unmapped_transactions == 0:
        print("\n🎉 ALL TRANSACTION TYPES ARE NOW MAPPED!")
    else:
        print(f"\n⚠️  Still missing {unmapped_transactions} transactions")
    
    # Show transaction type categories
    print("\n=== TRANSACTION CATEGORIES ===")
    
    cash_positive = ['DEPOSIT', 'DIVIDEND', 'DIVIDEND_REINVEST', 'REFUND', 'LIQUIDATION', 'REDEMPTION', 'TRANSFER_IN', 'RIGHTS_ISSUE']
    cash_negative = ['WITHDRAWAL', 'INTEREST_CHARGE']
    stock_positive = ['BUY', 'RIGHTS_ALLOCATION', 'SPIN_OFF_IN']
    stock_negative = ['SELL']
    corporate_actions = ['LIQUIDATION', 'REDEMPTION', 'EXCHANGE_IN', 'EXCHANGE_OUT', 'SPIN_OFF_IN']
    
    cash_pos_count = sum(count for nor_type, count in csv_types.items() if nor_type in type_map and type_map[nor_type] in cash_positive)
    cash_neg_count = sum(count for nor_type, count in csv_types.items() if nor_type in type_map and type_map[nor_type] in cash_negative)
    stock_pos_count = sum(count for nor_type, count in csv_types.items() if nor_type in type_map and type_map[nor_type] in stock_positive)
    stock_neg_count = sum(count for nor_type, count in csv_types.items() if nor_type in type_map and type_map[nor_type] in stock_negative)
    
    print(f"💰 Cash increasing: {cash_pos_count} transactions")
    print(f"💸 Cash decreasing: {cash_neg_count} transactions") 
    print(f"📈 Stock increasing: {stock_pos_count} transactions")
    print(f"📉 Stock decreasing: {stock_neg_count} transactions")

if __name__ == "__main__":
    test_transaction_mappings()
