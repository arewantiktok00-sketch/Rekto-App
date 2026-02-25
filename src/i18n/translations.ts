/**
 * All translation keys — ckb and ar only (no English).
 * Merges spec keys with full locale coverage from ckb.json / ar.json.
 */

import arLocale from '@/locales/ar.json';
import ckbLocale from '@/locales/ckb.json';

export type LocaleKey = 'ckb' | 'ar';

const spec: Record<string, { ckb: string; ar: string }> = {
  goodMorning: { ckb: 'بەیانیت باش،', ar: 'صباح الخير،' },
  walletBalance: { ckb: 'باڵانسی جزدان', ar: 'رصيد المحفظة' },
  topUpWallet: { ckb: 'پڕکردنەوەی جزدان', ar: 'شحن المحفظة' },
  loading: { ckb: 'چاوەڕوانبە...', ar: 'جاري التحميل...' },
  home: { ckb: 'سەرەکی', ar: 'الرئيسية' },
  campaigns: { ckb: 'کامپەینەکان', ar: 'الحملات' },
  create: { ckb: 'دروستکردن', ar: 'إنشاء' },
  analytics: { ckb: 'شیکاری', ar: 'التحليلات' },
  communication: { ckb: 'پەیوەندی', ar: 'التواصل' },
  profile: { ckb: 'پرۆفایل', ar: 'الملف الشخصي' },
  tutorial: { ckb: 'فێرکاری', ar: 'الدليل' },
  createNewAd: { ckb: 'دروستکردنی ڕیکلام', ar: 'إنشاء إعلان جديد' },
  totalSpend: { ckb: 'کۆی خەرجی', ar: 'إجمالي الإنفاق' },
  totalViews: { ckb: 'کۆی بینین', ar: 'إجمالي المشاهدات' },
  activeCampaigns: { ckb: 'کامپەینە چالاکەکان', ar: 'الحملات النشطة' },
  totalLeads: { ckb: 'کۆی لیدەکان', ar: 'إجمالي العملاء المحتملين' },
  myCampaigns: { ckb: 'کامپەینەکانم', ar: 'حملاتي' },
  seeAll: { ckb: 'بینینی هەموو', ar: 'عرض الكل' },
  noCampaigns: { ckb: 'هیچ کامپەینێک نییە', ar: 'لا توجد حملات بعد' },
  createFirstAd: { ckb: 'یەکەم ڕیکلامەکەت دروست بکە', ar: 'أنشئ إعلانك الأول' },
  createAd: { ckb: 'دروستکردنی ڕیکلام', ar: 'إنشاء إعلان' },
  selectObjective: { ckb: 'ئامانج هەڵبژێرە', ar: 'اختر الهدف' },
  targetAudience: { ckb: 'ئامانجی بینەر', ar: 'الجمهور المستهدف' },
  budgetDuration: { ckb: 'بودجە و ماوە', ar: 'الميزانية والمدة' },
  next: { ckb: 'دواتر', ar: 'التالي' },
  back: { ckb: 'گەڕانەوە', ar: 'رجوع' },
  continue: { ckb: 'بەردەوامبوون', ar: 'متابعة' },
  welcomeBack: { ckb: 'بەخێربێیتەوە', ar: 'مرحباً بعودتك' },
  signInToContinue: { ckb: 'چوونەژوورەوە بۆ بەڕێوەبردنی ڕیکلامەکانت', ar: 'سجل الدخول لمتابعة إدارة إعلاناتك' },
  email: { ckb: 'ئیمەیڵ', ar: 'البريد الإلكتروني' },
  password: { ckb: 'تێپەڕەوشە', ar: 'كلمة المرور' },
  forgotPassword: { ckb: 'تێپەڕەوشەت بیرچووەتەوە?', ar: 'نسيت كلمة المرور؟' },
  login: { ckb: 'چوونەژوورەوە', ar: 'تسجيل الدخول' },
  dontHaveAccount: { ckb: 'هەژمارت نییە?', ar: 'ليس لديك حساب؟' },
  signUp: { ckb: 'تۆمارکردن', ar: 'إنشاء حساب' },
  loginFailed: { ckb: 'چوونەژوورەوە سەرنەکەوت', ar: 'فشل تسجيل الدخول' },
  createAccount: { ckb: 'دروستکردنی هەژمار', ar: 'إنشاء حساب' },
  startRunningAds: { ckb: 'لە چەند خولەکێکدا ڕیکلامی تیکتۆک دەست پێ بکە', ar: 'ابدأ بتشغيل إعلانات تيك توك في دقائق' },
  fullName: { ckb: 'ناوی تەواو', ar: 'الاسم الكامل' },
  minCharacters: { ckb: 'کەمتر نەبێت لە ٨ پیت', ar: 'الحد الأدنى 8 أحرف' },
  alreadyHaveAccount: { ckb: 'پێشتر هەژمارت هەیە?', ar: 'لديك حساب بالفعل؟' },
  termsOfService: { ckb: 'مەرجەکانی خزمەتگوزاری', ar: 'شروط الخدمة' },
  privacyPolicy: { ckb: 'سیاسەتی تایبەتمەندی', ar: 'سياسة الخصوصية' },
  and: { ckb: 'و', ar: 'و' },
  settings: { ckb: 'ڕێکخستنەکان', ar: 'الإعدادات' },
  language: { ckb: 'زمان', ar: 'اللغة' },
  notifications: { ckb: 'ئاگادارییەکان', ar: 'الإشعارات' },
  account: { ckb: 'هەژمار', ar: 'الحساب' },
  personalInfo: { ckb: 'زانیاری کەسی', ar: 'المعلومات الشخصية' },
  myLinks: { ckb: 'لینکەکانم', ar: 'روابطي' },
  walletAndBalance: { ckb: 'جزدان و باڵانس', ar: 'المحفظة والرصيد' },
  paymentMethods: { ckb: 'شێوازی پارەدان', ar: 'طرق الدفع' },
  billing: { ckb: 'پارەدان', ar: 'الفواتير' },
  transactionHistory: { ckb: 'مێژووی مامەڵەکان', ar: 'سجل المعاملات' },
  preferences: { ckb: 'ڕێکخستنەکان', ar: 'التفضيلات' },
  privacySecurity: { ckb: 'تایبەتمەندی و پاراستن', ar: 'الخصوصية والأمان' },
  support: { ckb: 'پشتگیری', ar: 'الدعم' },
  helpSupport: { ckb: 'یارمەتی و پشتگیری', ar: 'المساعدة والدعم' },
  logout: { ckb: 'دەرچوون', ar: 'تسجيل الخروج' },
  appearance: { ckb: 'ڕووکار', ar: 'المظهر' },
  darkMode: { ckb: 'دۆخی تاریک', ar: 'الوضع الداكن' },
  lightMode: { ckb: 'دۆخی ڕووناک', ar: 'الوضع الفاتح' },
  systemDefault: { ckb: 'بەپێی سیستەم', ar: 'حسب النظام' },
  selectLanguage: { ckb: 'زمان هەڵبژێرە', ar: 'اختر اللغة' },
  currentLanguage: { ckb: 'زمانی ئێستا', ar: 'اللغة الحالية' },
  saveChanges: { ckb: 'پاشەکەوتکردنی گۆڕانکاری', ar: 'حفظ التغييرات' },
  changePassword: { ckb: 'گۆڕینی تێپەڕەوشە', ar: 'تغيير كلمة المرور' },
  deleteAccount: { ckb: 'سڕینەوەی هەژمار', ar: 'حذف الحساب' },
  faq: { ckb: 'پرسیارە باوەکان', ar: 'الأسئلة الشائعة' },
  active: { ckb: 'چالاک', ar: 'نشطة' },
  pending: { ckb: 'چاوەڕوان', ar: 'قيد الانتظار' },
  inReview: { ckb: 'لە پشکنیندا', ar: 'قيد المراجعة' },
  completed: { ckb: 'تەواوبوو', ar: 'مكتملة' },
  paused: { ckb: 'وەستێنراو', ar: 'متوقفة مؤقتاً' },
  failed: { ckb: 'سەرنەکەوتوو', ar: 'فشلت' },
  rejected: { ckb: 'ڕەتکراوەتەوە', ar: 'مرفوضة' },
  ads: { ckb: 'ڕیکلام', ar: 'إعلانات' },
  links: { ckb: 'لینکەکان', ar: 'الروابط' },
  learn: { ckb: 'فێربوون', ar: 'تعلم' },
  phoneNumber: { ckb: 'ژمارەی مۆبایل', ar: 'رقم الهاتف' },
  all: { ckb: 'هەموو', ar: 'الكل' },
  male: { ckb: 'پیاو', ar: 'ذكر' },
  female: { ckb: 'ئافرەت', ar: 'أنثى' },
  arab: { ckb: 'عەرەب', ar: 'عربي' },
  kurdish: { ckb: 'کوردی', ar: 'كردي' },
  dailyBudget: { ckb: 'بودجەی ڕۆژانە', ar: 'الميزانية اليومية' },
  days: { ckb: 'ڕۆژ', ar: 'أيام' },
  total: { ckb: 'کۆی گشتی', ar: 'الإجمالي' },
  tax: { ckb: 'باج', ar: 'الضريبة' },
  subtotal: { ckb: 'کۆی لاوەکی', ar: 'المجموع الفرعي' },
  submitForReview: { ckb: 'ناردن بۆ پشکنین', ar: 'إرسال للمراجعة' },
  error: { ckb: 'هەڵە', ar: 'خطأ' },
  somethingWentWrong: { ckb: 'هەڵەیەک ڕوویدا. تکایە دووبارە هەوڵ بدەوە.', ar: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.' },
  markAllRead: { ckb: 'هەموو وەک خوێندراوە', ar: 'تحديد الكل كمقروء' },
  noNotificationsYet: { ckb: 'هیچ ئاگادارییەک نییە', ar: 'لا توجد إشعارات بعد' },
  tutorials: { ckb: 'فێرکارییەکان', ar: 'الدروس التعليمية' },
  noLinksYet: { ckb: 'هیچ لینکێکت نییە', ar: 'لا توجد روابط بعد' },
  createNewLink: { ckb: 'لینکی نوێ دروست بکە', ar: 'إنشاء رابط جديد' },
  adminPanel: { ckb: 'پانێڵی بەڕێوەبەر', ar: 'لوحة الإدارة' },
  adReview: { ckb: 'پشکنینی ڕیکلام', ar: 'مراجعة الإعلانات' },
  campaignLogs: { ckb: 'تۆمارەکانی کامپەین', ar: 'سجلات الحملات' },
  userManagement: { ckb: 'بەڕێوەبردنی بەکارهێنەر', ar: 'إدارة المستخدمين' },
  admins: { ckb: 'بەڕێوەبەرەکان', ar: 'المسؤولين' },
  pauseAd: { ckb: 'وەستاندنی ڕیکلام', ar: 'إيقاف الإعلان' },
  boostAgain: { ckb: 'بەهێزکردنەوە', ar: 'تعزيز مرة أخرى' },
  payNow: { ckb: 'ئێستا پارە بدە', ar: 'ادفع الآن' },
  awaitingPayment: { ckb: 'چاوەڕوانی پارەدان', ar: 'في انتظار الدفع' },
  contactUs: { ckb: 'پەیوەندیمان پێوە بکە', ar: 'اتصل بنا' },
};

const ckbRecord = ckbLocale as Record<string, string>;
const arRecord = arLocale as Record<string, string>;
const allKeys = new Set([...Object.keys(spec), ...Object.keys(ckbRecord), ...Object.keys(arRecord)]);

export const translations: Record<string, { ckb: string; ar: string }> = {};
for (const key of allKeys) {
  if (spec[key]) {
    translations[key] = spec[key];
  } else {
    translations[key] = {
      ckb: ckbRecord[key] ?? key,
      ar: arRecord[key] ?? key,
    };
  }
}

export function getTranslation(key: string, locale: LocaleKey): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[locale] ?? key;
}
