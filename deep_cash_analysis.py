#!/usr/bin/env python3
"""
Deep Cash Flow Analysis - Understanding the Cash Discrepancy
"""

import json
from datetime import datetime

def analyze_cash_discrepancy():
    """Deep dive into the cash discrepancy analysis"""
    
    # Load current data
    with open('current_transactions.json', 'r') as f:
        transactions = json.load(f)
    
    with open('current_holdings.json', 'r') as f:
        holdings = json.load(f)
    
    # Find current cash holding
    cash_holding = None
    for holding in holdings:
        if holding['symbol'] == 'CASH_NOK':
            cash_holding = holding
            break
    
    current_cash = cash_holding['quantity'] if cash_holding else 0
    expected_cash = 167919.00
    calculated_cash = 1421199.88  # From our analysis
    
    print("=== CASH FLOW RECONCILIATION ANALYSIS ===")
    print(f"Analysis date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    print("=== CASH POSITIONS ===")
    print(f"Current cash holding (database):  {current_cash:>15,.2f} NOK")
    print(f"Expected cash (target):           {expected_cash:>15,.2f} NOK") 
    print(f"Calculated cash (from txns):      {calculated_cash:>15,.2f} NOK")
    print()
    
    # Calculate differences
    db_vs_expected = current_cash - expected_cash
    calc_vs_expected = calculated_cash - expected_cash
    calc_vs_db = calculated_cash - current_cash
    
    print("=== DISCREPANCY ANALYSIS ===")
    print(f"Database vs Expected:             {db_vs_expected:>15,.2f} NOK ({abs(db_vs_expected/expected_cash)*100:.1f}%)")
    print(f"Calculated vs Expected:           {calc_vs_expected:>15,.2f} NOK ({abs(calc_vs_expected/expected_cash)*100:.1f}%)")
    print(f"Calculated vs Database:           {calc_vs_db:>15,.2f} NOK ({abs(calc_vs_db/current_cash)*100:.1f}%)")
    print()
    
    print("=== KEY INSIGHTS ===")
    if abs(db_vs_expected) < abs(calc_vs_expected):
        print("✅ DATABASE cash position is CLOSER to expected than calculated position")
        print("   This suggests the holdings calculation in the app is more accurate")
        print("   than our transaction-by-transaction reconstruction")
    else:
        print("✅ CALCULATED cash position is CLOSER to expected than database position")
        print("   This suggests our transaction analysis is more accurate")
    
    print()
    print("=== POSSIBLE EXPLANATIONS FOR DISCREPANCY ===")
    
    # Analyze potential causes
    major_discrepancy = abs(calc_vs_db)
    print(f"Major discrepancy to explain: {major_discrepancy:,.2f} NOK")
    print()
    
    # Look for large transactions that might explain the difference
    large_transactions = []
    for tx in transactions:
        amount = float(tx.get('quantity', 0)) * float(tx.get('price', 0))
        if amount > 10000:  # Transactions > 10K NOK
            large_transactions.append({
                'type': tx.get('type'),
                'symbol': tx.get('symbol'),
                'amount': amount,
                'date': tx.get('date'),
                'notes': tx.get('notes', '')
            })
    
    # Sort by amount
    large_transactions.sort(key=lambda x: x['amount'], reverse=True)
    
    print(f"Large transactions (>{10000:,} NOK) that could affect cash:")
    print()
    
    deposit_total = 0
    withdrawal_total = 0
    buy_total = 0
    sell_total = 0
    
    for i, tx in enumerate(large_transactions[:15]):  # Show top 15
        amount = tx['amount']
        tx_type = tx['type']
        symbol = tx['symbol']
        notes = tx['notes'] or ''
        notes = notes[:50] + '...' if len(notes) > 50 else notes
        
        if tx_type == 'DEPOSIT':
            deposit_total += amount
            impact = "+"
        elif tx_type == 'WITHDRAWAL':
            withdrawal_total += amount
            impact = "-"
        elif tx_type == 'BUY':
            buy_total += amount
            impact = "-"
        elif tx_type == 'SELL':
            sell_total += amount
            impact = "+"
        else:
            impact = "?"
            
        print(f"{i+1:2d}. {tx_type:12s} {impact}{amount:>12,.0f} NOK  {symbol:12s} {notes}")
    
    print()
    print("=== LARGE TRANSACTION SUMMARY ===")
    print(f"Large deposits:     +{deposit_total:>12,.0f} NOK")
    print(f"Large withdrawals:  -{withdrawal_total:>12,.0f} NOK") 
    print(f"Large purchases:    -{buy_total:>12,.0f} NOK")
    print(f"Large sales:        +{sell_total:>12,.0f} NOK")
    net_large = deposit_total - withdrawal_total - buy_total + sell_total
    print(f"Net from large txns: {net_large:>12,.0f} NOK")
    print()
    
    # Check if net large transactions explain the discrepancy
    if abs(net_large - major_discrepancy) < 50000:
        print("🎯 POSSIBLE EXPLANATION: Large transactions roughly match the discrepancy!")
    
    print("=== RECONCILIATION HYPOTHESES ===")
    print()
    print("1. **Holdings Calculation Accuracy**:")
    print("   - The app's holdings calculation might handle edge cases differently")
    print("   - Transaction fees might be applied differently")
    print("   - Some transactions might not affect cash (e.g., stock splits)")
    print()
    
    print("2. **Transaction Classification**:")
    print("   - Some DEPOSIT transactions might not actually be cash deposits")
    print("   - Exchange transactions might have different cash impacts")
    print("   - Corporate actions might be handled specially")
    print()
    
    print("3. **Timing and Settlement**:")
    print("   - Transaction dates vs settlement dates")
    print("   - Pending transactions at snapshot time")
    print("   - Weekend/holiday processing delays")
    print()
    
    print("4. **Tax and Fee Treatment**:")
    print("   - Withholding taxes on dividends not reflected in transactions")
    print("   - Brokerage fees not fully captured")
    print("   - Currency conversion fees")
    print()
    
    # Final assessment
    small_diff = abs(db_vs_expected)
    if small_diff < 10000:
        print(f"✅ EXCELLENT: Database cash ({current_cash:,.0f}) is very close to expected ({expected_cash:,.0f})")
        print(f"   Only {small_diff:,.0f} NOK difference ({small_diff/expected_cash*100:.1f}%)")
        print("   This suggests the portfolio is well-reconciled!")
    elif small_diff < 50000:
        print(f"✅ GOOD: Database cash is reasonably close to expected")
        print(f"   {small_diff:,.0f} NOK difference ({small_diff/expected_cash*100:.1f}%) - within acceptable range")
    else:
        print(f"⚠️ ATTENTION: Significant difference needs investigation")

if __name__ == "__main__":
    analyze_cash_discrepancy()
