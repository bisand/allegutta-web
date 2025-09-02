#!/bin/bash

# Trigger cash holdings recalculation by calling the import API with a minimal CSV
# This will force the updateHoldings function to run with the new logic

PORTFOLIO_ID="cmf2evd9j02rdl1crxor865vo"

echo "🔧 Triggering cash holdings recalculation..."
echo "Portfolio ID: $PORTFOLIO_ID"

# Create a minimal CSV to trigger recalculation
cat > temp_trigger.csv << 'EOF'
Dato,Type,Symbol,Antall,Kurs,Avgifter,Notater
01.01.2024,Utbytte,EQNR,0.01,1.0,0.0,Trigger recalculation
EOF

echo "📄 Created trigger CSV:"
cat temp_trigger.csv

echo ""
echo "🚀 Calling import API..."

# Call the import API endpoint
curl -X POST "http://localhost:3000/api/portfolios/$PORTFOLIO_ID/transactions/import" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@temp_trigger.csv" \
  -v

echo ""
echo "✅ Import API call completed"
echo "🔍 Check your portfolio UI now - CASH_NOK should show ~83,000 NOK instead of 2,403,726 NOK"

# Clean up
rm temp_trigger.csv
