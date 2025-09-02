#!/usr/bin/env python3
"""
Check for Double-Counting in Cash Transactions
Verify if stock BUY/SELL transactions have corresponding DEPOSIT/WITHDRAWAL entries
"""

import json
from datetime import datetime
from collections import defaultdict

def check_double_counting():
    """Check if stock transactions have corresponding cash transactions"""
    
    with open('current_transactions.json', 'r') as f:
        transactions = json.load(f)
    
    print("=== DOUBLE-COUNTING ANALYSIS ===")
    print(f"Analysis date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Group transactions by date to find matches
    by_date = defaultdict(list)
    
    for tx in transactions:
        date_ts = tx.get('date')
        by_date[date_ts].append(tx)
    
    print("=== CHECKING FOR STOCK + CASH TRANSACTION PAIRS ===")
    
    found_pairs = 0
    total_stock_transactions = 0
    
    # Look for dates with both stock and cash transactions
    for date_ts, day_transactions in list(by_date.items())[:20]:  # Check first 20 dates
        try:
            date_obj = datetime.fromtimestamp(date_ts / 1000)
            date_str = date_obj.strftime('%Y-%m-%d')
        except:
            continue
            
        # Separate stock and cash transactions for this date
        stock_txs = [tx for tx in day_transactions if not tx.get('symbol', '').startswith('CASH_')]
        cash_txs = [tx for tx in day_transactions if tx.get('symbol', '').startswith('CASH_')]
        
        if len(stock_txs) > 0:
            total_stock_transactions += len(stock_txs)
            
        if len(stock_txs) > 0 and len(cash_txs) > 0:
            print(f"\n📅 {date_str}:")
            
            for stock_tx in stock_txs:
                stock_amount = stock_tx.get('quantity', 0) * stock_tx.get('price', 0) + stock_tx.get('fees', 0)
                stock_type = stock_tx.get('type')
                stock_symbol = stock_tx.get('symbol')
                
                print(f"  📈 {stock_type} {stock_symbol}: {stock_amount:,.0f} NOK")
                
                # Look for matching cash transaction
                for cash_tx in cash_txs:
                    cash_amount = abs(cash_tx.get('quantity', 0) * cash_tx.get('price', 0))
                    cash_type = cash_tx.get('type')
                    
                    # Check if amounts are close (within 100 NOK for fees)
                    if abs(cash_amount - stock_amount) < 100:
                        expected_cash_type = 'WITHDRAWAL' if stock_type == 'BUY' else 'DEPOSIT'
                        if cash_type == expected_cash_type:
                            print(f"  💰 {cash_type} CASH_NOK: {cash_amount:,.0f} NOK ✅ MATCH!")
                            found_pairs += 1
                        else:
                            print(f"  💰 {cash_type} CASH_NOK: {cash_amount:,.0f} NOK ⚠️  Wrong type")
    
    print(f"\n=== SUMMARY ===")
    print(f"Stock transactions checked: {total_stock_transactions}")
    print(f"Stock+Cash pairs found: {found_pairs}")
    
    if found_pairs > 0:
        print("\n🚨 DOUBLE-COUNTING CONFIRMED!")
        print("Stock transactions have corresponding cash transactions.")
        print("We should ONLY count CASH_NOK transactions, not stock transactions!")
        
        print("\n✅ CORRECT APPROACH:")
        print("1. Sum all CASH_NOK DEPOSIT transactions")
        print("2. Subtract all CASH_NOK WITHDRAWAL transactions") 
        print("3. Do NOT adjust for stock BUY/SELL (already included in cash transactions)")
        
    else:
        print("\n✅ NO DOUBLE-COUNTING DETECTED")
        print("Stock transactions do NOT have automatic cash transactions.")
        print("We need to account for cash impact of stock trades manually.")

    # Let's also check if the original cash-only calculation matches the expected 167,919
    print(f"\n=== TESTING CASH-ONLY CALCULATION ===")
    
    cash_only_total = 0
    cash_transaction_count = 0
    
    for tx in transactions:
        if tx.get('symbol') == 'CASH_NOK':
            amount = tx.get('quantity', 0) * tx.get('price', 0)
            tx_type = tx.get('type')
            
            if tx_type in ['DEPOSIT', 'DIVIDEND', 'REFUND', 'LIQUIDATION', 'REDEMPTION']:
                cash_only_total += amount
            elif tx_type in ['WITHDRAWAL']:
                cash_only_total -= amount
                
            cash_transaction_count += 1
    
    print(f"Cash-only calculation: {cash_only_total:,.2f} NOK")
    print(f"Expected (from image): 167,919.00 NOK")
    print(f"Difference: {abs(cash_only_total - 167919):,.2f} NOK")
    print(f"Total CASH_NOK transactions: {cash_transaction_count}")
    
    if abs(cash_only_total - 167919) < 1000:
        print("🎯 PERFECT MATCH! Cash-only calculation is correct!")
    elif abs(cash_only_total - 167919) < 10000:
        print("🎯 VERY CLOSE! Cash-only calculation is mostly correct!")
    else:
        print("❌ No match. Need to investigate further.")

if __name__ == "__main__":
    check_double_counting()
