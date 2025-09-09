# Manual GAV Override System - Implementation Summary

## Problem Solved

Due to suboptimal transaction data quality and complex corporate actions, the automatic GAV (Gjennomsnittlig Anskaffelsesverdi / Average Acquisition Value) calculations sometimes produce incorrect results. This system allows manual GAV overrides to mitigate these data quality issues.

## Solution Overview

A comprehensive manual GAV override system has been implemented with the following components:

### 1. Database Schema Extensions

**Holdings Table Updates:**
- `manualAvgPrice` (Float, nullable) - The manually set GAV value
- `useManualAvgPrice` (Boolean, default false) - Flag to enable manual GAV
- `manualAvgPriceReason` (String, nullable) - Reason for manual override
- `manualAvgPriceDate` (DateTime, nullable) - When manual GAV was set

### 2. Backend Integration

**Portfolio Calculations (`server/lib/portfolioCalculations.ts`):**
- Modified to preserve manual GAV overrides during holdings recalculation
- When `useManualAvgPrice` is true, uses `manualAvgPrice` instead of calculated value
- Automatic recalculations don't overwrite manual GAV settings

**API Endpoint (`/api/portfolios/[id]/holdings/[symbol]/manual-gav`):**
- PATCH/PUT method to set or clear manual GAV
- Validates required fields when enabling manual GAV
- Supports both enabling and disabling manual GAV
- Triggers recalculation when disabling to restore calculated GAV

### 3. Admin Interface

**New Admin Page (`/admin/holdings`):**
- Portfolio selector to choose which portfolio to manage
- Holdings table showing calculated vs manual GAV
- Visual indicators for holdings using manual GAV
- Edit/Remove buttons for manual GAV management
- Navigation integration with existing admin system

**Holdings Management Features:**
- Set manual GAV with required reason/justification
- Edit existing manual GAV values
- Remove manual GAV to restore calculated values
- Visual indicators (badges) showing manual vs calculated status
- Tooltip information showing reasons for manual overrides

### 4. User Interface Components

**Modal Component (`EditManualGavModal.vue`):**
- Form to set/edit manual GAV values
- Required reason field with character limit (500 chars)
- Toggle to enable/disable manual GAV
- Validation ensuring both price and reason are provided
- Clear feedback on current vs manual GAV values

**Holdings Table Updates:**
- Visual indicators for holdings using manual GAV
- "Manual" badge displayed next to GAV values that are manually set
- Preserved existing functionality while adding GAV status visibility

## Usage Workflow

### Setting Manual GAV:
1. Go to `/admin/holdings`
2. Select the portfolio from dropdown
3. Find the holding that needs manual GAV
4. Click "Set Manual GAV" button
5. Enter the correct GAV value
6. Provide a detailed reason (required)
7. Save the changes

### Editing Manual GAV:
1. Click "Edit" button on holdings with manual GAV
2. Modify the GAV value or reason
3. Save changes

### Removing Manual GAV:
1. Click "Remove" button to restore calculated GAV
2. Confirm the action
3. System automatically recalculates GAV from transactions

## Data Integrity Features

- **Preservation during recalculation**: Manual GAV values are never overwritten by automatic calculations
- **Audit trail**: Tracks when manual GAV was set and the reason
- **Validation**: Requires both GAV value and justification when enabling
- **Safe removal**: Automatically triggers recalculation when disabling manual GAV
- **Transaction integrity**: Manual GAV doesn't affect transaction records, only the calculated holdings

## Technical Benefits

1. **Non-destructive**: Doesn't modify transaction data, only overrides calculations
2. **Auditable**: Full trail of when and why manual GAV was set
3. **Reversible**: Can easily switch between manual and calculated GAV
4. **Isolated**: Only affects the specific holding, not portfolio-wide calculations
5. **Future-proof**: Automatic calculations continue to work alongside manual overrides

## Common Use Cases

- **Corporate actions**: Complex mergers, spin-offs, or rights issues not handled correctly
- **Data quality issues**: Incorrect prices or missing transaction data
- **Historical corrections**: Adjusting for known pricing errors in imported data
- **Regulatory compliance**: Ensuring GAV matches official broker statements

## Access Control

- **Admin-only access**: Manual GAV management is restricted to admin users
- **Separate interface**: Isolated from regular portfolio views to prevent accidental changes
- **Portfolio-specific**: Can only edit GAV for portfolios the user has access to

This implementation provides a robust solution for handling GAV calculation issues while maintaining data integrity and providing full auditability of manual overrides.
