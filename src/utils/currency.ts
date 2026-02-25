/**
 * Currency formatting for RTL support. Uses Intl.NumberFormat so symbol and number order
 * are correct for the locale (e.g. RTL shows number then symbol when appropriate).
 */
const enUS = 'en-US';
const arIQ = 'ar-IQ';

export function formatUSD(amount: number, isRTL?: boolean): string {
  const locale = isRTL ? arIQ : enUS;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Always show USD with English/Western numerals (0-9) for budget slider and amounts. */
export function formatUSDEnglish(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatIQD(amount: number, isRTL?: boolean): string {
  const locale = isRTL ? arIQ : enUS;
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} IQD`;
}

/** Always show number in English/Western numerals (0-9). Use for budget, prices in UI. */
export function formatNumberEnglish(amount: number, options?: { minFraction?: number; maxFraction?: number }): string {
  const { minFraction = 0, maxFraction = 0 } = options ?? {};
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: minFraction,
    maximumFractionDigits: maxFraction,
  }).format(amount);
}
