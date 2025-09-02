#!/usr/bin/env python3
"""
Analyze CASH_NOK Transaction Breakdown
Understand why cash-only calculation gives 2.4M instead of 167K
"""

import json
from datetime import datetime
from collections import defaultdict

def analyze_cash_breakdown():
    """Analyze the breakdown of CASH_NOK transactions"""
    
    with open('current_transactions.json', 'r') as f:
        transactions = json.load(f)
    
    print("=== CASH_NOK TRANSACTION BREAKDOWN ===")
    print(f"Analysis date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Categorize all CASH_NOK transactions
    by_type = defaultdict(list)
    
    for tx in transactions:
        if tx.get('symbol') == 'CASH_NOK':
            tx_type = tx.get('type')
            amount = tx.get('quantity', 0) * tx.get('price', 0)
            
            by_type[tx_type].append({
                'amount': amount,
                'date': tx.get('date'),
                'notes': tx.get('notes', '') or ''
            })
    
    print("=== TRANSACTION TYPES SUMMARY ===")
    total_by_type = {}
    
    for tx_type, txs in by_type.items():
        total_amount = sum(tx['amount'] for tx in txs)
        total_by_type[tx_type] = total_amount
        count = len(txs)
        avg_amount = total_amount / count if count > 0 else 0
        
        print(f"{tx_type:<15} {count:>4} transactions, Total: {total_amount:>12,.0f} NOK, Avg: {avg_amount:>8,.0f} NOK")
    
    print()
    print("=== NET CASH CALCULATION ===")
    
    # Calculate net cash considering transaction types
    net_cash = 0
    
    # Positive cash flow (increases cash)
    positive_types = ['DEPOSIT', 'DIVIDEND', 'REFUND', 'LIQUIDATION', 'REDEMPTION', 'EXCHANGE_IN']
    negative_types = ['WITHDRAWAL', 'EXCHANGE_OUT']
    
    positive_total = 0
    negative_total = 0
    
    for tx_type, amount in total_by_type.items():
        if tx_type in positive_types:
            positive_total += amount
            net_cash += amount
            print(f"+ {tx_type:<15} {amount:>12,.0f} NOK")
        elif tx_type in negative_types:
            negative_total += abs(amount)  # Make withdrawals positive for display
            net_cash -= abs(amount)  # But subtract from net
            print(f"- {tx_type:<15} {abs(amount):>12,.0f} NOK")
        else:
            print(f"? {tx_type:<15} {amount:>12,.0f} NOK (unknown type)")
    
    print(f"{'='*40}")
    print(f"Total Positive:         {positive_total:>12,.0f} NOK")
    print(f"Total Negative:         {negative_total:>12,.0f} NOK") 
    print(f"Net Cash (cash-only):   {net_cash:>12,.0f} NOK")
    print(f"Expected from Nordnet:     {167919:>12,.0f} NOK")
    print(f"Difference:             {net_cash - 167919:>12,.0f} NOK")
    
    print()
    print("=== LARGEST CASH TRANSACTIONS ===")
    
    # Show largest transactions to understand the discrepancy
    all_cash_txs = []
    for tx_type, txs in by_type.items():
        for tx in txs:
            all_cash_txs.append({
                'type': tx_type,
                'amount': tx['amount'],
                'date': tx['date'],
                'notes': tx['notes']
            })
    
    # Sort by amount (largest first)
    all_cash_txs.sort(key=lambda x: abs(x['amount']), reverse=True)
    
    print("Top 15 largest cash transactions:")
    for i, tx in enumerate(all_cash_txs[:15]):
        date_ts = tx['date']
        try:
            date_obj = datetime.fromtimestamp(date_ts / 1000)
            date_str = date_obj.strftime('%Y-%m-%d')
        except:
            date_str = str(date_ts)
        
        amount = tx['amount']
        tx_type = tx['type']
        notes = tx['notes'][:40] + '...' if len(tx['notes']) > 40 else tx['notes']
        
        print(f"{i+1:2d}. {date_str} {tx_type:<12} {amount:>12,.0f} NOK  {notes}")
    
    print()
    print("=== HYPOTHESIS ===")
    
    # Check if the difference could be explained by stock purchases
    with open('current_transactions.json', 'r') as f:
        transactions = json.load(f)
    
    stock_purchases = 0
    stock_sales = 0
    
    for tx in transactions:
        if not tx.get('symbol', '').startswith('CASH_') and tx.get('type') in ['BUY', 'SELL']:
            amount = tx.get('quantity', 0) * tx.get('price', 0) + tx.get('fees', 0)
            if tx.get('type') == 'BUY':
                stock_purchases += amount
            else:  # SELL
                stock_sales += amount
    
    net_stock_impact = stock_sales - stock_purchases  # Sales increase cash, purchases decrease
    theoretical_available_cash = net_cash + net_stock_impact
    
    print(f"Stock purchases total:      -{stock_purchases:>12,.0f} NOK")
    print(f"Stock sales total:          +{stock_sales:>12,.0f} NOK")
    print(f"Net stock impact:           {net_stock_impact:>12,.0f} NOK")
    print(f"Theoretical available cash:  {theoretical_available_cash:>12,.0f} NOK")
    
    if abs(theoretical_available_cash - 167919) < 10000:
        print("🎯 BINGO! Stock impact explains the difference!")
        print("Available cash = Cash transactions + Stock sales - Stock purchases")
    else:
        print("❌ Still doesn't match. Need deeper analysis.")

if __name__ == "__main__":
    analyze_cash_breakdown()
