#!/usr/bin/env python3
"""
Corporate Actions Analysis
Check for SPLITT UTTAK VP / SPLITT INNLEGG VP transactions and lingering .OLD holdings
"""

import json
from datetime import datetime
from collections import defaultdict

def analyze_corporate_actions():
    """Analyze corporate action transactions and their impact on holdings"""
    
    with open('current_transactions.json', 'r') as f:
        tx_response = json.load(f)
        transactions = tx_response.get('data', [])
    
    with open('current_holdings.json', 'r') as f:
        holdings_response = json.load(f)
        holdings = holdings_response.get('data', [])
    
    print("=== CORPORATE ACTIONS ANALYSIS ===")
    print(f"Analysis date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Find all corporate action transactions
    corporate_actions = []
    corporate_keywords = ['SPLITT', 'UTTAK', 'INNLEGG', 'KAPITAL', 'TILBAKE', 'REFUND']
    
    for tx in transactions:
        notes = tx.get('notes', '') or ''
        tx_type = tx.get('type', '') or ''
        symbol = tx.get('symbol', '') or ''
        
        # Check for corporate action keywords
        for keyword in corporate_keywords:
            if (keyword in notes.upper() or 
                keyword in tx_type.upper() or 
                '.OLD' in symbol.upper()):
                corporate_actions.append(tx)
                break
    
    print(f"=== CORPORATE ACTION TRANSACTIONS ===")
    print(f"Found {len(corporate_actions)} corporate action transactions")
    
    # Group by symbol to find pairs
    by_symbol_base = defaultdict(list)
    
    for tx in corporate_actions:
        symbol = tx.get('symbol', '')
        # Remove .OLD suffix to group with base symbol
        base_symbol = symbol.replace('.OLD', '').replace(' OLD', '')
        by_symbol_base[base_symbol].append(tx)
    
    print(f"\n=== CORPORATE ACTION PAIRS ===")
    
    problematic_symbols = []
    
    for base_symbol, txs in by_symbol_base.items():
        if len(txs) >= 2:  # At least 2 transactions (in/out pair)
            print(f"\n📊 {base_symbol}:")
            
            uttak_txs = []
            innlegg_txs = []
            
            for tx in sorted(txs, key=lambda x: x.get('date', 0)):
                date_ts = tx.get('date', 0)
                try:
                    date_obj = datetime.fromtimestamp(date_ts / 1000)
                    date_str = date_obj.strftime('%Y-%m-%d')
                except:
                    date_str = "unknown"
                
                symbol = tx.get('symbol', '')
                quantity = tx.get('quantity', 0)
                notes = tx.get('notes', '') or ''
                
                if 'UTTAK' in notes.upper():
                    uttak_txs.append(tx)
                    print(f"  📤 {date_str} {symbol} UTTAK {quantity:,.0f} shares")
                elif 'INNLEGG' in notes.upper():
                    innlegg_txs.append(tx)
                    print(f"  📥 {date_str} {symbol} INNLEGG {quantity:,.0f} shares")
                else:
                    print(f"  ❓ {date_str} {symbol} {notes[:40]}...")
            
            # Check if we have corresponding holdings
            old_holdings = [h for h in holdings if h.get('symbol', '').replace('.OLD', '').replace(' OLD', '') == base_symbol and ('.OLD' in h.get('symbol', '') or ' OLD' in h.get('symbol', ''))]
            new_holdings = [h for h in holdings if h.get('symbol', '') == base_symbol]
            
            if old_holdings and uttak_txs:
                print(f"  ⚠️  OLD HOLDINGS STILL EXIST:")
                for holding in old_holdings:
                    print(f"      {holding.get('symbol')}: {holding.get('quantity', 0):,.2f} shares")
                problematic_symbols.append(base_symbol)
            
            if new_holdings:
                print(f"  ✅ NEW HOLDINGS:")
                for holding in new_holdings:
                    print(f"      {holding.get('symbol')}: {holding.get('quantity', 0):,.2f} shares")
    
    print(f"\n=== HOLDINGS ANALYSIS ===")
    
    # Find all .OLD holdings
    old_holdings = [h for h in holdings if '.OLD' in h.get('symbol', '') or ' OLD' in h.get('symbol', '')]
    
    print(f"Holdings with .OLD suffix: {len(old_holdings)}")
    
    for holding in old_holdings:
        symbol = holding.get('symbol', '')
        quantity = holding.get('quantity', 0)
        
        # Check if there was a corresponding UTTAK transaction
        base_symbol = symbol.replace('.OLD', '').replace(' OLD', '')
        
        # Find UTTAK transactions for this symbol
        uttak_found = False
        for tx in transactions:
            if (tx.get('symbol', '') == symbol and 
                'UTTAK' in (tx.get('notes', '') or '').upper()):
                uttak_found = True
                break
        
        status = "❌ Should be ZERO" if uttak_found else "❓ Unclear"
        print(f"  {symbol}: {quantity:,.2f} shares {status}")
    
    print(f"\n=== RECOMMENDATIONS ===")
    
    if problematic_symbols:
        print(f"🚨 Found {len(problematic_symbols)} symbols with potential corporate action issues:")
        for symbol in problematic_symbols:
            print(f"  - {symbol}: Has .OLD holdings that should likely be zero")
        
        print(f"\n🔧 POTENTIAL FIXES:")
        print(f"1. Review holdings calculation for corporate action transaction types")
        print(f"2. Ensure SPLITT UTTAK VP transactions properly zero out old holdings")
        print(f"3. Consider adding corporate action handling logic")
        print(f"4. Verify ISIN changes are properly handled during corporate actions")
        
        # Check if this could affect cash calculation
        total_old_value = 0
        for symbol in problematic_symbols:
            for holding in holdings:
                if (holding.get('symbol', '') == f"{symbol}.OLD" or 
                    holding.get('symbol', '') == f"{symbol} OLD"):
                    # Estimate value (assuming price = avgPrice)
                    qty = holding.get('quantity', 0)
                    price = holding.get('avgPrice', 0)
                    value = qty * price
                    total_old_value += value
        
        if total_old_value > 1000:
            print(f"\n💰 POTENTIAL CASH IMPACT:")
            print(f"Total value in .OLD holdings: {total_old_value:,.0f} NOK")
            print(f"If these holdings are phantom positions, they could affect:")
            print(f"- Portfolio total value calculation")
            print(f"- Performance metrics")
            print(f"- Cash balance if holdings were incorrectly liquidated")
    
    else:
        print(f"✅ No obvious corporate action issues found")
    
    # Specific check for HUNT example
    print(f"\n=== HUNT EXAMPLE ANALYSIS ===")
    hunt_transactions = [tx for tx in transactions if 'HUNT' in tx.get('symbol', '').upper()]
    hunt_holdings = [h for h in holdings if 'HUNT' in h.get('symbol', '').upper()]
    
    print(f"HUNT-related transactions: {len(hunt_transactions)}")
    print(f"HUNT-related holdings: {len(hunt_holdings)}")
    
    for holding in hunt_holdings:
        symbol = holding.get('symbol', '')
        quantity = holding.get('quantity', 0)
        print(f"  {symbol}: {quantity:,.2f} shares")
    
    # Check last HUNT transactions
    hunt_transactions.sort(key=lambda x: x.get('date', 0), reverse=True)
    print(f"\nLast 5 HUNT transactions:")
    for i, tx in enumerate(hunt_transactions[:5]):
        date_ts = tx.get('date', 0)
        try:
            date_obj = datetime.fromtimestamp(date_ts / 1000)
            date_str = date_obj.strftime('%Y-%m-%d')
        except:
            date_str = "unknown"
        
        symbol = tx.get('symbol', '')
        tx_type = tx.get('type', '')
        quantity = tx.get('quantity', 0)
        notes = tx.get('notes', '') or ''
        
        print(f"  {i+1}. {date_str} {symbol} {tx_type} {quantity:,.0f} - {notes[:50]}...")

if __name__ == "__main__":
    analyze_corporate_actions()
