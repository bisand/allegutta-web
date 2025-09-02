#!/usr/bin/env python3
"""
Alternative Theory: Some CASH_NOK transactions are not "available for trading"
Check if certain types of deposits/dividends have settlement delays
"""

import json
from datetime import datetime, timedelta
from collections import defaultdict

def analyze_cash_availability():
    """Analyze which CASH_NOK transactions might not be immediately available"""
    
    with open('current_transactions.json', 'r') as f:
        transactions = json.load(f)
    
    print("=== CASH AVAILABILITY ANALYSIS ===")
    print(f"Analysis date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Separate cash transactions by type and recency
    cash_transactions = [tx for tx in transactions if tx.get('symbol') == 'CASH_NOK']
    
    # Calculate current timestamp (September 2, 2025)
    current_time = datetime(2025, 9, 2).timestamp() * 1000
    
    # Categorize by type and settlement period
    categories = {
        'immediately_available': [],
        'pending_settlement': [],
        'dividends_recent': [],
        'large_deposits': [],
        'withdrawals': []
    }
    
    total_by_category = {
        'immediately_available': 0,
        'pending_settlement': 0,
        'dividends_recent': 0,
        'large_deposits': 0,
        'withdrawals': 0
    }
    
    for tx in cash_transactions:
        amount = tx.get('quantity', 0) * tx.get('price', 0)
        tx_type = tx.get('type')
        tx_date = tx.get('date', 0)
        notes = tx.get('notes', '') or ''
        
        # Calculate days ago
        days_ago = (current_time - tx_date) / (1000 * 60 * 60 * 24)
        
        if tx_type == 'WITHDRAWAL':
            categories['withdrawals'].append(tx)
            total_by_category['withdrawals'] += amount
            
        elif 'UTBYTTE' in notes.upper() or tx_type == 'DIVIDEND':
            if days_ago < 5:  # Recent dividends might have settlement delay
                categories['dividends_recent'].append(tx)
                total_by_category['dividends_recent'] += amount
            else:
                categories['immediately_available'].append(tx)
                total_by_category['immediately_available'] += amount
                
        elif tx_type == 'DEPOSIT':
            if amount > 50000:  # Large deposits might have settlement delays
                categories['large_deposits'].append(tx)
                total_by_category['large_deposits'] += amount
            elif days_ago < 3:  # Recent deposits might not be settled
                categories['pending_settlement'].append(tx)
                total_by_category['pending_settlement'] += amount
            else:
                categories['immediately_available'].append(tx)
                total_by_category['immediately_available'] += amount
        else:
            categories['immediately_available'].append(tx)
            total_by_category['immediately_available'] += amount
    
    print("=== CASH CATEGORIZATION ===")
    for category, amount in total_by_category.items():
        count = len(categories[category])
        print(f"{category.replace('_', ' ').title():<20} {count:>4} txns {amount:>15,.0f} NOK")
    
    # Calculate available cash scenarios
    print(f"\n=== AVAILABLE CASH SCENARIOS ===")
    
    # Scenario 1: Only immediately available
    available_1 = total_by_category['immediately_available'] + total_by_category['withdrawals']
    print(f"Immediately available only:    {available_1:>15,.0f} NOK")
    
    # Scenario 2: Available + settled deposits  
    available_2 = available_1 + total_by_category['large_deposits']
    print(f"+ Large deposits (settled):    {available_2:>15,.0f} NOK")
    
    # Scenario 3: All except recent
    available_3 = available_2 + total_by_category['dividends_recent']
    print(f"+ Recent dividends:            {available_3:>15,.0f} NOK")
    
    # Scenario 4: Everything
    available_4 = available_3 + total_by_category['pending_settlement']
    print(f"+ All pending:                 {available_4:>15,.0f} NOK")
    
    print(f"\nExpected from Nordnet:         {167919:>15,.0f} NOK")
    
    # Check which scenario matches
    scenarios = [
        ("Immediately available", available_1),
        ("+ Large deposits", available_2), 
        ("+ Recent dividends", available_3),
        ("+ All pending", available_4)
    ]
    
    print(f"\n=== MATCHING ANALYSIS ===")
    for name, amount in scenarios:
        diff = abs(amount - 167919)
        match_pct = max(0, 100 - (diff / 167919 * 100))
        status = "🎯 MATCH!" if diff < 5000 else "❌ No match" if diff > 50000 else "🔍 Close"
        print(f"{name:<20} {amount:>12,.0f} NOK (diff: {diff:>8,.0f}) {status}")
    
    # Now subtract stock impact
    print(f"\n=== ACCOUNTING FOR STOCK TRANSACTIONS ===")
    
    # Calculate stock impact
    stock_purchases = 0
    stock_sales = 0
    
    for tx in transactions:
        if not tx.get('symbol', '').startswith('CASH_') and tx.get('type') in ['BUY', 'SELL']:
            amount = tx.get('quantity', 0) * tx.get('price', 0) + tx.get('fees', 0)
            if tx.get('type') == 'BUY':
                stock_purchases += amount
            else:
                stock_sales += amount
    
    net_stock_impact = stock_sales - stock_purchases
    
    print(f"Stock purchases:               -{stock_purchases:>15,.0f} NOK")
    print(f"Stock sales:                   +{stock_sales:>15,.0f} NOK")
    print(f"Net stock impact:              {net_stock_impact:>15,.0f} NOK")
    
    print(f"\n=== FINAL AVAILABLE CASH CALCULATION ===")
    for name, cash_amount in scenarios:
        final_available = cash_amount + net_stock_impact
        diff = abs(final_available - 167919)
        status = "🎯 PERFECT!" if diff < 1000 else "✅ Close" if diff < 5000 else "❌ No match"
        print(f"{name:<20} {final_available:>12,.0f} NOK (diff: {diff:>8,.0f}) {status}")

if __name__ == "__main__":
    analyze_cash_availability()
