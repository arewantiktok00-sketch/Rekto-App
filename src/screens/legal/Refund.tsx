import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { spacing, borderRadius } from '@/theme/spacing';
import { useLanguage } from '@/contexts/LanguageContext';
import { Text } from '@/components/common/Text';

export function Refund() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { language, isRTL } = useLanguage();
  const styles = createStyles(colors, isRTL);
  const content = useMemo(() => ({
    en: {
      headerTitle: 'Refund Policy',
      back: 'Back',
      introTitle: 'Overview',
      introText:
        'At Rekto, we strive to provide high-quality digital marketing services to all our clients. This Refund Policy outlines the conditions under which refunds may be requested and processed.',
      serviceTitle: 'Service-Based Refunds',
      serviceIntro: 'Our refund policy varies depending on the type of service provided:',
      serviceList: [
        'Consultation Services: Full refund if cancelled at least 24 hours before the scheduled consultation',
        'Campaign Management: Prorated refund for unused service period if cancelled before campaign launch',
        'Advertising Spend: Refunds for unused advertising budget may be processed minus any applicable fees',
      ],
      eligibilityTitle: 'Eligibility for Refunds',
      eligibilityIntro: 'Refunds may be considered under the following circumstances:',
      eligibilityList: [
        'Services were not delivered as described in the service agreement',
        'Technical issues on our end prevented service delivery',
        'Cancellation request submitted before work commenced',
        'Duplicate payments or billing errors',
      ],
      nonRefundTitle: 'Non-Refundable Items',
      nonRefundIntro: 'The following are generally not eligible for refunds:',
      nonRefundList: [
        'Advertising spend already utilized on platforms',
        'Completed consultation sessions',
        'Custom creative work already delivered',
        'Services where work has substantially commenced',
      ],
      requestTitle: 'How to Request a Refund',
      requestIntro: 'To request a refund, please follow these steps:',
      requestList: [
        'Contact us at contact@rekto.net with your refund request',
        'Include your client ID or invoice number',
        'Explain the reason for your refund request',
        'Provide any relevant documentation',
      ],
      processingTitle: 'Processing Time',
      processingText:
        'Refund requests are typically reviewed within 5-7 business days. If approved, refunds will be processed within 10-14 business days and returned via the original payment method when possible.',
      disputeTitle: 'Dispute Resolution',
      disputeText:
        'If you are not satisfied with our refund decision, please contact us to discuss the matter further. We are committed to finding a fair resolution for all parties.',
      contactTitle: 'Contact Us',
      contactLines: [
        'Rekto',
        'Email: contact@rekto.net',
        'Website: rekto.net',
        'Erbil, Kurdistan Region, Iraq',
      ],
    },
    ckb: {
      headerTitle: 'سیاسەتی گەڕاندنەوەی پارە',
      back: 'گەڕانەوە',
      introTitle: 'پوختە',
      introText:
        'لە ڕێکتۆدا، ئێمە هەوڵ دەدەین خزمەتگوزارییە بازرگانییە دیجیتاڵییەکانی بەجۆرێکی باش پێشکەش بکەین. ئەم سیاسەتی گەڕاندنەوەی پارەیە ڕوون دەکاتەوە ئەو دۆخانەی کە داوای گەڕاندنەوەی پارە دەکرێت.',
      serviceTitle: 'گەڕاندنەوەی پارە بە پێی خزمەتگوزاری',
      serviceIntro: 'سیاسەتی گەڕاندنەوەی پارە پەیوەستە بە جۆری خزمەتگوزاری:',
      serviceList: [
        'ڕاوێژکاری: گەڕاندنەوەی تەواو ئەگەر لە ٢٤ کاتژمێر پێش کاتی ڕاوێژ داوا بکرێت',
        'بەڕێوەبردنی کەمپەین: گەڕاندنەوەی بەشێکی پارە بۆ ماوەی نەبەکارهاتوو ئەگەر پێش دەستپێکردن هەڵوەشێندرێت',
        'خەرجی ڕیکلام: گەڕاندنەوەی پارەی نەبەکارهاتوو لەگەڵ کەمکردنەوەی هەر خەرجێکی پەیوەست',
      ],
      eligibilityTitle: 'هەلەبژاردنی گەڕاندنەوەی پارە',
      eligibilityIntro: 'لەمانەی خوارەوەدا داواکان بۆ گەڕاندنەوەی پارە دەکرێن:',
      eligibilityList: [
        'خزمەتگوزارییەکان بە پێی ڕێککەوتن پێشکەش نەکراون',
        'کێشەی تەکنیکی لەلایەن ئێمە مانع بووە لە پێشکەشکردنی خزمەتگوزاری',
        'داوای هەڵوەشاندنەوە پێش دەستپێکردنی کار نێردراوە',
        'پارەدان دووبارە یان هەڵەی بڕی پارەدان',
      ],
      nonRefundTitle: 'نەگونجاو بۆ گەڕاندنەوە',
      nonRefundIntro: 'ئەم بڕانەی خوارەوە بە گشتی ناگونجێن بۆ گەڕاندنەوە:',
      nonRefundList: [
        'خەرجی ڕیکلام کە لە پلاتفۆرمەکان بەکارهاتووە',
        'دانیشتنی ڕاوێژی تەواوبوو',
        'کاری دروستکردنی ناوەڕۆکی تایبەت کە پێشکەش کراوە',
        'خزمەتگوزارییەکان کە کارکردن لەسەرەیان بە شێوەی جێگیر دەستی پێکردووە',
      ],
      requestTitle: 'چۆن داوای گەڕاندنەوە بکەیت',
      requestIntro: 'بۆ داواکردنی گەڕاندنەوەی پارە، ئەمانە جێبەجێ بکە:',
      requestList: [
        'پەیوەندی بکە بە contact@rekto.net و داواکە بنێرە',
        'ژمارەی کڕیار یان ژمارەی فاکتۆرەکەت بنوسە',
        'هۆکاری داواکە ڕوون بکە',
        'هەر بەڵگەیەکی پەیوەست پێشکەش بکە',
      ],
      processingTitle: 'ماوەی پرۆسەکردن',
      processingText:
        'داواکان بە گشتی لە ٥-٧ ڕۆژی کارییەوە پشکنین دەکرێن. ئەگەر پەسەند کرا، لە ١٠-١٤ ڕۆژی کارییەوە پارەکە دەگەڕێندرێتەوە بە هەمان شێوەی پارەدان ئەگەر ئاسایی بێت.',
      disputeTitle: 'چارەسەری ناکۆکی',
      disputeText:
        'ئەگەر ڕازی نیت بە بڕی داوا، تکایە پەیوەندی بکە بۆ گفتوگۆ. ئێمە پابەندین بە دۆزینەوەی چارەسەرێکی دادپەروەرانە.',
      contactTitle: 'پەیوەندی پێوە',
      contactLines: [
        'ڕێکتۆ',
        'ئیمەیڵ: contact@rekto.net',
        'ماڵپەڕ: rekto.net',
        'هەولێر، هەرێمی کوردستان، عێراق',
      ],
    },
    ar: {
      headerTitle: 'سياسة الاسترداد',
      back: 'رجوع',
      introTitle: 'نظرة عامة',
      introText:
        'في ريكتو، نسعى لتقديم خدمات تسويق رقمي عالية الجودة لجميع عملائنا. توضح سياسة الاسترداد هذه الشروط التي يمكن بموجبها طلب الاسترداد ومعالجته.',
      serviceTitle: 'الاسترداد حسب نوع الخدمة',
      serviceIntro: 'تختلف سياسة الاسترداد حسب نوع الخدمة المقدمة:',
      serviceList: [
        'خدمات الاستشارة: استرداد كامل إذا تم الإلغاء قبل 24 ساعة على الأقل من موعد الاستشارة',
        'إدارة الحملات: استرداد نسبي للمدة غير المستخدمة إذا تم الإلغاء قبل إطلاق الحملة',
        'الإنفاق الإعلاني: قد تتم معالجة استرداد الميزانية غير المستخدمة مع خصم أي رسوم مطبقة',
      ],
      eligibilityTitle: 'الأهلية للاسترداد',
      eligibilityIntro: 'يمكن النظر في طلبات الاسترداد في الحالات التالية:',
      eligibilityList: [
        'لم يتم تقديم الخدمات كما هو موضح في اتفاقية الخدمة',
        'مشاكل تقنية من جانبنا منعت تقديم الخدمة',
        'تم تقديم طلب الإلغاء قبل بدء العمل',
        'دفعات مكررة أو أخطاء في الفوترة',
      ],
      nonRefundTitle: 'عناصر غير قابلة للاسترداد',
      nonRefundIntro: 'العناصر التالية ليست مؤهلة للاسترداد عادةً:',
      nonRefundList: [
        'الإنفاق الإعلاني المستخدم بالفعل على المنصات',
        'جلسات الاستشارة المكتملة',
        'الأعمال الإبداعية المخصصة التي تم تسليمها',
        'الخدمات التي بدأ العمل فيها بشكل كبير',
      ],
      requestTitle: 'كيفية طلب الاسترداد',
      requestIntro: 'لطلب الاسترداد، يرجى اتباع الخطوات التالية:',
      requestList: [
        'تواصل معنا على contact@rekto.net مع طلب الاسترداد',
        'أدخل رقم العميل أو رقم الفاتورة',
        'اشرح سبب طلب الاسترداد',
        'قدّم أي مستندات ذات صلة',
      ],
      processingTitle: 'مدة المعالجة',
      processingText:
        'تُراجع طلبات الاسترداد عادةً خلال 5-7 أيام عمل. إذا تمت الموافقة، سيتم معالجة الاسترداد خلال 10-14 يوم عمل وإرجاعه عبر طريقة الدفع الأصلية عندما يكون ذلك ممكناً.',
      disputeTitle: 'حل النزاعات',
      disputeText:
        'إذا لم تكن راضياً عن قرار الاسترداد، يرجى التواصل معنا لمناقشة الأمر. نحن ملتزمون بإيجاد حل عادل لجميع الأطراف.',
      contactTitle: 'تواصل معنا',
      contactLines: [
        'ريكتو',
        'البريد الإلكتروني: contact@rekto.net',
        'الموقع: rekto.net',
        'أربيل، إقليم كردستان، العراق',
      ],
    },
  }), []);
  const localized = content[language as 'ckb' | 'ar'] || content.ckb;

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Index' as never);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={localized.headerTitle} onBack={handleBack} style={{ paddingTop: insets.top + 16 }} />

      <ScrollView style={styles.content} contentContainerStyle={[styles.contentContainer, { paddingHorizontal: 16, paddingBottom: 40 }]}>
        <View style={styles.heroCard}>
          <Text style={[styles.heroTitle, isRTL && styles.textRTL]} weight="bold">{localized.introTitle}</Text>
          <Text style={[styles.heroText, isRTL && styles.textRTL]}>{localized.introText}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]} weight="semiBold">{localized.serviceTitle}</Text>
          <Text style={[styles.text, isRTL && styles.textRTL]}>{localized.serviceIntro}</Text>
          {localized.serviceList.map((item) => (
            <Text key={item} style={[styles.bullet, isRTL && styles.textRTL]}>• {item}</Text>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]} weight="semiBold">{localized.eligibilityTitle}</Text>
          <Text style={[styles.text, isRTL && styles.textRTL]}>{localized.eligibilityIntro}</Text>
          {localized.eligibilityList.map((item) => (
            <Text key={item} style={[styles.bullet, isRTL && styles.textRTL]}>• {item}</Text>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]} weight="semiBold">{localized.nonRefundTitle}</Text>
          <Text style={[styles.text, isRTL && styles.textRTL]}>{localized.nonRefundIntro}</Text>
          {localized.nonRefundList.map((item) => (
            <Text key={item} style={[styles.bullet, isRTL && styles.textRTL]}>• {item}</Text>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]} weight="semiBold">{localized.requestTitle}</Text>
          <Text style={[styles.text, isRTL && styles.textRTL]}>{localized.requestIntro}</Text>
          {localized.requestList.map((item) => (
            <Text key={item} style={[styles.bullet, isRTL && styles.textRTL]}>• {item}</Text>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]} weight="semiBold">{localized.processingTitle}</Text>
          <Text style={[styles.text, isRTL && styles.textRTL]}>{localized.processingText}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]} weight="semiBold">{localized.disputeTitle}</Text>
          <Text style={[styles.text, isRTL && styles.textRTL]}>{localized.disputeText}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]} weight="semiBold">{localized.contactTitle}</Text>
          {localized.contactLines.map((line) => (
            <Text key={line} style={[styles.text, isRTL && styles.textRTL]}>{line}</Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, isRTL?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    paddingTop: spacing.lg,
    backgroundColor: colors.card.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  headerRTL: {
    flexDirection: 'row',
  },
  rowReverse: {
    flexDirection: 'row',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  backButtonWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.foreground.DEFAULT,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  heroCard: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.sm,
  },
  heroText: {
    fontSize: 14,
    color: colors.foreground.muted,
    lineHeight: 22,
  },
  sectionCard: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.sm,
  },
  text: {
    fontSize: 14,
    color: colors.foreground.muted,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  bullet: {
    fontSize: 14,
    color: colors.foreground.muted,
    lineHeight: 22,
    marginBottom: 4,
  },
});
