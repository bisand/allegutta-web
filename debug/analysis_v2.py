#!/usr/bin/env python3
"""
Enhanced Portfolio Reconciliation Analysis with ISIN Support
This script analyzes transaction data discrepancies and provides detailed reconciliation
"""

import json
import csv
from datetime import datetime
from collections import defaultdict

def get_symbol_mapping():
    """Map transaction symbols to portfolio position names"""
    return {
        'EQNR': 'EQUINOR',
        'TEL': 'TELENOR', 
        'AKRBP': 'AKER BP',
        'LSG': 'LERØY SEAFOOD GROUP',
        'RANA': 'RANA GRUBER ASA',
        'KOA': 'KONGSBERG AUTOMOTIVE',
        'AKBM': 'AKER BIOMARINE ASA',
        'WAWI': 'WALLENIUS WILHELMSEN',
        'EPR': 'EUROPRIS',
        'ELO': 'ELOPAK ASA',
        'ACR': 'AXACTOR ASA',
        'OLT': 'OLAV THON EIENDOMSSELSKAP',
        'DNBH': 'DNB BANK ASA',
        'MOWI': 'MOWI',
        'AFK': 'ARENDALS FOSSEKOMPANI',
        'SNI': 'STOLT-NIELSEN',
        'FRO': 'FRONTLINE PLC',
        'YAR': 'YARA INTERNATIONAL',
        'ELK': 'ELKEM',
        'TOM': 'TOMRA SYSTEMS',
        'TGS': 'TGS ASA',
        'NHY': 'NORSK HYDRO',
        'SALM': 'SALMAR',
        'SWONz': 'SOFTWAREONE HOLDING',
        'SCATC': 'SCATEC ASA',
    }

def analyze_cash_discrepancy(transactions):
    """Detailed analysis of cash flow to identify discrepancy sources"""
    print("\n=== DETAILED CASH FLOW ANALYSIS ===")
    
    cash_flows = []
    running_balance = 0.0
    
    # Group transactions by type for analysis
    by_type = defaultdict(list)
    
    for tx in transactions:
        tx_type = tx.get('type', 'Unknown')
        by_type[tx_type].append(tx)
        
        # Calculate cash impact using database schema fields
        quantity = float(tx.get('quantity', 0))
        price = float(tx.get('price', 0))
        fees = float(tx.get('fees', 0))
        amount = quantity * price
        date = tx.get('date', '')
        symbol = tx.get('symbol', '')
        
        # Calculate cash impact based on transaction type
        cash_impact = 0
        if tx_type == 'BUY':
            cash_impact = -(amount + fees)  # Buy reduces cash, include fees
        elif tx_type == 'SELL':
            cash_impact = amount - fees     # Sell increases cash, minus fees
        elif tx_type in ['DEPOSIT', 'REFUND', 'LIQUIDATION', 'REDEMPTION']:
            cash_impact = amount           # These increase cash
        elif tx_type == 'DIVIDEND':
            cash_impact = amount           # Dividends increase cash (preserved as DIVIDEND)
        elif tx_type in ['WITHDRAWAL', 'DECIMAL_WITHDRAWAL']:
            cash_impact = -amount          # These decrease cash
        elif tx_type in ['DECIMAL_LIQUIDATION', 'SPIN_OFF_IN']:
            cash_impact = amount           # These typically increase cash
        elif tx_type in ['EXCHANGE_IN']:
            cash_impact = -(amount + fees) # Exchange in reduces cash (like buy)
        elif tx_type in ['EXCHANGE_OUT']:
            cash_impact = amount - fees    # Exchange out increases cash (like sell)
        
        running_balance += cash_impact
        cash_flows.append({
            'date': date,
            'type': tx_type,
            'symbol': symbol,
            'amount': amount,
            'fees': fees,
            'cash_impact': cash_impact,
            'running_balance': running_balance
        })
    
    # Print summary by transaction type
    print("\nCash impact by transaction type:")
    total_impact = 0
    for tx_type, txs in by_type.items():
        type_impact = 0
        count = len(txs)
        
        for tx in txs:
            quantity = float(tx.get('quantity', 0))
            price = float(tx.get('price', 0))
            fees = float(tx.get('fees', 0))
            amount = quantity * price
            
            if tx_type == 'BUY':
                type_impact -= (amount + fees)
            elif tx_type == 'SELL':
                type_impact += (amount - fees)
            elif tx_type in ['DEPOSIT', 'REFUND', 'LIQUIDATION', 'REDEMPTION']:
                type_impact += amount
            elif tx_type == 'DIVIDEND':
                type_impact += amount           # Dividends preserved as DIVIDEND type
            elif tx_type in ['WITHDRAWAL', 'DECIMAL_WITHDRAWAL']:
                type_impact -= amount
            elif tx_type in ['DECIMAL_LIQUIDATION', 'SPIN_OFF_IN']:
                type_impact += amount
            elif tx_type == 'EXCHANGE_IN':
                type_impact -= (amount + fees)  # Exchange in like buy
            elif tx_type == 'EXCHANGE_OUT':
                type_impact += (amount - fees)  # Exchange out like sell
        
        total_impact += type_impact
        print(f"  {tx_type}: {count:3d} transactions, {type_impact:12,.2f} NOK")
    
    print(f"\nTotal calculated cash impact: {total_impact:,.2f} NOK")
    return cash_flows

def analyze_dividend_timing(transactions):
    """Analyze dividend transactions for timing discrepancies"""
    print("\n=== DIVIDEND ANALYSIS ===")
    
    # Look for actual DIVIDEND transactions (now preserved)
    dividend_transactions = [tx for tx in transactions if tx.get('type') == 'DIVIDEND']
    
    # Also look for DEPOSIT transactions that might be dividends (fallback)
    potential_dividends = []
    
    for tx in transactions:
        tx_type = tx.get('type', '')
        notes = tx.get('notes', '').lower() if tx.get('notes') else ''
        symbol = tx.get('symbol', '')
        
        # Check for dividend-like patterns in DEPOSIT transactions
        if (tx_type == 'DEPOSIT' and 
            (('utbytte' in notes) or ('dividend' in notes) or 
             ('utb' in notes)) and symbol == 'CASH_NOK'):
            potential_dividends.append(tx)
    
    print(f"Actual DIVIDEND transactions: {len(dividend_transactions)}")
    print(f"Potential dividend DEPOSITs: {len(potential_dividends)}")
    
    # Combine both types for analysis
    all_dividends = dividend_transactions + potential_dividends
    
    if all_dividends:
        # Group by symbol or notes pattern
        by_source = defaultdict(list)
        total_dividends = 0
        
        for div in all_dividends:
            # For DIVIDEND transactions, use symbol; for DEPOSIT, extract from notes
            if div.get('type') == 'DIVIDEND':
                source = div.get('symbol', 'Unknown')
            else:
                notes = div.get('notes', '')
                # Try to extract company from notes like "UTBYTTE DNB 2.7 NOK/AKSJE"
                if 'utbytte' in notes.lower():
                    parts = notes.upper().split()
                    if len(parts) >= 2:
                        source = parts[1]  # Company name after "UTBYTTE"
                    else:
                        source = 'Unknown'
                else:
                    source = 'Other'
            
            quantity = float(div.get('quantity', 0))
            price = float(div.get('price', 0))
            amount = quantity * price
            date = div.get('date', '')
            notes = div.get('notes', '')
            tx_type = div.get('type', '')
            
            by_source[source].append({
                'date': date,
                'amount': amount,
                'notes': notes,
                'type': tx_type
            })
            total_dividends += amount
        
        print(f"Total dividend amount: {total_dividends:,.2f} NOK")
        print(f"Dividend sources: {len(by_source)}")
        
        # Show top dividend payers
        source_totals = {}
        for source, divs in by_source.items():
            source_totals[source] = sum(d['amount'] for d in divs)
        
        print("\nTop dividend sources:")
        for source, total in sorted(source_totals.items(), key=lambda x: x[1], reverse=True)[:10]:
            count = len(by_source[source])
            div_types = set(d['type'] for d in by_source[source])
            print(f"  {source:15s}: {count:2d} payments, {total:10,.2f} NOK ({', '.join(div_types)})")
            
        # Show sample dividend transactions
        print("\nSample dividend transactions:")
        for i, div in enumerate(all_dividends[:5]):
            amount = float(div.get('quantity', 0)) * float(div.get('price', 0))
            notes = div.get('notes', '')
            tx_type = div.get('type', '')
            print(f"  {tx_type}: {amount:,.2f} NOK - {notes}")
    
    else:
        print("No dividend transactions found.")
        print("Note: Check if dividends are recorded under different transaction types.")

def create_sample_data():
    """Create sample data for testing if no real data is available"""
    print("Creating sample data for analysis...")
    
    # Sample transaction data
    transactions = [
        {
            "type": "Buy",
            "symbol": "EQNR",
            "quantity": 100,
            "price": 250.50,
            "amount": 25050.0,
            "date": "2024-01-15",
            "fees": 50.0
        },
        {
            "type": "Dividend", 
            "symbol": "EQNR",
            "quantity": 1,
            "price": 15.50,
            "amount": 1550.0,
            "date": "2024-03-15",
            "fees": 0.0
        },
        {
            "type": "Deposit",
            "symbol": "CASH_NOK",
            "quantity": 100000,
            "price": 1.0,
            "amount": 100000.0,
            "date": "2024-01-01",
            "fees": 0.0
        }
    ]
    
    # Sample expected portfolio
    expected = {
        "cash": 75500.0,  # Expected after buy + dividend
        "holdings": [
            {
                "symbol": "EQUINOR",
                "quantity": 100,
                "value": 26000.0
            }
        ]
    }
    
    # Save sample data
    with open('transaction_data.json', 'w') as f:
        json.dump(transactions, f, indent=2)
    
    with open('expected_portfolio.json', 'w') as f:
        json.dump(expected, f, indent=2)
    
    return transactions, expected

def analyze_transactions():
    """Main analysis function"""
    try:
        # Try to load real data from database export
        with open('current_transactions.json', 'r') as f:
            transactions = json.load(f)
        
        with open('current_holdings.json', 'r') as f:
            current_holdings = json.load(f)
            
        print("Loaded current database transaction data")
        
        # Create expected data structure from current holdings for comparison
        expected = {
            "cash": 0,  # We'll calculate this
            "holdings": []
        }
        
        for holding in current_holdings:
            if holding['symbol'] == 'CASH_NOK':
                expected["cash"] = holding['quantity']
            else:
                expected["holdings"].append({
                    "symbol": holding['symbol'],
                    "quantity": holding['quantity'],
                    "isin": holding.get('isin')
                })
            
    except FileNotFoundError:
        print("No current database data found, creating sample data")
        transactions, expected = create_sample_data()
    
    symbol_mapping = get_symbol_mapping()
    
    print(f"=== PORTFOLIO RECONCILIATION ANALYSIS ===")
    print(f"Analysis date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Total transactions: {len(transactions)}")
    print(f"Expected holdings: {len(expected['holdings'])}")
    
    # Detailed cash flow analysis
    cash_flows = analyze_cash_discrepancy(transactions)
    
    # Dividend timing analysis  
    analyze_dividend_timing(transactions)
    
    # Calculate positions from transactions with ISIN support
    calculated_holdings = {}
    cash_balance = 0.0
    
    transaction_types = {}
    
    for tx in transactions:
        tx_type = tx.get('type', 'Unknown')
        transaction_types[tx_type] = transaction_types.get(tx_type, 0) + 1
        
        # Use ISIN as primary identifier if available, fallback to symbol mapping
        symbol = tx.get('symbol', 'CASH')
        isin = tx.get('isin')
        
        # Create a unique identifier (ISIN preferred, symbol as fallback)
        if isin:
            identifier = f"ISIN:{isin}"
            display_symbol = symbol  # Keep original symbol for display
        else:
            # Map symbol using our mapping for non-ISIN data
            mapped_symbol = symbol_mapping.get(symbol, symbol)
            identifier = f"SYMBOL:{mapped_symbol}"
            display_symbol = mapped_symbol
        
        # Use the correct field names from database schema
        quantity = float(tx.get('quantity', 0))
        price = float(tx.get('price', 0))
        fees = float(tx.get('fees', 0))
        amount = quantity * price  # Calculate amount from quantity * price
        
        if tx_type in ['BUY', 'SELL', 'EXCHANGE_IN', 'EXCHANGE_OUT']:
            if identifier not in calculated_holdings:
                calculated_holdings[identifier] = {
                    'quantity': 0.0, 
                    'avg_price': 0.0,
                    'symbol': display_symbol,
                    'isin': isin
                }
            
            if tx_type in ['BUY', 'EXCHANGE_IN']:
                # These increase holdings
                old_value = calculated_holdings[identifier]['quantity'] * calculated_holdings[identifier]['avg_price']
                new_value = quantity * price
                total_quantity = calculated_holdings[identifier]['quantity'] + quantity
                
                if total_quantity > 0:
                    calculated_holdings[identifier]['avg_price'] = (old_value + new_value) / total_quantity
                
                calculated_holdings[identifier]['quantity'] += quantity
                cash_balance -= (amount + fees)  # These reduce cash (include fees)
            
            elif tx_type in ['SELL', 'EXCHANGE_OUT']:
                # These decrease holdings
                calculated_holdings[identifier]['quantity'] -= quantity
                cash_balance += (amount - fees)  # These increase cash (minus fees)
        
        elif tx_type == 'DIVIDEND':
            # Dividends increase cash (preserved as DIVIDEND type)
            cash_balance += amount
        
        elif tx_type in ['DEPOSIT', 'REFUND', 'LIQUIDATION', 'REDEMPTION']:
            # These increase cash
            cash_balance += amount
        
        elif tx_type in ['WITHDRAWAL', 'DECIMAL_WITHDRAWAL']:
            # These decrease cash
            cash_balance -= amount
        
        elif tx_type in ['DECIMAL_LIQUIDATION', 'SPIN_OFF_IN']:
            # These are typically cash-neutral or increase holdings/cash
            cash_balance += amount
    
    print("\n=== TRANSACTION TYPE SUMMARY ===")
    for tx_type, count in sorted(transaction_types.items()):
        print(f"{tx_type}: {count}")
    
    print(f"\n=== CALCULATED VALUES ===")
    print(f"Calculated cash balance: {cash_balance:,.2f} NOK")
    print(f"Expected cash balance: {expected['cash']:,.2f} NOK")
    cash_diff = cash_balance - expected['cash']
    print(f"Cash difference: {cash_diff:,.2f} NOK")
    
    if abs(cash_diff) > 1000:  # Significant difference
        print(f"⚠️  SIGNIFICANT CASH DISCREPANCY DETECTED: {cash_diff:,.2f} NOK")
        print("   Possible causes:")
        print("   - Timing differences in dividend payments")
        print("   - Fees or taxes not included in transaction data")
        print("   - Different treatment of pending transactions")
        print("   - Currency conversion differences")
    
    print(f"\n=== HOLDINGS COMPARISON ===")
    print(f"Calculated holdings count: {len(calculated_holdings)}")
    print(f"Expected holdings count: {len(expected['holdings'])}")
    
    # Compare holdings using both ISIN and symbol mapping
    matches = 0
    expected_symbols = set()
    for h in expected['holdings']:
        expected_symbols.add(h['symbol'])
    
    calculated_symbols = set()
    for identifier, holding in calculated_holdings.items():
        calculated_symbols.add(holding['symbol'])
    
    print(f"\nExpected symbols: {sorted(expected_symbols)}")
    print(f"Calculated symbols: {sorted(calculated_symbols)}")
    
    common_symbols = expected_symbols & calculated_symbols
    print(f"\nCommon symbols: {sorted(common_symbols)}")
    print(f"Only in expected: {sorted(expected_symbols - calculated_symbols)}")
    print(f"Only in calculated: {sorted(calculated_symbols - expected_symbols)}")
    
    # Enhanced matching with ISIN priority
    print(f"\n=== ENHANCED HOLDINGS MATCHING ===")
    for identifier, calc_holding in calculated_holdings.items():
        symbol = calc_holding['symbol']
        isin = calc_holding['isin']
        
        # Find matching expected holding
        expected_holding = None
        for h in expected['holdings']:
            if h['symbol'] == symbol:
                expected_holding = h
                break
        
        if expected_holding:
            calc_qty = calc_holding['quantity']
            exp_qty = expected_holding['quantity']
            
            print(f"\n{symbol}:")
            if isin:
                print(f"  ISIN: {isin}")
            print(f"  Calculated: {calc_qty:,.2f}")
            print(f"  Expected: {exp_qty:,.2f}")
            print(f"  Difference: {calc_qty - exp_qty:,.2f}")
            
            if abs(calc_qty - exp_qty) < 0.01:
                matches += 1
                print("  ✅ MATCH")
            else:
                print("  ❌ MISMATCH")
    
    print(f"\nExact quantity matches: {matches}/{len(common_symbols)}")
    
    # Recommendations
    print(f"\n=== RECOMMENDATIONS ===")
    if cash_diff > 1000:
        print("1. Review dividend payment timing - check if dividends are recorded on payment date vs ex-date")
        print("2. Verify all fees and taxes are included in transaction records")
        print("3. Check for pending transactions not yet settled")
    
    if matches < len(common_symbols):
        print("4. Consider implementing ISIN-based matching for more accurate reconciliation")
        print("5. Review transaction type mapping for exchanges and corporate actions")
    
    print("6. Set up automated reconciliation alerts for discrepancies > 1000 NOK")

if __name__ == "__main__":
    analyze_transactions()
