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

/**
 * Profile "spent all time" and any place that must NEVER show Arabic-Indic digits (٢٦٩).
 * Uses only ASCII 0-9 — no Intl (RTL/locale can still reshape numerals).
 */
/** Integer part only — ASCII 0-9 and commas only (no toLocaleString/Intl). */
export function formatIntegerLatinDigitsOnly(amount: number): string {
  const n = Math.floor(Math.abs(Number(amount)));
  if (!Number.isFinite(n)) return '0';
  const intStr = String(n);
  let withCommas = '';
  for (let i = 0; i < intStr.length; i++) {
    if (i > 0 && (intStr.length - i) % 3 === 0) withCommas += ',';
    withCommas += intStr[i];
  }
  return Number(amount) < 0 ? `-${withCommas}` : withCommas;
}

export function formatUSDLatinDigitsOnly(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '$0.00';
  const negative = n < 0;
  const abs = Math.abs(n);
  const [intStr, decStr] = abs.toFixed(2).split('.');
  let withCommas = '';
  for (let i = 0; i < intStr.length; i++) {
    if (i > 0 && (intStr.length - i) % 3 === 0) withCommas += ',';
    withCommas += intStr[i];
  }
  const body = `$${withCommas}.${decStr}`;
  return negative ? `-${body}` : body;
}

/** IQD display with Latin digits only — avoids Arabic-Indic numerals on RTL devices. */
export function formatIQDLatinDigitsOnly(amountIqd: number): string {
  return `IQD ${formatIntegerLatinDigitsOnly(amountIqd)}`;
}

/**
 * Canonical balance display: "IQD 20,000" (Poppins/LTR for numbers).
 * Use everywhere for wallet/balance screens. No USD.
 */
export function formatIQD(amount: number): string {
  return `IQD ${Math.floor(amount).toLocaleString('en-US')}`;
}

/** Always show IQD with English numerals (0-9). Use for all amount displays in app. */
export function formatIQDEnglish(amount: number): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.floor(amount));
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
