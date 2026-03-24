/**
 * Date/time formatting for CKB/AR app.
 * Backend stores UTC; we display in device local timezone.
 * Numeric format only — no English month or day names. Time in 24-hour format.
 */

/**
 * Parse UTC ISO string and format in LOCAL timezone (DD/MM/YYYY HH:mm).
 * Use for campaign start/end, invoice dates. Do NOT show raw UTC to user.
 */
export function formatUTCDateToLocalDisplay(utcIsoString: string | null | undefined): string {
  if (!utcIsoString) return '';
  const date = new Date(utcIsoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Parse UTC ISO string and format date only in LOCAL timezone (DD/MM/YYYY).
 */
export function formatUTCDateOnlyLocal(utcIsoString: string | null | undefined): string {
  if (!utcIsoString) return '';
  const date = new Date(utcIsoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Format date as YYYY/MM/DD (numeric, no English). Uses local time from Date.
 */
export function formatDateNumeric(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

/**
 * Format date as DD/MM/YYYY (numeric, no English). Uses local time from Date.
 */
export function formatDateNumericDMY(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Format time as 24-hour HH:mm (e.g. 14:30). Uses local time from Date.
 */
export function formatTime24(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

/**
 * Format date and time: YYYY/MM/DD • HH:mm (24h). Uses local time from Date.
 */
export function formatDateTimeNumeric(date: Date): string {
  return `${formatDateNumeric(date)} • ${formatTime24(date)}`;
}
