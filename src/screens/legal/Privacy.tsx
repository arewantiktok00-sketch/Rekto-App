import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { spacing, borderRadius } from '@/theme/spacing';
import { useLanguage } from '@/contexts/LanguageContext';
import { Text } from '@/components/common/Text';

export function Privacy() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { language, isRTL } = useLanguage();
  const styles = createStyles(colors, isRTL);
  const content = useMemo(() => ({
    en: {
      headerTitle: 'Privacy Policy',
      back: 'Back',
      introTitle: 'Introduction',
      introText:
        'Rekto ("we," "our," or "us") is a digital marketing agency based in Iraq, operating the website rekto.net. We are committed to protecting the privacy of our clients and website visitors. This Privacy Policy explains how we collect, use, and protect your personal information.',
      infoTitle: 'Information We Collect',
      infoIntro: 'We collect information that you provide directly to us, including:',
      infoList: [
        'Contact information (name, email address, phone number)',
        'Company or business information',
        'Communication preferences',
        'Information provided through our contact forms',
        'Any other information you choose to provide',
      ],
      useTitle: 'How We Use Your Information',
      useIntro: 'We use the information we collect to:',
      useList: [
        'Respond to your inquiries and provide customer support',
        'Provide our digital marketing services',
        'Communicate with you about our services',
        'Improve our website and services',
        'Comply with legal obligations',
      ],
      sharingTitle: 'Information Sharing',
      sharingText:
        'We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances: with your consent, to comply with legal requirements, to protect our rights and safety, or with service providers who assist us in operating our business (under strict confidentiality agreements).',
      securityTitle: 'Data Security',
      securityText:
        'We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.',
      rightsTitle: 'Your Rights',
      rightsIntro: 'You have the right to:',
      rightsList: [
        'Access the personal information we hold about you',
        'Request correction of inaccurate information',
        'Request deletion of your personal information',
        'Opt-out of marketing communications',
      ],
      cookiesTitle: 'Cookies',
      cookiesText:
        'Our website may use cookies to enhance your browsing experience. Cookies are small text files stored on your device. You can control cookie settings through your browser preferences.',
      changesTitle: 'Changes to This Policy',
      changesText:
        'We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.',
      contactTitle: 'Contact Us',
      contactLines: [
        'Rekto',
        'Email: contact@rekto.net',
        'Website: rekto.net',
        'Erbil, Kurdistan Region, Iraq',
      ],
    },
    ckb: {
      headerTitle: 'سیاسەتی نهێنییەتی',
      back: 'گەڕانەوە',
      introTitle: 'پێشەکی',
      introText:
        'ڕێکتۆ ("ئێمە"، "ئێمەمان"، یان "ئێمە") ئاجەنسی بازاڕکردنی دیجیتاڵیە لە عێراق، کە ماڵپەڕی rekto.net بەڕێوە دەبات. ئێمە پابەندین بە پاراستنی نهێنییەتی کڕیاران و سەردانکاران. ئەم سیاسەتی نهێنییەتییە ڕوون دەکاتەوە چۆن زانیارییە کەسیەکان کۆدەکەینەوە، بەکاردەهێنین و دەپارێزین.',
      infoTitle: 'زانیارییەکان کە کۆدەکەینەوە',
      infoIntro: 'زانیارییەکانی کە ڕاستەوخۆ پێمان دەدەیت کۆدەکەینەوە، وەک:',
      infoList: [
        'زانیاری پەیوەندی (ناو، ئیمەیڵ، ژمارەی مۆبایل)',
        'زانیاری کۆمپانی/کاروبار',
        'هەڵبژاردەکانی پەیوەندی',
        'زانیارییەکانی فۆڕمی پەیوەندیمان',
        'هەر زانیارییەکی تر کە بە هەستیاریت پێمان دەدەیت',
      ],
      useTitle: 'چۆن زانیارییەکان بەکاردەهێنین',
      useIntro: 'زانیارییەکان بەکاردەهێنین بۆ:',
      useList: [
        'وەڵامدانەوەی پرسیارەکانت و پشتیوانی کڕیار',
        'پێشکەشکردنی خزمەتگوزارییە بازرگانییەکانمان',
        'پەیوەندی لەگەڵ تۆ دەکەین لەسەر خزمەتگوزارییەکانمان',
        'باشترکردنی ماڵپەڕ و خزمەتگوزارییەکانمان',
        'پابەندبوون بە داواکارییە یاساییەکان',
      ],
      sharingTitle: 'هاوبەشی زانیاری',
      sharingText:
        'ئێمە زانیارییە کەسیەکانت ناکڕین، ناگۆڕین و بە کرێ نادات. تەنها لەم دۆخەدا دەتوانین زانیاری هاوبەش بکەین: بە ڕەزامەندی تۆ، بۆ پابەندبوون بە داواکاری یاسایی، بۆ پاراستنی ماف و ئەمنیتمان، یان لەگەڵ پێشکەشکارانی خزمەتگوزاری کە یارمەتیمان دەدەەن (بە پێوەندی نهێنیداری).',
      securityTitle: 'پاراستنی زانیاری',
      securityText:
        'ئێمە ڕێکارە تەکنیکی و ڕێکخراوی گونجاو جێبەجێ دەکەین بۆ پاراستنی زانیارییە کەسیەکانت لە دەستگەیشتن، نامە، ئاشکراکردن یان تێکدانی نائاسایی. بەڵام هیچ ڕێگەیەک لە ئینتەرنێتدا ١٠٠٪ دڵنیایی نابەخشێت.',
      rightsTitle: 'مافەکانت',
      rightsIntro: 'تۆ مافت هەیە:',
      rightsList: [
        'دەستگەیشتن بە زانیارییە کەسیەکانت کە لامان هەیە',
        'داوای چاکسازی زانیاری هەڵە بکەیت',
        'داوای سڕینەوەی زانیارییە کەسیەکانت بکەیت',
        'ڕەتکردنەوەی پەیوەندی بازاڕکردن',
      ],
      cookiesTitle: 'کوکیز',
      cookiesText:
        'ماڵپەڕەکەمان دەتوانێت کوکی بەکاربهێنێت بۆ باشترکردنی ئەزمونی سەردانی تۆ. کوکی فایلە بچووکانن کە لەسەر ئامێرەکەت هەڵدەگیرن. دەتوانیت ڕێکخستنی کوکی لە ڕێگەی ڕێکخستنی وێبگەڕەکەت بکەیت.',
      changesTitle: 'نامە لەم سیاسەته‌',
      changesText:
        'لە کاتی خۆیدا دەتوانین ئەم سیاسەته‌ نوێ بکەینەوە. ئاگادارت دەکەینەوە بە دانانی سیاسەتی نوێ لەم پەڕەیە و نوێکردنەوەی بەرواری "دوایین نوێکردنەوە".',
      contactTitle: 'پەیوەندی پێوە',
      contactLines: [
        'ڕێکتۆ',
        'ئیمەیڵ: contact@rekto.net',
        'ماڵپەڕ: rekto.net',
        'هەولێر، هەرێمی کوردستان، عێراق',
      ],
    },
    ar: {
      headerTitle: 'سياسة الخصوصية',
      back: 'رجوع',
      introTitle: 'مقدمة',
      introText:
        'ريكتو ("نحن" أو "خاصتنا") وكالة تسويق رقمي مقرها في العراق وتدير موقع rekto.net. نحن ملتزمون بحماية خصوصية عملائنا وزوار الموقع. توضح سياسة الخصوصية هذه كيفية جمع معلوماتك الشخصية واستخدامها وحمايتها.',
      infoTitle: 'المعلومات التي نجمعها',
      infoIntro: 'نجمع المعلومات التي تقدمها لنا مباشرة، بما في ذلك:',
      infoList: [
        'معلومات الاتصال (الاسم، البريد الإلكتروني، رقم الهاتف)',
        'معلومات الشركة أو العمل',
        'تفضيلات التواصل',
        'المعلومات المقدمة عبر نماذج التواصل',
        'أي معلومات أخرى تختار تقديمها',
      ],
      useTitle: 'كيف نستخدم معلوماتك',
      useIntro: 'نستخدم المعلومات التي نجمعها من أجل:',
      useList: [
        'الرد على استفساراتك وتقديم دعم العملاء',
        'تقديم خدمات التسويق الرقمي الخاصة بنا',
        'التواصل معك حول خدماتنا',
        'تحسين موقعنا وخدماتنا',
        'الامتثال للالتزامات القانونية',
      ],
      sharingTitle: 'مشاركة المعلومات',
      sharingText:
        'لا نبيع أو نتاجر أو نؤجر معلوماتك الشخصية لأطراف ثالثة. قد نشارك معلوماتك فقط في الحالات التالية: بموافقتك، للامتثال للمتطلبات القانونية، لحماية حقوقنا وسلامتنا، أو مع مزودي الخدمة الذين يساعدوننا في تشغيل أعمالنا (بموجب اتفاقيات سرية صارمة).',
      securityTitle: 'أمن البيانات',
      securityText:
        'نطبق تدابير تقنية وتنظيمية مناسبة لحماية معلوماتك الشخصية من الوصول أو التعديل أو الإفصاح أو التدمير غير المصرح به. ومع ذلك، لا توجد طريقة نقل عبر الإنترنت آمنة بنسبة 100٪، ولا يمكننا ضمان الأمان المطلق.',
      rightsTitle: 'حقوقك',
      rightsIntro: 'لديك الحق في:',
      rightsList: [
        'الوصول إلى معلوماتك الشخصية التي نحتفظ بها',
        'طلب تصحيح المعلومات غير الدقيقة',
        'طلب حذف معلوماتك الشخصية',
        'إلغاء الاشتراك في اتصالات التسويق',
      ],
      cookiesTitle: 'ملفات تعريف الارتباط',
      cookiesText:
        'قد يستخدم موقعنا ملفات تعريف الارتباط لتحسين تجربة التصفح. ملفات تعريف الارتباط هي ملفات نصية صغيرة يتم تخزينها على جهازك. يمكنك التحكم في إعدادات ملفات تعريف الارتباط من خلال إعدادات المتصفح.',
      changesTitle: 'التغييرات على هذه السياسة',
      changesText:
        'قد نقوم بتحديث سياسة الخصوصية من وقت لآخر. سنقوم بإعلامك بأي تغييرات من خلال نشر السياسة الجديدة على هذه الصفحة وتحديث تاريخ "آخر تحديث".',
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
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]} weight="semiBold">{localized.infoTitle}</Text>
          <Text style={[styles.text, isRTL && styles.textRTL]}>{localized.infoIntro}</Text>
          {localized.infoList.map((item) => (
            <Text key={item} style={[styles.bullet, isRTL && styles.textRTL]}>• {item}</Text>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]} weight="semiBold">{localized.useTitle}</Text>
          <Text style={[styles.text, isRTL && styles.textRTL]}>{localized.useIntro}</Text>
          {localized.useList.map((item) => (
            <Text key={item} style={[styles.bullet, isRTL && styles.textRTL]}>• {item}</Text>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]} weight="semiBold">{localized.sharingTitle}</Text>
          <Text style={[styles.text, isRTL && styles.textRTL]}>{localized.sharingText}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]} weight="semiBold">{localized.securityTitle}</Text>
          <Text style={[styles.text, isRTL && styles.textRTL]}>{localized.securityText}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]} weight="semiBold">{localized.rightsTitle}</Text>
          <Text style={[styles.text, isRTL && styles.textRTL]}>{localized.rightsIntro}</Text>
          {localized.rightsList.map((item) => (
            <Text key={item} style={[styles.bullet, isRTL && styles.textRTL]}>• {item}</Text>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]} weight="semiBold">{localized.cookiesTitle}</Text>
          <Text style={[styles.text, isRTL && styles.textRTL]}>{localized.cookiesText}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]} weight="semiBold">{localized.changesTitle}</Text>
          <Text style={[styles.text, isRTL && styles.textRTL]}>{localized.changesText}</Text>
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
