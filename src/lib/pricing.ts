/**
 * Centralized pricing and tax calculation module
 * Used for invoice calculations and currency conversions
 */

// Exchange Rate: 1 USD = 1,450 IQD (use Math.floor, no rounding up)
export const USD_TO_IQD_RATE = 1450;

/**
 * Calculate tax based on budget amount using FIXED LOOKUP TABLE
 * 
 * CRITICAL: This uses a fixed tax table - DO NOT calculate dynamically
 * 
 * Fixed Tax Table:
 * $10 → $3.3 tax
 * $20 → $5.4 tax
 * $30 → $8.1 tax
 * $40 → $8.4 tax
 * $50 → $10.5 tax
 * $60 → $12.6 tax
 * $70 → $14.7 tax
 * $80 → $16.8 tax
 * $90 → $18.9 tax
 * $100 → $21 tax
 * 
 * For amounts not in the table:
 * - $10 and below: 33% rate
 * - $11-$20: 27% rate
 * - $21+: $5.4 base + $0.30 per dollar above $20
 * 
 * @param budgetUSD - Budget amount in USD
 * @returns Tax amount in USD
 */
export function calculateTax(budgetUSD: number): number {
  if (budgetUSD <= 0) return 0;
  
  // FIXED TAX TABLE - DO NOT CHANGE
  const FIXED_TAX_TABLE: Record<number, number> = {
    10: 3.3,
    20: 5.4,
    30: 8.1,
    40: 8.4,
    50: 10.5,
    60: 12.6,
    70: 14.7,
    80: 16.8,
    90: 18.9,
    100: 21,
  };
  
  // Check fixed table first
  if (FIXED_TAX_TABLE[budgetUSD] !== undefined) {
    return FIXED_TAX_TABLE[budgetUSD];
  }
  
  // For amounts not in table
  if (budgetUSD <= 10) {
    return Number((budgetUSD * 0.33).toFixed(1));
  }
  
  if (budgetUSD < 20) {
    return Number((budgetUSD * 0.27).toFixed(1));
  }
  
  // $21+: base $5.4 + $0.30 per dollar above $20
  const dollarsAbove20 = budgetUSD - 20;
  return Number((5.4 + (dollarsAbove20 * 0.3)).toFixed(1));
}

/**
 * Convert USD to IQD using floor (no rounding up)
 * @param usdAmount - Amount in USD
 * @returns Amount in IQD (floored)
 */
export function convertUSDToIQD(usdAmount: number): number {
  return Math.floor(usdAmount * USD_TO_IQD_RATE);
}

/**
 * Minimum budget for ad extensions (USD)
 */
export const MIN_EXTENSION_BUDGET_USD = 20;

/**
 * Calculate total with tax for extension pricing
 * @param budgetUSD - Base budget amount in USD (without tax)
 * @param exchangeRate - Exchange rate (default: USD_TO_IQD_RATE)
 * @returns Object with budget, tax, totalUSD, and totalIQD
 */
export function calculateTotalWithTax(
  budgetUSD: number,
  exchangeRate: number = USD_TO_IQD_RATE
): {
  budget: number;
  tax: number;
  totalUSD: number;
  totalIQD: number;
} {
  const tax = calculateTax(budgetUSD);
  const totalUSD = budgetUSD + tax;
  const totalIQD = Math.floor(totalUSD * exchangeRate);
  
  return {
    budget: budgetUSD,
    tax,
    totalUSD,
    totalIQD,
  };
}
