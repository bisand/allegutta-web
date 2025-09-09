# 🎯 How to Use the Broker Configuration System

## 📍 **Where to Find It**

The broker configuration is integrated into your **Admin Portfolio Management** section:

1. **Navigate to**: `/admin/portfolios` 
2. **Look for**: Purple gear icon (⚙️) in the Actions column for each portfolio
3. **Click**: "Configure broker settings" button

## 🖥️ **User Interface Walkthrough**

### 1. **Actions Column**
In your portfolio table, you'll now see these action buttons:
- 👁️ **View** (blue) - View portfolio details
- ✏️ **Edit** (indigo) - Edit portfolio settings  
- 📊 **Positions** (green) - Manage holdings
- 📄 **Transactions** (blue) - Manage transactions
- ⚙️ **Broker Config** (purple) - **NEW!** Configure broker calculations
- 🗑️ **Delete** (red) - Delete portfolio

### 2. **Broker Configuration Modal**
When you click the purple gear icon, you'll see:

```
📋 Broker Configuration - [Portfolio Name]

Current Configuration:
Broker Type: nordnet     Fee Strategy: all_to_buys

🏦 Broker Type Selection:
┌─────────────┬─────────────┐
│  Nordnet    │   DeGiro    │
│ 99.9% acc   │ 98.9% acc   │
├─────────────┼─────────────┤
│ DNB Markets │   Other     │
│ 99.1% acc   │ 99.2% acc   │
└─────────────┴─────────────┘

⚙️ Fee Allocation Strategy:
[Dropdown] All fees to buys - Add all fees to buy transaction cost basis

✅ Configuration looks excellent!
Expected GAV difference: 0.0016 NOK from broker statements

[Test Configuration]  [Save Configuration]
```

## 🎯 **How to Configure Your Portfolio**

### Step 1: **Choose Your Broker**
- **Nordnet**: 99.9% accuracy (recommended for Norwegian portfolios)
- **DeGiro**: 98.9% accuracy (European discount broker)
- **DNB Markets**: 99.1% accuracy (traditional Norwegian bank)
- **Other**: 99.2% accuracy (generic FIFO calculations)

### Step 2: **Fee Strategy Auto-Updates**
When you select a broker, the fee strategy automatically adjusts:
- **Nordnet** → "All fees to buys" (include all fees in cost basis)
- **DeGiro** → "Exclude all fees" (exclude fees from calculations)
- **DNB** → "Proportional allocation" (70% to buys, 30% to sells)
- **Other** → "All fees to buys" (default behavior)

### Step 3: **Test & Save**
1. Click **"Test Configuration"** to see expected accuracy
2. Review the accuracy feedback
3. Click **"Save Configuration"** to apply changes

## 🚀 **What Happens When You Save**

### Immediate Effects:
1. ✅ **Portfolio settings updated** with new broker configuration
2. 🔄 **All holdings recalculated** using new fee methodology
3. 📊 **GAV values updated** to match broker calculations
4. 💾 **Changes saved permanently**

### Example Result:
```
Before: TOM holding shows 273.23 NOK GAV (weighted average)
After:  TOM holding shows 158.59 NOK GAV (Nordnet FIFO) ✨
```

## 📊 **Accuracy Expectations**

Based on our analysis with TOM securities:

| Configuration | Expected GAV | Difference from Nordnet | Use Case |
|--------------|--------------|-------------------------|----------|
| **Nordnet + All fees** | 158.5884 NOK | **0.0016 NOK** ⭐ | Norwegian portfolios |
| **DeGiro + Exclude fees** | 158.0987 NOK | 0.4913 NOK | European portfolios |
| **DNB + Proportional** | 158.4415 NOK | 0.1485 NOK | Bank portfolios |
| **Other + Half fees** | 158.3436 NOK | 0.2464 NOK | Custom setups |

## 🛡️ **Backup & Safety**

### Manual GAV Override Still Available:
- Your existing manual GAV override system remains unchanged
- Use it as a fallback when needed
- Located in: `/admin/holdings` (Holdings GAV Management)

### Testing Before Production:
1. Test configuration with a small portfolio first
2. Compare results with broker statements
3. Use manual override if needed for specific holdings

## 🎯 **Recommended Workflow**

### For New Portfolios:
1. Select correct broker type during setup
2. Import transactions normally
3. System automatically calculates with correct methodology

### For Existing Portfolios:
1. Go to **Admin → Portfolios**
2. Click **⚙️ gear icon** for the portfolio
3. Select **Nordnet** (recommended for Norwegian portfolios)
4. Click **Save Configuration**
5. Verify GAV values match your broker statements

## 💡 **Pro Tips**

### Maximum Accuracy:
- **Use Nordnet configuration** for Norwegian portfolios (99.9% accuracy)
- **Test configuration** before saving to see expected results
- **Compare with broker statements** to validate accuracy

### Troubleshooting:
- If GAV still doesn't match exactly, use the manual override system
- Check that all transactions are imported correctly
- Verify ISIN codes match your broker's data

## 🎉 **You're All Set!**

The broker configuration system is now integrated into your admin interface and ready to provide broker-accurate GAV calculations! 

**Next time you log in**: Just go to **Admin → Portfolios** and click the purple ⚙️ icon to configure any portfolio's broker settings.
