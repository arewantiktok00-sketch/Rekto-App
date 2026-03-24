/**
 * Translates backend error messages to CKB/AR for user-facing alerts.
 */

const errorTranslations: Record<string, { ckb: string; ar: string }> = {
  'Campaign ID and Transaction ID required': {
    ckb: 'ناسنامەی کەمپین و ناسنامەی مامەڵە پێویستە',
    ar: 'مطلوب معرف الحملة ومعرف المعاملة',
  },
  'Campaign not awaiting payment': {
    ckb: 'کەمپینەکە چاوەڕوانی پارەدان نییە',
    ar: 'الحملة ليست بانتظار الدفع',
  },
  'Only active campaigns can be extended': {
    ckb: 'تەنها ڕیکلامە چالاکەکان درێژکردنەوەیان بۆ دەکرێت',
    ar: 'يمكن تمديد الإعلانات النشطة فقط',
  },
  'Not authorized': {
    ckb: 'مۆڵەتت نییە',
    ar: 'غير مصرح',
  },
  'Only $20+/day campaigns can be extended': {
    ckb: 'تەنها کەمپینەکانی $20+/ڕۆژ دەتوانرێت درێژبکرێنەوە',
    ar: 'يمكن تمديد حملات $20+/يوم فقط',
  },
  'Campaign ID, extension days, amount, and transaction ID required': {
    ckb: 'ناسنامەی کەمپین، ژمارەی ڕۆژ، بڕی پارە، و ناسنامەی مامەڵە پێویستە',
    ar: 'مطلوب: معرف الحملة، عدد الأيام، المبلغ، ومعرف المعاملة',
  },
  'Extension already processed or not requested.': {
    ckb: 'درێژکردنەوە پێشتر جێبەجێ کراوە یان داوانەکراوە',
    ar: 'تم معالجة التمديد بالفعل أو لم يُطلب',
  },
  'Extension is already being processed. Please wait.': {
    ckb: 'درێژکردنەوە لە کاتی جێبەجێکردندایە. تکایە چاوەڕوان بە',
    ar: 'التمديد قيد المعالجة. يرجى الانتظار',
  },
  'Campaign not linked to TikTok. Cannot extend.': {
    ckb: 'کەمپین بەستراو نییە بە تیکتۆک. ناتوانرێت درێژبکرێتەوە',
    ar: 'الحملة غير مرتبطة بتيك توك. لا يمكن التمديد',
  },
  'No advertiser assigned to this campaign.': {
    ckb: 'هیچ ئیعلاندەرێک دیاری نەکراوە بۆ ئەم کەمپینە',
    ar: 'لم يتم تعيين معلن لهذه الحملة',
  },
  'Unauthorized': {
    ckb: 'ڕێگەپێدراو نییت',
    ar: 'غير مصرح',
  },
  'Campaign not found': {
    ckb: 'کەمپین نەدۆزرایەوە',
    ar: 'لم يتم العثور على الحملة',
  },
  'Invalid Transaction ID ⚠️': {
    ckb: '⚠️ ناسنامەی مامەڵە هەڵەیە',
    ar: '⚠️ معرف المعاملة غير صالح',
  },
  'No pending extension for this campaign': {
    ckb: 'هیچ داواکاری درێژکردنەوەیەکی چاوەڕوان نییە بۆ ئەم کەمپینە',
    ar: 'لا يوجد طلب تمديد معلق لهذه الحملة',
  },
};

export function translateErrorMessage(error: string, language: 'ckb' | 'ar'): string {
  if (!error || typeof error !== 'string') {
    return language === 'ckb'
      ? 'هەڵەیەک ڕویدا. تکایە دووبارە هەوڵبدە.'
      : 'حدث خطأ. يرجى المحاولة مرة أخرى.';
  }
  const trimmed = error.trim();
  if (errorTranslations[trimmed]?.[language]) {
    return errorTranslations[trimmed][language];
  }
  return trimmed;
}
