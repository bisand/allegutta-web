#!/usr/bin/env python3
"""
Critical Cash Discrepancy Investigation
UI shows 2,403,726.60 NOK but database shows 1,257,338.60 NOK
Difference: 1,146,388 NOK
"""

import json
from datetime import datetime
from collections import defaultdict

def investigate_cash_discrepancy():
    """Investigate the massive cash discrepancy between UI and database"""
    
    # Load current data
    with open('current_transactions.json', 'r') as f:
        transactions = json.load(f)
    
    with open('current_holdings.json', 'r') as f:
        holdings = json.load(f)
    
    # Get current cash holding from database
    cash_holding = None
    for holding in holdings:
        if holding['symbol'] == 'CASH_NOK':
            cash_holding = holding
            break
    
    database_cash = cash_holding['quantity'] if cash_holding else 0
    ui_cash = 2403726.60  # From user's portfolio UI
    discrepancy = ui_cash - database_cash
    
    print("=== CRITICAL CASH DISCREPANCY INVESTIGATION ===")
    print(f"Analysis date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    print("=== CASH POSITIONS COMPARISON ===")
    print(f"UI Portfolio shows:        {ui_cash:>15,.2f} NOK")
    print(f"Database holdings show:    {database_cash:>15,.2f} NOK")
    print(f"DISCREPANCY:              {discrepancy:>15,.2f} NOK")
    print()
    
    if discrepancy > 1000000:
        print("🚨 CRITICAL: Over 1 million NOK discrepancy!")
    
    print("=== POTENTIAL CAUSES ===")
    
    # 1. Check if UI is calculating from transactions vs using holdings table
    print("1. Calculating cash from transaction history...")
    
    calculated_cash = 0
    cash_transactions = []
    
    for tx in transactions:
        if tx.get('symbol') == 'CASH_NOK':
            amount = float(tx.get('quantity', 0)) * float(tx.get('price', 0))
            tx_type = tx.get('type', '')
            
            # All cash affecting transactions
            if tx_type in ['DEPOSIT', 'WITHDRAWAL', 'DIVIDEND', 'EXCHANGE_IN', 'EXCHANGE_OUT']:
                if tx_type in ['DEPOSIT', 'DIVIDEND', 'EXCHANGE_IN']:
                    calculated_cash += amount
                else:  # WITHDRAWAL, EXCHANGE_OUT
                    calculated_cash -= amount
                    
                cash_transactions.append({
                    'type': tx_type,
                    'amount': amount,
                    'running_total': calculated_cash,
                    'date': tx.get('date'),
                    'notes': tx.get('notes', '') or ''
                })
    
    print(f"   Transaction-calculated cash: {calculated_cash:>12,.2f} NOK")
    
    # 2. Check if there are stock purchases/sales affecting cash
    print("2. Checking stock transactions affecting cash...")
    
    stock_cash_impact = 0
    stock_transactions = []
    
    for tx in transactions:
        if tx.get('symbol') != 'CASH_NOK' and tx.get('type') in ['BUY', 'SELL']:
            amount = float(tx.get('quantity', 0)) * float(tx.get('price', 0))
            tx_type = tx.get('type')
            
            if tx_type == 'BUY':
                stock_cash_impact -= amount  # Cash decreases
            else:  # SELL
                stock_cash_impact += amount  # Cash increases
                
            stock_transactions.append({
                'symbol': tx.get('symbol'),
                'type': tx_type,
                'amount': amount,
                'impact': -amount if tx_type == 'BUY' else amount,
                'date': tx.get('date')
            })
    
    print(f"   Stock transactions cash impact: {stock_cash_impact:>8,.2f} NOK")
    
    # 3. Calculate total theoretical cash
    total_theoretical_cash = calculated_cash + stock_cash_impact
    print(f"   Total theoretical cash: {total_theoretical_cash:>12,.2f} NOK")
    
    print()
    print("=== COMPARISON WITH UI ===")
    print(f"UI cash:                  {ui_cash:>15,.2f} NOK")
    print(f"Database cash:            {database_cash:>15,.2f} NOK")
    print(f"Transaction-calculated:   {total_theoretical_cash:>15,.2f} NOK")
    print()
    
    # Check which one matches the UI
    ui_vs_db = abs(ui_cash - database_cash)
    ui_vs_calc = abs(ui_cash - total_theoretical_cash)
    
    print("=== ANALYSIS RESULTS ===")
    print(f"UI vs Database difference:    {ui_vs_db:>12,.2f} NOK")
    print(f"UI vs Calculated difference:  {ui_vs_calc:>12,.2f} NOK")
    
    if ui_vs_calc < ui_vs_db:
        print("✅ UI appears to calculate from transactions (not holdings table)")
        print("🔍 The holdings table might be outdated or incorrectly calculated")
    else:
        print("⚠️  UI might be using holdings table but with different calculation")
    
    print()
    print("=== RECENT LARGE TRANSACTIONS ===")
    
    # Sort all transactions by date and show recent large ones
    all_cash_affecting = cash_transactions + [
        {
            'type': f"{tx['type']} {tx['symbol']}",
            'amount': tx['impact'],
            'running_total': None,
            'date': tx['date'],
            'notes': ''
        }
        for tx in stock_transactions if abs(tx['impact']) > 50000
    ]
    
    # Sort by date (most recent first)
    all_cash_affecting.sort(key=lambda x: x['date'], reverse=True)
    
    print("Recent large cash-affecting transactions:")
    for i, tx in enumerate(all_cash_affecting[:15]):
        date_ts = tx['date']
        try:
            date_obj = datetime.fromtimestamp(date_ts / 1000)
            date_str = date_obj.strftime('%Y-%m-%d')
        except:
            date_str = str(date_ts)
        
        amount = tx['amount']
        tx_type = tx['type']
        notes = tx['notes'][:30] + '...' if len(tx['notes']) > 30 else tx['notes']
        
        print(f"{i+1:2d}. {date_str} {tx_type:<12} {amount:>12,.0f} NOK  {notes}")
    
    print()
    print("=== HYPOTHESIS ===")
    
    if abs(total_theoretical_cash - ui_cash) < 10000:
        print("🎯 LIKELY CAUSE: UI calculates from transaction history")
        print("   The holdings table (database) is not being updated correctly")
        print("   when transactions are imported or added.")
        print()
        print("📋 SOLUTION: Check the holdings calculation logic in the import")
        print("   process and ensure it matches the transaction-based calculation.")
        
    elif abs(database_cash - ui_cash) < 10000:
        print("🎯 LIKELY CAUSE: Different calculation methods")
        print("   UI and our analysis use different transaction sets or logic")
        
    else:
        print("🔍 UNKNOWN CAUSE: Neither database nor calculated cash matches UI")
        print("   This requires deeper investigation of the UI calculation logic")
    
    print()
    print("=== RECOMMENDATIONS ===")
    print("1. 🔧 Check holdings recalculation in transaction import process")
    print("2. 🔍 Verify UI cash calculation logic vs holdings table")
    print("3. 🧪 Test with a fresh transaction import to see if holdings update")
    print("4. 📊 Compare holdings calculation between UI and backend")

if __name__ == "__main__":
    investigate_cash_discrepancy()
