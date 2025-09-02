#!/usr/bin/env python3
import csv
from datetime import datetime
from collections import defaultdict

def parse_date(date_str):
    """Parse date in YYYY-MM-DD format"""
    return datetime.strptime(date_str, '%Y-%m-%d')

def parse_number(num_str):
    """Parse Norwegian number format (comma as decimal separator)"""
    if not num_str or num_str.strip() == '':
        return 0.0
    # Remove any whitespace and convert comma to dot
    return float(num_str.replace(',', '.').replace(' ', ''))

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

def analyze_transactions():
    """Analyze all transactions to calculate current positions and cash"""
    
    symbol_mapping = get_symbol_mapping()
    
    # Read transactions
    transactions = []
    with open('.data/transactions-and-notes-export_2025-09-01.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter='\t')
        for row in reader:
            transactions.append(row)
    
    print(f"Total transactions loaded: {len(transactions)}")
    print("\n" + "="*80)
    
    # Track holdings and cash
    holdings = defaultdict(lambda: {'quantity': 0, 'total_cost': 0})
    cash_balance = 0
    
    # Track transaction types for analysis
    transaction_types = defaultdict(int)
    
    print("CASH FLOW ANALYSIS:")
    print("="*50)
    
    cash_transactions = []
    
    for tx in transactions:
        tx_type = tx['Transaksjonstype'].strip()
        transaction_types[tx_type] += 1
        
        # Parse amounts
        quantity = parse_number(tx['Antall']) if tx['Antall'] else 0
        price = parse_number(tx['Kurs']) if tx['Kurs'] else 0
        amount = parse_number(tx['Beløp']) if tx['Beløp'] else 0
        fees = parse_number(tx['Totale Avgifter']) if tx['Totale Avgifter'] else 0
        
        symbol = tx['Verdipapir'].strip() if tx['Verdipapir'] else ''
        date = tx['Bokføringsdag']
        notes = tx['Transaksjonstekst']
        
        # Handle different transaction types
        if tx_type == 'INNSKUDD':  # Deposit
            cash_balance += amount
            cash_transactions.append(f"{date}: DEPOSIT +{amount:,.2f} NOK - {notes}")
            
        elif tx_type == 'UTTAK INTERNET':  # Withdrawal  
            cash_balance += amount  # amount is already negative
            cash_transactions.append(f"{date}: WITHDRAWAL {amount:,.2f} NOK - {notes}")
            
        elif tx_type == 'UTBYTTE':  # Dividend
            cash_balance += amount
            cash_transactions.append(f"{date}: DIVIDEND +{amount:,.2f} NOK from {symbol}")
            
        elif tx_type == 'TILBAKEBETALING':  # Capital return
            cash_balance += amount
            cash_transactions.append(f"{date}: REFUND +{amount:,.2f} NOK from {symbol}")
            
        elif tx_type == 'KJØPT':  # Buy
            if symbol:
                holdings[symbol]['quantity'] += quantity
                holdings[symbol]['total_cost'] += quantity * price + fees
                cash_balance -= (quantity * price + fees)
                
        elif tx_type == 'SALG':  # Sell
            if symbol:
                holdings[symbol]['quantity'] -= quantity
                # For sells, we receive the amount minus fees
                holdings[symbol]['total_cost'] -= quantity * holdings[symbol]['total_cost'] / (holdings[symbol]['quantity'] + quantity) if (holdings[symbol]['quantity'] + quantity) > 0 else 0
                cash_balance += (quantity * price - fees)
                
        elif tx_type in ['BYTTE INNLEGG VP', 'BYTTE UTTAK VP']:  # Exchange
            # These are typically paired transactions for corporate actions
            continue
            
        elif tx_type in ['INNL. VP LIKVID', 'INNLØSN. UTTAK VP']:  # Liquidation
            if symbol:
                cash_balance += amount
                cash_transactions.append(f"{date}: LIQUIDATION +{amount:,.2f} NOK from {symbol}")
                
        elif tx_type in ['SLETTING DESIM. LIKV', 'SLETTING DESIM. UTTA']:  # Decimal adjustments
            cash_balance += amount
            cash_transactions.append(f"{date}: DECIMAL_ADJ +{amount:,.2f} NOK from {symbol}")
            
        elif tx_type == 'UTSKILLING FISJON IN':  # Spin-off
            # New shares received, usually no cash impact
            if symbol and quantity > 0:
                holdings[symbol]['quantity'] += quantity
                # Cost basis is usually 0 for spin-offs
                
    # Sort cash transactions by date
    cash_transactions.sort()
    
    # Print recent cash transactions
    print("Recent Cash Transactions (last 10):")
    for tx in cash_transactions[-10:]:
        print(f"  {tx}")
    
    print(f"\nCalculated Cash Balance: {cash_balance:,.2f} NOK")
    print(f"Expected Cash Balance:   167,919.00 NOK")
    print(f"Difference:              {cash_balance - 167919:,.2f} NOK")
    
    print("\n" + "="*80)
    print("HOLDINGS ANALYSIS:")
    print("="*50)
    
    # Read expected positions
    expected_positions = {}
    with open('.data/portfolio-positions_2025-09-01.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter='\t')
        for row in reader:
            symbol = row['Navn'].strip()
            quantity = parse_number(row['Antall'])
            expected_positions[symbol] = quantity
    
    print("Comparison of Holdings:")
    print(f"{'Symbol':<25} {'Calculated':<12} {'Expected':<12} {'Difference':<12}")
    print("-" * 65)
    
    total_matches = 0
    total_symbols = 0
    
    # Check calculated vs expected
    for symbol in sorted(set(list(holdings.keys()) + list(expected_positions.keys()))):
        calc_qty = holdings.get(symbol, {}).get('quantity', 0)
        exp_qty = expected_positions.get(symbol, 0)
        diff = calc_qty - exp_qty
        
        if exp_qty > 0 or calc_qty > 0:  # Only show if there should be or is a position
            total_symbols += 1
            if abs(diff) < 0.01:  # Allow for small rounding differences
                total_matches += 1
                status = "✓"
            else:
                status = "✗"
            
            print(f"{symbol:<25} {calc_qty:<12.4f} {exp_qty:<12.4f} {diff:<12.4f} {status}")
    
    print(f"\nMatching positions: {total_matches}/{total_symbols}")
    
    print("\n" + "="*80)
    print("TRANSACTION TYPE SUMMARY:")
    print("="*50)
    
    for tx_type, count in sorted(transaction_types.items()):
        print(f"{tx_type:<25}: {count:>4} transactions")

if __name__ == "__main__":
    analyze_transactions()
