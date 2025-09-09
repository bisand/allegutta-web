# Smart Instrument Relationship Detection - User Guide

## Overview

The **Smart Instrument Relationship Detection System** uses AI-powered analysis to automatically discover which instruments belong together. No manual configuration required - the system analyzes transaction patterns, symbol names, temporal trading data, and corporate action indicators to intelligently group related instruments.

## Problem Solved

Previously, instruments like DNB/DNBH, TOM/TOM OLD, and KOA/KOA T-RETT/X were calculated separately, causing significant GAV discrepancies. The smart detection system automatically discovers these relationships and combines their cost basis calculations.

## Smart Detection Capabilities

### 🤖 Multi-Criteria Analysis

1. **Name Similarity Analysis (40% weight)**
   - Levenshtein distance for character-level similarity
   - Jaccard similarity for n-gram pattern matching
   - Longest common substring detection
   - Keyword pattern recognition (OLD, T-RETT, etc.)

2. **Temporal Pattern Analysis (30% weight)**
   - Sequential trading detection (one stops, other starts)
   - Trading gap analysis for symbol changes
   - Overlap period assessment

3. **Transaction Pattern Analysis (20% weight)**
   - Quantity ratio similarity detection
   - Exchange transaction identification
   - Corporate action type classification

4. **Metadata Analysis (10% weight)**
   - Transaction notes keyword scanning
   - Corporate action indicator detection

### 🎯 Automatic Relationship Types

- **Symbol Changes**: DNB → DNBH, TOM → TOM OLD
- **Rights Issues**: KOA ↔ KOA T-RETT/X  
- **Corporate Actions**: Mergers, splits, spin-offs
- **Unknown Patterns**: Discovers new relationships dynamically

## API Usage

### Analyze Portfolio Relationships
```bash
GET /api/portfolios/{portfolioId}/analyze-instruments
```

**Returns:**
```json
{
  "success": true,
  "analysis": {
    "totalSymbols": 25,
    "relationships": [
      {
        "symbol1": "DNB",
        "symbol2": "DNBH", 
        "score": 0.87,
        "confidence": 0.89,
        "evidence": ["High name similarity: 92%", "Sequential trading pattern (15 days gap)"],
        "relationshipType": "SYMBOL_CHANGE"
      }
    ],
    "groupings": [
      {
        "primarySymbol": "DNBH",
        "relatedSymbols": ["DNB", "DNBH"],
        "confidence": 0.89,
        "reason": "Symbol change detected; Sequential trading pattern"
      }
    ]
  }
}
```

### Apply Smart Relationship Calculations
```bash
POST /api/portfolios/{portfolioId}/recalculate-instruments
Content-Type: application/json

{
  "symbols": ["DNB", "DNBH", "TOM", "TOM OLD", "KOA", "KOA T-RETT/X"]
}
```

**Returns before/after comparison with combined cost basis calculations.**

## How It Works

1. **Analysis Phase**: System analyzes all symbol pairs in portfolio using multi-criteria scoring
2. **Grouping Phase**: High-confidence relationships are grouped into instrument families  
3. **Calculation Phase**: Combined cost basis calculated across all related instruments
4. **FIFO Integration**: Enhanced FIFO logic preserves lot tracking across relationships

## Expected Results

### DNB Bank (191 shares @ 118.13)
- **Before**: DNB and DNBH calculated separately
- **After**: Combined cost basis from all DNB + DNBH transactions
- **Result**: GAV matches broker statements

### TOM/TOM OLD
- **Detection**: "OLD" keyword + high name similarity triggers combination
- **Result**: Historical TOM transactions contribute to TOM OLD cost basis

### KOA Rights Issue
- **Detection**: "T-RETT" keyword + name similarity identifies rights relationship  
- **Result**: Rights allocations properly integrated with original shares

## Advantages Over Hardcoded Approach

✅ **Zero Configuration**: No relationship database to maintain  
✅ **Self-Learning**: Discovers new patterns automatically  
✅ **Adaptive**: Works with any portfolio's specific instruments  
✅ **Comprehensive**: Multi-criteria analysis for accuracy  
✅ **Future-Proof**: Handles unknown corporate actions  
✅ **Maintenance-Free**: No manual updates required  

## Confidence Scoring

- **0.9-1.0**: Very high confidence - automatically applied
- **0.7-0.8**: High confidence - recommended for combination  
- **0.5-0.6**: Medium confidence - manual review suggested
- **0.3-0.4**: Low confidence - potential relationship detected
- **<0.3**: No relationship detected

## Testing the System

1. **Analyze your portfolio**:
   ```bash
   curl -X GET "http://localhost:3000/api/portfolios/YOUR_ID/analyze-instruments"
   ```

2. **Review detected relationships** and confidence scores

3. **Apply smart calculations**:
   ```bash  
   curl -X POST "http://localhost:3000/api/portfolios/YOUR_ID/recalculate-instruments" \
     -H "Content-Type: application/json" \
     -d '{"symbols": ["DNB", "DNBH"]}'
   ```

4. **Verify results** in admin interface - GAV should now match broker statements

## Technical Implementation

The system automatically:
- Scans all symbol pairs for relationship indicators
- Calculates weighted similarity scores across multiple dimensions
- Groups related instruments by confidence level
- Applies combined FIFO calculations with proper transformation ratios
- Preserves manual GAV overrides when specified

**No configuration files, no hardcoded relationships, no maintenance required.**

The smart detection system will automatically handle your DNB/DNBH, TOM/TOM OLD, KOA/KOA T-RETT/X discrepancies and discover any other related instruments in your portfolio.
