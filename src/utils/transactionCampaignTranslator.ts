/**
 * Translates transaction types, transaction statuses, campaign statuses, and objectives
 * from English (database) to CKB/AR at display time.
 */

export const TRANSACTION_TYPE_MAP: Record<string, { ckb: string; ar: string }> = {
  deposit: { ckb: 'پارەدان', ar: 'إيداع' },
  payment: { ckb: 'پارەدان', ar: 'دفع' },
  refund: { ckb: 'گەڕاندنەوە', ar: 'استرداد' },
  extension: { ckb: 'درێژکردنەوە', ar: 'تمديد' },
  topup: { ckb: 'پڕکردنەوە', ar: 'شحن' },
};

export const TRANSACTION_STATUS_MAP: Record<string, { ckb: string; ar: string }> = {
  pending: { ckb: 'چاوەڕوان', ar: 'قيد الانتظار' },
  processing: { ckb: 'پرۆسەکردن', ar: 'قيد المعالجة' },
  completed: { ckb: 'تەواوبوو', ar: 'مكتملة' },
  failed: { ckb: 'سەرنەکەوتوو', ar: 'فشلت' },
};

export const CAMPAIGN_STATUS_MAP: Record<string, { ckb: string; ar: string }> = {
  pending: { ckb: 'چاوەڕوان', ar: 'قيد الانتظار' },
  active: { ckb: 'چالاک', ar: 'نشطة' },
  paused: { ckb: 'تەواوبوو', ar: 'مكتملة' },
  completed: { ckb: 'تەواوبوو', ar: 'مكتملة' },
  failed: { ckb: 'سەرنەکەوتوو', ar: 'فشلت' },
  rejected: { ckb: 'ڕەتکراوەتەوە', ar: 'مرفوضة' },
  in_review: { ckb: 'لە پشکنیندا', ar: 'قيد المراجعة' },
  awaiting_payment: { ckb: 'چاوەڕوانی پارەدان', ar: 'في انتظار الدفع' },
  waiting_for_admin: { ckb: 'چاوەڕوانی بەڕێوەبەر', ar: 'في انتظار المراجع' },
  verifying_payment: { ckb: 'پشکنینی پارەدان', ar: 'التحقق من الدفع' },
  scheduled: { ckb: 'کاتەبەندی', ar: 'مجدولة' },
  running: { ckb: 'چالاک', ar: 'نشطة' },
  deleted_external: { ckb: 'سڕاوەتەوە', ar: 'محذوفة' },
};

export const OBJECTIVE_MAP: Record<string, { ckb: string; ar: string }> = {
  conversions: { ckb: 'پەیوەندی و نامە', ar: 'جهات الاتصال والرسائل' },
  views: { ckb: 'بینین', ar: 'مشاهدات' },
  video_views: { ckb: 'بینینی ڤیدیۆ', ar: 'مشاهدات الفيديو' },
  VIDEO_VIEWS: { ckb: 'بینینی ڤیدیۆ', ar: 'مشاهدات الفيديو' },
  PRODUCT_SALES: { ckb: 'پەیوەندی و نامە', ar: 'جهات الاتصال والرسائل' },
};

export function translateTransactionType(
  value: string,
  language: 'ckb' | 'ar'
): string {
  if (!value) return value;
  const key = value.toLowerCase().trim();
  return TRANSACTION_TYPE_MAP[key]?.[language] ?? value;
}

export function translateTransactionStatus(
  value: string,
  language: 'ckb' | 'ar'
): string {
  if (!value) return value;
  const key = value.toLowerCase().trim();
  return TRANSACTION_STATUS_MAP[key]?.[language] ?? value;
}

export function translateCampaignStatus(
  value: string,
  language: 'ckb' | 'ar'
): string {
  if (!value) return value;
  const key = value.toLowerCase().replace(/\s+/g, '_').trim();
  return CAMPAIGN_STATUS_MAP[key]?.[language] ?? CAMPAIGN_STATUS_MAP[value]?.[language] ?? value;
}

export function translateObjective(
  value: string,
  language: 'ckb' | 'ar'
): string {
  if (!value) return value;
  const key = value.trim();
  return OBJECTIVE_MAP[key]?.[language] ?? OBJECTIVE_MAP[value.toLowerCase()]?.[language] ?? value;
}
