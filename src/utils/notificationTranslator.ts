/**
 * Translates notification titles and messages from English (backend) to CKB/AR at display time.
 * Backend stores in English; app shows ckb/ar (or en passthrough).
 */

const titleMap: Record<string, { ckb: string; ar: string }> = {
  'Receipt Received': { ckb: 'پسوولە وەرگیرا', ar: 'تم استلام الإيصال' },
  'receipt received': { ckb: 'پسوولە وەرگیرا', ar: 'تم استلام الإيصال' },
  'Ad Submitted!': { ckb: '!ڕیکلامەکە نێردرا', ar: '!تم إرسال الإعلان' },
  'Ad Submitted': { ckb: '!ڕیکلامەکە نێردرا', ar: '!تم إرسال الإعلان' },
  'New Ad Submitted': { ckb: 'ڕیکلامی نوێ نێردرا', ar: 'تم إرسال إعلان جديد' },
  'Payment Receipt Uploaded': { ckb: 'پسوولەی پارەدان بارکرا', ar: 'تم رفع إيصال الدفع' },
  'Content Approved! 🎉': { ckb: 'ناوەڕۆک پەسەندکرا! 🎉', ar: 'تمت الموافقة على المحتوى! 🎉' },
  'Extension Payment Received': { ckb: 'پارەی درێژکردنەوە وەرگیرا', ar: 'تم استلام دفعة التمديد' },
  'Ad Extended Successfully! 🎉': { ckb: 'ڕیکلام بە سەرکەوتوویی درێژکرایەوە! 🎉', ar: 'تم تمديد الإعلان بنجاح! 🎉' },
  'Extension Failed ❌': { ckb: 'درێژکردنەوە سەرکەوتوو نەبوو ❌', ar: 'فشل التمديد ❌' },
  'Extension Payment Invalid ⚠️': { ckb: 'پارەی درێژکردنەوە نادروستە ⚠️', ar: 'دفعة التمديد غير صالحة ⚠️' },
  'Payment Verified ✅': { ckb: 'پارەدان پشتڕاستکرایەوە ✅', ar: 'تم التحقق من الدفع ✅' },
  '🎉 Your Ad is Now Live!': { ckb: '🎉 ڕیکلامەکەت ئێستا چالاکە!', ar: '🎉 إعلانك الآن مباشر!' },
  '✅ Campaign Completed': { ckb: '✅ کەمپینەکە تەواو بوو', ar: '✅ اكتملت الحملة' },
  '⚠️ Ad Rejected': { ckb: '⚠️ ڕیکلامەکە ڕەتکرایەوە', ar: '⚠️ تم رفض الإعلان' },
  'Invalid Transaction ID ⚠️': { ckb: '⚠️ ناسنامەی مامەڵە هەڵەیە', ar: '⚠️ معرف المعاملة غير صالح' },
  '💰 New Payment Receipt Uploaded': { ckb: '💰 وەسڵی پارەدانی نوێ بارکرا', ar: '💰 تم رفع إيصال دفع جديد' },
  '📈 Extension Approved!': { ckb: '📈 درێژکردنەوە پەسەندکرا!', ar: '📈 تمت الموافقة على التمديد!' },
  '✨ Special Offer Applied': { ckb: '✨ ئۆفەری تایبەت جێبەجێ کرا', ar: '✨ تم تطبيق العرض الخاص' },
  'Balance Added ✅': { ckb: 'باڵانس زیادکرا ✅', ar: 'تمت إضافة الرصيد ✅' },
  'Balance Deducted': { ckb: 'باڵانس کەمکرایەوە', ar: 'تم خصم الرصيد' },
  'Balance Request Rejected ❌': { ckb: 'داواکاری باڵانس ڕەتکرایەوە ❌', ar: 'تم رفض طلب الرصيد ❌' },
};

const messagePatterns: Array<{
  regex: RegExp;
  ckb: (m: RegExpMatchArray) => string;
  ar: (m: RegExpMatchArray) => string;
}> = [
  {
    regex: /Your receipt for "(.+?)" has been received/,
    ckb: (m) => `وەسڵەکەت بۆ "${m[1]}" وەرگیرا و لەژێر پشکنینە.`,
    ar: (m) => `تم استلام إيصالك لـ "${m[1]}" وهو قيد المراجعة.`,
  },
  {
    regex: /Your ad "(.+?)" has been submitted to TikTok/,
    ckb: (m) => `ڕیکلامەکەت "${m[1]}" نێردرا بۆ تیکتۆک و چاوەڕوانی پشکنینە.`,
    ar: (m) => `تم إرسال إعلانك "${m[1]}" إلى تيك توك وهو بانتظار المراجعة.`,
  },
  {
    regex: /^(.+)\s+has uploaded a payment receipt for ad\s*"(.+)"\s*\(ID:\s*(.+)\)\.?\s*Click to verify and launch the ad\.?$/i,
    ckb: (m) => `${m[1]} پسوولەی پارەدانی بۆ ڕیکلامی "${m[2]}" (ئایدی: ${m[3]}) بارکردووە. کلیک بکە بۆ پشتڕاستکردنەوە و دەستپێکردنی ڕیکلامەکە`,
    ar: (m) => `قام ${m[1]} برفع إيصال الدفع للإعلان "${m[2]}" (المعرف: ${m[3]}). انقر للتحقق وإطلاق الإعلان`,
  },
  {
    regex: /^(.+)\s+has submitted a new ad\s*"(.+)"\s*\(ID:\s*(.+)\)\.?\s*Click to review content before payment\.?$/i,
    ckb: (m) => `${m[1]} ڕیکلامی نوێی "${m[2]}" (ئایدی: ${m[3]}) نێردووە. کلیک بکە بۆ پێداچوونەوە پێش پارەدان`,
    ar: (m) => `قام ${m[1]} بإرسال إعلان جديد "${m[2]}" (المعرف: ${m[3]}). انقر لمراجعة المحتوى قبل الدفع`,
  },
  {
    regex: /Your content for "(.+?)" is approved/,
    ckb: (m) => `ناوەڕۆکەکەت بۆ "${m[1]}" پەسەندکرا! تکایە پارەدان تەواو بکە.`,
    ar: (m) => `تمت الموافقة على محتواك لـ "${m[1]}"! يرجى إكمال الدفع.`,
  },
  {
    regex: /Your ad "(.+?)" has been extended by (\d+) day/,
    ckb: (m) => `ڕیکلامەکەت "${m[1]}" بۆ ${m[2]} ڕۆژ درێژکرایەوە.`,
    ar: (m) => `تم تمديد إعلانك "${m[1]}" لمدة ${m[2]} يوم.`,
  },
  {
    regex: /Your extension payment for "(.+?)" \(\+(\d+) days?\) is under review/,
    ckb: (m) => `پارەی درێژکردنەوەت بۆ "${m[1]}" (+${m[2]} ڕۆژ) لەژێر پشکنینە.`,
    ar: (m) => `دفعة التمديد الخاصة بك لـ "${m[1]}" (+${m[2]} يوم) قيد المراجعة.`,
  },
  // Failed to extend — backend puts raw API text in group 2; never append group 2 for user display (owner sees raw via modal sanitization)
  {
    regex: /Failed to extend "(.+?)":/,
    ckb: (m) => `نەتوانرا ڕیکلام "${m[1]}" درێژ بکرێتەوە. تکایە دواتر هەوڵ بدەرەوە یان پەیوەندی بە پاڵپشتی بکەن.`,
    ar: (m) => `تعذر تمديد الإعلان "${m[1]}". يرجى المحاولة لاحقاً أو التواصل مع الدعم.`,
  },
  {
    regex: /The payment for extending "(.+?)" could not be verified/,
    ckb: (m) => `پارەدان بۆ درێژکردنەوەی "${m[1]}" پشتڕاست نەکرایەوە. تکایە دووبارە هەوڵبدە.`,
    ar: (m) => `تعذر التحقق من الدفع لتمديد "${m[1]}". يرجى المحاولة مرة أخرى.`,
  },
  {
    regex: /"(.+?)" is now running on TikTok/,
    ckb: (m) => `"${m[1]}" ئێستا لەسەر تیکتۆک دەخولێت.`,
    ar: (m) => `"${m[1]}" يعمل الآن على تيك توك.`,
  },
  {
    regex: /Your ad "(.+?)" has finished running/,
    ckb: (m) => `ڕیکلامەکەت "${m[1]}" تەواو بوو.`,
    ar: (m) => `انتهى إعلانك "${m[1]}".`,
  },
  // Campaign finished + final spend + invoice (common backend English)
  {
    regex: /Your ad "(.+?)" has finished\.?\s*Final spend:\s*\$?([\d,.]+)\.?\s*Invoice generated/i,
    ckb: (m) => `ڕیکلامەکەت "${m[1]}" تەواو بوو. کۆی خەرجی کۆتایی: $${m[2]}. پسوولە دروستکرا.`,
    ar: (m) => `انتهى إعلانك "${m[1]}". الإنفاق النهائي: $${m[2]}. تم إنشاء الفاتورة.`,
  },
  {
    regex: /Your ad "(.+?)" has finished/i,
    ckb: (m) => `ڕیکلامەکەت "${m[1]}" تەواو بوو.`,
    ar: (m) => `انتهى إعلانك "${m[1]}".`,
  },
  {
    regex: /Final spend:\s*\$?([\d,.]+)/i,
    ckb: (m) => `کۆی خەرجی کۆتایی: $${m[1]}`,
    ar: (m) => `الإنفاق النهائي: $${m[1]}`,
  },
  {
    regex: /Invoice generated/i,
    ckb: () => 'پسوولە دروستکرا.',
    ar: () => 'تم إنشاء الفاتورة.',
  },
  // Extension applied / checking (English → CKB)
  {
    regex: /Extension (is )?being applied/i,
    ckb: () => 'درێژکردنەوە جێبەجێ دەکرێت...',
    ar: () => 'جارٍ تطبيق التمديد...',
  },
  {
    regex: /extension (is )?under review|under review/i,
    ckb: () => 'درێژکردنەوە لەژێر پشکنینە.',
    ar: () => 'التمديد قيد المراجعة.',
  },
  {
    regex: /Your ad "(.+?)" was rejected/,
    ckb: (m) => `ڕیکلامەکەت "${m[1]}" ڕەتکرایەوە.`,
    ar: (m) => `تم رفض إعلانك "${m[1]}".`,
  },
  {
    regex: /Transaction ID for "(.+?)" could not be verified/,
    ckb: (m) => `ناسنامەی مامەڵە بۆ "${m[1]}" پشتڕاست نەکرایەوە. تکایە دووبارە بینووسە.`,
    ar: (m) => `تعذر التحقق من معرف المعاملة لـ "${m[1]}". يرجى إعادة الإدخال.`,
  },
  {
    regex: /IQD ([0-9,]+) has been added to your wallet/,
    ckb: (m) => `IQD ${m[1]} زیادکرا بۆ جزدانەکەت`,
    ar: (m) => `تمت إضافة IQD ${m[1]} إلى محفظتك`,
  },
  {
    regex: /IQD ([0-9,]+) has been deducted from your wallet/,
    ckb: (m) => `IQD ${m[1]} کەمکرایەوە لە جزدانەکەت`,
    ar: (m) => `تم خصم IQD ${m[1]} من محفظتك`,
  },
  {
    regex: /Your balance request of (.+?) IQD has been approved\. \$(.+?) has been added to your wallet\./,
    ckb: (m) => `داواکاری باڵانسی ${m[1]} IQD پەسەندکرا. IQD ${m[1]} زیادکرا بۆ جزدانەکەت.`,
    ar: (m) => `تمت الموافقة على طلب رصيدك بقيمة ${m[1]} IQD. تمت إضافة IQD ${m[1]} إلى محفظتك.`,
  },
  {
    regex: /\$(.+?) has been added to your wallet by admin\./,
    ckb: (m) => `IQD ${m[1]} لەلایەن ئەدمین زیادکرا بۆ جزدانەکەت.`,
    ar: (m) => `تمت إضافة IQD ${m[1]} إلى محفظتك بواسطة المشرف.`,
  },
  {
    regex: /Your balance request of (.+?) IQD was rejected\. Reason: (.+)/,
    ckb: (m) => `داواکاری باڵانسی ${m[1]} IQD ڕەتکرایەوە. هۆکار: ${m[2]}`,
    ar: (m) => `تم رفض طلب رصيدك بقيمة ${m[1]} IQD. السبب: ${m[2]}`,
  },
  // Wallet refund when ad is rejected
  {
    regex: /Your ad "(.+?)" was rejected\. Reason: (.+?) \$([\d.,]+) has been refunded to your wallet\./i,
    ckb: (m) => `ڕیکلامەکەت "${m[1]}" ڕەتکرایەوە. هۆکار: ${m[2]} $${m[3]} گەڕێندرایەوە بۆ جزدانەکەت.`,
    ar: (m) => `تم رفض إعلانك "${m[1]}". السبب: ${m[2]} تم رد مبلغ $${m[3]} إلى محفظتك.`,
  },
  {
    regex: /has been refunded to your wallet/i,
    ckb: () => 'گەڕێندرایەوە بۆ جزدانەکەت.',
    ar: () => 'تم رد المبلغ إلى محفظتك.',
  },
];

export function translateNotification(
  title: string,
  message: string,
  language: 'ckb' | 'ar' | 'en'
): { title: string; message: string } {
  const safeTitle = title != null ? String(title) : '';
  const safeMessage = message != null ? String(message) : '';
  if (language === 'en') return { title: safeTitle, message: safeMessage };
  // Backend now sends Kurdish balance notifications; pass through without re-translating
  if (safeTitle.includes('باڵانس زیادکرا') || safeTitle.includes('داواکاری باڵانس')) {
    return { title: safeTitle, message: safeMessage };
  }
  const translatedTitle = titleMap[safeTitle.trim()]?.[language] ?? safeTitle;
  let translatedMessage = safeMessage;
  for (const pattern of messagePatterns) {
    const match = safeMessage.match(pattern.regex);
    if (match) {
      translatedMessage = language === 'ckb' ? pattern.ckb(match) : pattern.ar(match);
      break;
    }
  }
  return { title: translatedTitle || safeTitle, message: translatedMessage || safeMessage };
}

export function translateNotificationTitle(title: string, language: 'ckb' | 'ar' | 'en'): string {
  if (language === 'en' || !title) return title || '';
  return titleMap[title.trim()]?.[language] ?? title;
}

export function translateNotificationMessage(message: string, language: 'ckb' | 'ar' | 'en'): string {
  if (language === 'en' || !message) return message || '';
  const trimmed = (message || '').trim();
  for (const pattern of messagePatterns) {
    const match = trimmed.match(pattern.regex);
    if (match) return language === 'ckb' ? pattern.ckb(match) : pattern.ar(match);
  }
  return trimmed;
}
