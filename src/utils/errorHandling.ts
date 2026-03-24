/**
 * Error handling policy:
 * - Regular users: friendly Kurdish messages only (no technical/API errors).
 * - Owners/Admins (owner_accounts): full technical error details for debugging.
 */

const DEFAULT_FRIENDLY_CKB = 'هەڵەیەک ڕوویدا، تکایە دووبارە هەوڵ بدەرەوە';
const DEFAULT_FRIENDLY_AR = 'حدث خطأ، يرجى المحاولة مرة أخرى';

const ERROR_MAP: Array<{ pattern: string | RegExp; ckb: string; ar?: string }> = [
  // TikTok / budget API — never show raw English to regular users
  { pattern: /tiktok\s*api|budget\s*step|minimum\s*budget/i, ckb: 'نەتوانرا درێژکردنەوە ئەنجام بدرێت، تکایە پشکنین بکەنەوە یان پەیوەندی بە پاڵپشتی بکەن', ar: 'تعذر إكمال التمديد، يرجى المراجعة أو التواصل مع الدعم' },
  { pattern: /\$100|100\.00/i, ckb: 'بڕی پارە لەسەر سنووری ڕێگەپێدراوی سەرچاوەکە کەمە، تکایە بڕێکی بەرزتر هەڵبژێرە یان پەیوەندی بە پاڵپشتی بکەن', ar: 'المبلغ أقل من الحد المسموح، يرجى اختيار مبلغ أعلى أو التواصل مع الدعم' },
  { pattern: 'Insufficient balance', ckb: 'باڵانسی پارە بەس نییە', ar: 'الرصيد غير كافٍ' },
  { pattern: 'Campaign not found', ckb: 'کامپەینەکە نەدۆزرایەوە', ar: 'الحملة غير موجودة' },
  { pattern: 'Not authorized', ckb: 'مۆڵەتت نییە', ar: 'غير مصرح' },
  { pattern: 'Unauthorized', ckb: 'مۆڵەتت نییە', ar: 'غير مصرح' },
  { pattern: 'Extension already processed', ckb: 'درێژکردنەوە پێشتر ئەنجام دراوە', ar: 'تمت معالجة التمديد مسبقاً' },
  { pattern: 'Invalid request', ckb: 'داواکاری هەڵەیە', ar: 'طلب غير صالح' },
  { pattern: 'Request already processed', ckb: 'داواکاریەکە پێشتر ئەنجام دراوە', ar: 'تمت معالجة الطلب مسبقاً' },
  { pattern: 'User not found', ckb: 'بەکارهێنەر نەدۆزرایەوە', ar: 'المستخدم غير موجود' },
  { pattern: 'Invalid amount_iqd', ckb: 'بڕی پارە هەڵەیە', ar: 'المبلغ غير صالح' },
  { pattern: 'Invalid transaction', ckb: 'مامەڵە هەڵەیە', ar: 'المعاملة غير صالحة' },
  { pattern: 'Network request failed', ckb: 'پەیوەندی ئینتەرنێت نییە، تکایە ئینتەرنێتەکەت بپشکنە', ar: 'فشل الاتصال، تحقق من الإنترنت' },
  { pattern: /non-2xx|status code|FunctionsHttpError/i, ckb: DEFAULT_FRIENDLY_CKB, ar: DEFAULT_FRIENDLY_AR },
  { pattern: /TypeError|Cannot read property/i, ckb: DEFAULT_FRIENDLY_CKB, ar: DEFAULT_FRIENDLY_AR },
];

/**
 * Map backend/technical error to a friendly Kurdish (or Arabic) message for regular users.
 */
export function getKurdishError(backendError: string, language: 'ckb' | 'ar' = 'ckb'): string {
  const str = String(backendError || '').trim();
  if (!str) return language === 'ckb' ? DEFAULT_FRIENDLY_CKB : DEFAULT_FRIENDLY_AR;
  const lower = str.toLowerCase();
  for (const { pattern, ckb, ar } of ERROR_MAP) {
    const match = typeof pattern === 'string'
      ? lower.includes(pattern.toLowerCase())
      : pattern.test(str);
    if (match) return language === 'ar' && ar ? ar : ckb;
  }
  return language === 'ckb' ? DEFAULT_FRIENDLY_CKB : DEFAULT_FRIENDLY_AR;
}

/**
 * Get the error message to show: technical for owner/admin, friendly Kurdish for regular user.
 * Use after supabase.functions.invoke or any API call.
 * @param error - Caught error (e.g. from try/catch)
 * @param data - Response body (e.g. { success: false, error: "..." })
 * @param isOwnerOrAdmin - From useOwnerAuth().hasAdminAccess
 * @param language - For Arabic fallback
 */
export function getErrorMessageForUser(
  error: unknown,
  data: { success?: boolean; error?: string } | null,
  isOwnerOrAdmin: boolean,
  language: 'ckb' | 'ar' = 'ckb'
): string {
  if (isOwnerOrAdmin) {
    const fromData = data?.success === false && data?.error ? String(data.error) : '';
    const fromError = error instanceof Error ? error.message : (error ? String(error) : '');
    return fromData || fromError || (language === 'ckb' ? 'هەڵەی نەناسراو' : 'خطأ غير معروف');
  }
  const backendMsg = data?.success === false && data?.error ? String(data.error) : '';
  const errorMsg = error instanceof Error ? error.message : (error ? String(error) : '');
  const combined = backendMsg || errorMsg;
  return getKurdishError(combined, language);
}

/** Detect raw backend/API English that must not be shown to regular users */
function looksLikeTechnicalError(text: string): boolean {
  const s = String(text || '');
  if (!s.trim()) return false;
  if (/tiktok|api error|budget step|minimum budget|status code|FunctionsHttpError|non-2xx/i.test(s)) return true;
  if (/^\s*[A-Z][a-z]+(\s+[a-z]+)*\s*error/i.test(s)) return true;
  return false;
}

/**
 * Notification body/title for display: owners see translated or raw technical detail;
 * regular users never see backend English — friendly CKB/AR only.
 */
export function getNotificationMessageForDisplay(
  rawMessage: string,
  translatedMessage: string,
  isOwnerOrAdmin: boolean,
  language: 'ckb' | 'ar' = 'ckb'
): string {
  const raw = rawMessage != null ? String(rawMessage) : '';
  const tr = translatedMessage != null ? String(translatedMessage) : '';
  if (isOwnerOrAdmin) return tr || raw || '';
  const msg = tr || raw || '';
  if (looksLikeTechnicalError(msg) || looksLikeTechnicalError(raw)) {
    return getKurdishError(raw || msg, language);
  }
  return msg;
}
