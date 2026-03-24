/**
 * Campaign budget and extension status helpers.
 * Source of truth after owner extension/corrections: real_budget ?? total_budget ?? target_spend.
 * (real_end_date is source of truth for end date in screens — do not derive only from duration.)
 */

export interface CampaignBudgetFields {
  target_spend?: number | null;
  real_budget?: number | null;
  total_budget?: number | null;
}

/** Effective budget for display (and spent % denominator). Prefer real_budget after admin updates. */
export function getDisplayBudget(c: CampaignBudgetFields | null | undefined): number {
  if (!c) return 0;
  const v = c.real_budget ?? c.total_budget ?? c.target_spend;
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export type ExtensionStatus = 'awaiting_payment' | 'verifying_payment' | 'processing' | null;

export function getExtensionStatusText(
  status: string | null | undefined,
  language: 'ckb' | 'ar' = 'ckb'
): { text: string; color: 'warning' | 'info' } | null {
  if (!status) return null;
  const isAr = language === 'ar';
  switch (status) {
    case 'awaiting_payment':
      return {
        text: isAr ? 'في انتظار دفع التمديد' : 'چاوەڕوانی پارەی درێژکردنەوە',
        color: 'warning',
      };
    case 'verifying_payment':
      return {
        text: isAr ? 'دفعة التمديد قيد المراجعة' : 'پارەدانی درێژکردنەوە لە پشکنیندایە',
        color: 'warning',
      };
    case 'processing':
      return {
        text: isAr ? 'جارٍ تطبيق التمديد...' : 'درێژکردنەوە جێبەجێ دەکرێت...',
        color: 'info',
      };
    default:
      return null;
  }
}
