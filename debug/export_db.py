#!/usr/bin/env python3
"""
Database Export Script for Portfolio Analysis
Extracts transaction and holding data from SQLite database
"""

import sqlite3
import json
import sys
from datetime import datetime

def export_portfolio_data(portfolio_id=None):
    """Export transaction and holding data from the database"""
    
    try:
        # Connect to SQLite database
        conn = sqlite3.connect('prisma/dev.db')
        conn.row_factory = sqlite3.Row  # This allows column access by name
        cursor = conn.cursor()
        
        # Get all portfolios first
        cursor.execute("SELECT * FROM portfolios")
        portfolios = [dict(row) for row in cursor.fetchall()]
        
        print(f"Found {len(portfolios)} portfolios:")
        for i, portfolio in enumerate(portfolios):
            print(f"  {i+1}. {portfolio['name']} (ID: {portfolio['id']})")
        
        # If no specific portfolio ID provided, use the first one or ask user
        if not portfolio_id and portfolios:
            portfolio_id = portfolios[0]['id']
            print(f"\nUsing portfolio: {portfolios[0]['name']} (ID: {portfolio_id})")
        elif not portfolios:
            print("No portfolios found in database")
            return None, None
        
        # Export transactions
        cursor.execute("""
            SELECT * FROM transactions 
            WHERE portfolioId = ? 
            ORDER BY date ASC
        """, (portfolio_id,))
        
        transactions = []
        for row in cursor.fetchall():
            tx = dict(row)
            # Convert date to string for JSON serialization
            if tx['date']:
                tx['date'] = tx['date']
            transactions.append(tx)
        
        print(f"\nExported {len(transactions)} transactions")
        
        # Export holdings
        cursor.execute("""
            SELECT * FROM holdings 
            WHERE portfolioId = ? 
            ORDER BY symbol ASC
        """, (portfolio_id,))
        
        holdings = []
        for row in cursor.fetchall():
            holding = dict(row)
            holdings.append(holding)
        
        print(f"Exported {len(holdings)} holdings")
        
        # Create analysis data structure
        analysis_data = {
            'portfolio_id': portfolio_id,
            'portfolio_name': next((p['name'] for p in portfolios if p['id'] == portfolio_id), 'Unknown'),
            'export_date': datetime.now().isoformat(),
            'transactions': transactions,
            'holdings': holdings,
            'transaction_summary': {}
        }
        
        # Create transaction summary
        transaction_types = {}
        total_amount = 0
        for tx in transactions:
            tx_type = tx['type']
            transaction_types[tx_type] = transaction_types.get(tx_type, 0) + 1
            if tx['type'] in ['BUY', 'SELL']:
                total_amount += abs(tx['quantity'] * tx['price'])
        
        analysis_data['transaction_summary'] = {
            'total_transactions': len(transactions),
            'transaction_types': transaction_types,
            'total_trading_volume': total_amount
        }
        
        # Save to files
        with open('current_transactions.json', 'w') as f:
            json.dump(transactions, f, indent=2, default=str)
        
        with open('current_holdings.json', 'w') as f:
            json.dump(holdings, f, indent=2, default=str)
            
        with open('portfolio_analysis_data.json', 'w') as f:
            json.dump(analysis_data, f, indent=2, default=str)
        
        print(f"\nFiles created:")
        print(f"  - current_transactions.json ({len(transactions)} transactions)")
        print(f"  - current_holdings.json ({len(holdings)} holdings)")
        print(f"  - portfolio_analysis_data.json (complete analysis data)")
        
        conn.close()
        return transactions, holdings
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return None, None
    except Exception as e:
        print(f"Error: {e}")
        return None, None

def print_portfolio_summary(transactions, holdings):
    """Print a summary of the portfolio data"""
    if not transactions:
        print("No transaction data to analyze")
        return
    
    print(f"\n=== PORTFOLIO SUMMARY ===")
    
    # Transaction summary
    by_type = {}
    by_symbol = {}
    cash_flow = 0
    
    for tx in transactions:
        tx_type = tx['type']
        symbol = tx['symbol']
        amount = tx['quantity'] * tx['price']
        
        by_type[tx_type] = by_type.get(tx_type, 0) + 1
        by_symbol[symbol] = by_symbol.get(symbol, [])
        by_symbol[symbol].append(tx)
        
        # Calculate cash flow impact
        if tx_type == 'BUY':
            cash_flow -= amount
        elif tx_type in ['SELL', 'DIVIDEND', 'DEPOSIT']:
            cash_flow += amount
        elif tx_type == 'WITHDRAWAL':
            cash_flow -= amount
    
    print(f"Transaction types:")
    for tx_type, count in sorted(by_type.items()):
        print(f"  {tx_type}: {count}")
    
    print(f"\nNet cash flow: {cash_flow:,.2f}")
    print(f"Unique symbols: {len(by_symbol)}")
    
    # Holdings summary
    if holdings:
        print(f"\nCurrent holdings:")
        total_value = 0
        for holding in holdings:
            symbol = holding['symbol']
            quantity = holding['quantity']
            avg_price = holding['avgPrice']
            value = quantity * avg_price
            total_value += value
            
            isin_info = f" (ISIN: {holding['isin']})" if holding.get('isin') else ""
            print(f"  {symbol}{isin_info}: {quantity:,.2f} @ {avg_price:,.2f} = {value:,.2f}")
        
        print(f"\nTotal portfolio value: {total_value:,.2f}")

if __name__ == "__main__":
    portfolio_id = sys.argv[1] if len(sys.argv) > 1 else None
    transactions, holdings = export_portfolio_data(portfolio_id)
    
    if transactions is not None:
        print_portfolio_summary(transactions, holdings)
        print(f"\n✅ Data exported successfully. Use portfolio_analysis_data.json for detailed analysis.")
    else:
        print("❌ Failed to export data")
