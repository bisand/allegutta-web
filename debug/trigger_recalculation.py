#!/usr/bin/env python3
"""
Trigger Cash Holdings Recalculation
After fixing the holdings calculation logic, we need to recalculate the CASH_NOK holdings
"""

import json

def trigger_cash_recalculation():
    """Trigger recalculation by importing an empty CSV or updating a cash transaction"""
    
    # First, let's get the portfolio ID from our data
    with open('current_transactions.json', 'r') as f:
        transactions = json.load(f)
    
    if not transactions:
        print("No transactions found!")
        return
    
    portfolio_id = transactions[0]['portfolioId']
    print(f"Portfolio ID: {portfolio_id}")
    
    # Method 1: Try to update a cash transaction to trigger recalculation
    # Find any recent cash transaction
    cash_transaction = None
    for tx in transactions:
        if tx['symbol'] == 'CASH_NOK' and tx['type'] == 'DEPOSIT':
            cash_transaction = tx
            break
    
    if cash_transaction:
        print(f"Found cash transaction ID: {cash_transaction['id']}")
        print(f"Amount: {cash_transaction['quantity']} NOK")
        print(f"Date: {cash_transaction['date']}")
        
        # We'll simulate an API call to update this transaction
        # This should trigger the updateHoldings function with our new logic
        print("\n🔧 To trigger recalculation, you can:")
        print("1. Use the portfolio UI to edit any transaction (even just add a note)")
        print("2. Import a small CSV file")
        print("3. Run the recalculation API endpoint (if available)")
        print("4. Restart the server to reload the new holdings calculation logic")
        
        print("\n📊 Expected result after recalculation:")
        print("CASH_NOK holdings should show ~1,230,000 NOK (not 2,400,000 NOK)")
        print("This matches our transaction-based calculation that includes stock purchase impacts")
        
    else:
        print("No cash transactions found for testing")

if __name__ == "__main__":
    trigger_cash_recalculation()
