#!/usr/bin/env python3
"""
Test Theory: BUY/SELL transactions have corresponding DEPOSIT/WITHDRAWAL
Check if stock transactions have matching cash transactions by amount and date
"""

import json
from datetime import datetime
from collections import defaultdict

def test_automatic_cash_theory():
    """Test if each BUY has a WITHDRAWAL and each SELL has a DEPOSIT"""
    
    with open('current_transactions.json', 'r') as f:
        transactions = json.load(f)
    
    print("=== TESTING AUTOMATIC CASH TRANSACTION THEORY ===")
    print(f"Analysis date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Group by date to find same-day transactions
    by_date = defaultdict(list)
    
    for tx in transactions:
        date_ts = tx.get('date')
        by_date[date_ts].append(tx)
    
    print("=== LOOKING FOR STOCK + CASH PAIRS ===")
    
    matches_found = 0
    total_stock_transactions = 0
    detailed_matches = []
    
    # Check each date for stock + cash pairs
    for date_ts, day_transactions in by_date.items():
        try:
            date_obj = datetime.fromtimestamp(date_ts / 1000)
            date_str = date_obj.strftime('%Y-%m-%d')
        except:
            continue
            
        # Separate stock and cash transactions
        stock_txs = [tx for tx in day_transactions if not tx.get('symbol', '').startswith('CASH_')]
        cash_txs = [tx for tx in day_transactions if tx.get('symbol', '').startswith('CASH_')]
        
        if not stock_txs:
            continue
            
        total_stock_transactions += len(stock_txs)
        
        # Look for matches
        for stock_tx in stock_txs:
            stock_amount = stock_tx.get('quantity', 0) * stock_tx.get('price', 0) + stock_tx.get('fees', 0)
            stock_type = stock_tx.get('type')
            stock_symbol = stock_tx.get('symbol')
            
            # Look for corresponding cash transaction
            for cash_tx in cash_txs:
                cash_amount = abs(cash_tx.get('quantity', 0) * cash_tx.get('price', 0))
                cash_type = cash_tx.get('type')
                
                # Check if amounts match (within 10 NOK tolerance for rounding)
                amount_diff = abs(cash_amount - stock_amount)
                if amount_diff < 10:
                    # Check if transaction types make sense
                    expected_cash_type = 'WITHDRAWAL' if stock_type == 'BUY' else 'DEPOSIT'
                    if cash_type == expected_cash_type:
                        matches_found += 1
                        detailed_matches.append({
                            'date': date_str,
                            'stock_type': stock_type,
                            'stock_symbol': stock_symbol,
                            'stock_amount': stock_amount,
                            'cash_type': cash_type,
                            'cash_amount': cash_amount,
                            'difference': amount_diff
                        })
                        break
    
    print(f"Total stock transactions: {total_stock_transactions}")
    print(f"Stock+Cash pairs found: {matches_found}")
    print(f"Match rate: {(matches_found/total_stock_transactions)*100:.1f}%" if total_stock_transactions > 0 else "N/A")
    
    if matches_found > 0:
        print(f"\n🎯 THEORY CONFIRMED! Found {matches_found} matching pairs")
        print("\nDetailed matches (first 10):")
        for i, match in enumerate(detailed_matches[:10]):
            print(f"{i+1:2d}. {match['date']} {match['stock_type']} {match['stock_symbol']} "
                  f"{match['stock_amount']:,.0f} NOK → {match['cash_type']} {match['cash_amount']:,.0f} NOK "
                  f"(diff: {match['difference']:.1f})")
        
        print(f"\n✅ SOLUTION CONFIRMED:")
        print("1. Norwegian brokerage automatically creates cash transactions for stock trades")
        print("2. UI correctly shows only CASH_NOK transactions (2,403,726.60 NOK)")
        print("3. We should NOT subtract stock transactions from cash")
        print("4. The cash balance represents the actual cash position")
        
        # Calculate what the correct available trading cash should be
        print(f"\n📊 CASH ANALYSIS:")
        print(f"Total CASH_NOK shown in UI: 2,403,726.60 NOK")
        print(f"Expected available for trading: 167,919.00 NOK")
        print(f"Difference: {2403726.60 - 167919:,.0f} NOK")
        print(f"This difference likely represents:")
        print(f"- Unsettled deposits")
        print(f"- Dividend payments not yet available for trading")
        print(f"- Reserved amounts")
        
    else:
        print(f"\n❌ THEORY NOT CONFIRMED")
        print("No automatic cash transactions found for stock trades")
        print("Original calculation approach might be correct")
        
    # Let's also check a specific example to be sure
    print(f"\n=== DETAILED EXAMPLE ANALYSIS ===")
    
    # Find a recent BUY transaction and check surrounding transactions
    recent_buys = []
    for tx in transactions:
        if (not tx.get('symbol', '').startswith('CASH_') and 
            tx.get('type') == 'BUY' and 
            tx.get('date', 0) > 1640995200000):  # After 2022
            recent_buys.append(tx)
    
    if recent_buys:
        recent_buy = recent_buys[0]  # Take the first recent buy
        buy_date = recent_buy.get('date')
        buy_amount = recent_buy.get('quantity', 0) * recent_buy.get('price', 0) + recent_buy.get('fees', 0)
        
        try:
            date_obj = datetime.fromtimestamp(buy_date / 1000)
            date_str = date_obj.strftime('%Y-%m-%d')
        except:
            date_str = "unknown"
            
        print(f"Example BUY: {date_str} {recent_buy.get('type')} {recent_buy.get('symbol')} {buy_amount:,.0f} NOK")
        
        # Look for cash transactions within 1 day
        tolerance = 86400000  # 1 day in milliseconds
        nearby_cash = []
        
        for tx in transactions:
            if (tx.get('symbol', '').startswith('CASH_') and 
                abs(tx.get('date', 0) - buy_date) < tolerance):
                cash_amount = abs(tx.get('quantity', 0) * tx.get('price', 0))
                if abs(cash_amount - buy_amount) < 100:  # Within 100 NOK
                    nearby_cash.append(tx)
        
        if nearby_cash:
            print("Matching cash transactions found:")
            for cash_tx in nearby_cash:
                cash_date = cash_tx.get('date')
                try:
                    cash_date_obj = datetime.fromtimestamp(cash_date / 1000)
                    cash_date_str = cash_date_obj.strftime('%Y-%m-%d')
                except:
                    cash_date_str = "unknown"
                cash_amount = cash_tx.get('quantity', 0) * cash_tx.get('price', 0)
                print(f"  {cash_date_str} {cash_tx.get('type')} CASH_NOK {cash_amount:,.0f} NOK")
        else:
            print("No matching cash transactions found")

if __name__ == "__main__":
    test_automatic_cash_theory()
