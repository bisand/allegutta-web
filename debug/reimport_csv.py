#!/usr/bin/env python3
"""
Re-import CSV with fixed transaction type mapping
"""

import requests
import json

def reimport_csv():
    portfolio_id = "cmf2evd9j02rdl1crxor865vo"
    csv_file = "/workspaces/allegutta-web/.data/transactions-and-notes-export_2025-09-01.csv"
    
    # Read CSV content
    with open(csv_file, 'r', encoding='utf-8') as f:
        csv_content = f.read()
    
    # Import via API
    url = f"http://localhost:3000/api/portfolios/{portfolio_id}/transactions/import"
    
    response = requests.post(url, json={
        "csvData": csv_content
    })
    
    print(f"Import response: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Success: {result.get('message', 'Import completed')}")
        if 'summary' in result:
            summary = result['summary']
            print(f"Imported: {summary.get('imported', 0)} transactions")
            print(f"Skipped: {summary.get('skipped', 0)} transactions")
            print(f"Duplicates: {summary.get('duplicates', 0)} transactions")
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    reimport_csv()
