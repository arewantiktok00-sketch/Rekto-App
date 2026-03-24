import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { borderRadius, spacing } from '@/theme/spacing';
import { useNavigation } from '@react-navigation/native';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function Terms() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { language, isRTL } = useLanguage();
  const styles = createStyles(colors, isRTL);
  const content = useMemo(() => ({
    en: {
      headerTitle: 'Terms of Service',
      back: 'Back',
      introTitle: 'Agreement to Terms',
      introText:
        'Welcome to Rekto. These Terms of Service ("Terms") govern your use of our website (rekto.net) and our digital marketing services. By accessing our website or using our services, you agree to be bound by these Terms. If you do not agree with these Terms, please do not use our website or services.',
      servicesTitle: 'About Our Services',
      servicesText:
        'Rekto is a digital marketing agency providing TikTok advertising, social media marketing, lead generation, and marketing consultation services for businesses in Iraq and Kurdistan. Our services are designed to help businesses grow their online presence and reach their target customers.',
      responsibilitiesTitle: 'Client Responsibilities',
      responsibilitiesIntro: 'As a client of Rekto, you agree to:',
      responsibilitiesList: [
        'Provide accurate and complete information about your business',
        'Comply with all applicable laws and regulations',
        'Ensure that your advertising content does not infringe on third-party rights',
        'Pay for services according to agreed-upon terms',
        'Communicate promptly regarding campaign approvals and feedback',
      ],
      deliveryTitle: 'Service Delivery',
      deliveryText:
        'We will provide our services with reasonable care and skill. Campaign performance is subject to various factors including market conditions, competition, and platform policies. While we strive for optimal results, we cannot guarantee specific outcomes or performance metrics.',
      paymentTitle: 'Payment Terms',
      paymentText:
        'Payment terms will be specified in individual service agreements. Clients are responsible for paying all fees according to the agreed schedule. Late payments may result in service suspension or additional charges.',
      ipTitle: 'Intellectual Property',
      ipText:
        'All content, logos, and materials created by Rekto remain our property unless otherwise agreed in writing. Clients retain ownership of their brand assets and content they provide to us.',
      liabilityTitle: 'Limitation of Liability',
      liabilityText:
        'Rekto shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services. Our total liability shall not exceed the fees paid for the specific services giving rise to the claim.',
      terminationTitle: 'Termination',
      terminationText:
        'Either party may terminate services with appropriate notice as specified in the service agreement. Upon termination, clients remain responsible for payment of services rendered.',
      changesTitle: 'Changes to Terms',
      changesText:
        'We reserve the right to modify these Terms at any time. Changes will be effective upon posting to our website. Your continued use of our services after changes constitutes acceptance of the modified Terms.',
      lawTitle: 'Governing Law',
      lawText:
        'These Terms shall be governed by and construed in accordance with the laws of the Kurdistan Region of Iraq.',
      contactTitle: 'Contact Us',
      contactLines: [
        'Rekto',
        'Email: contact@rekto.net',
        'Website: rekto.net',
        'Erbil, Kurdistan Region, Iraq',
      ],
    },
    ckb: {
      headerTitle: 'مەرجەکانی خزمەتگوزاری',
      back: 'گەڕانەوە',
      introTitle: 'ڕەزامەندی بە مەرجەکان',
      introText:
        'بەخێربێیت بۆ ڕێکتۆ. ئەم مەرجەکانی خزمەتگوزاری ("مەرجەکان") بەکارهێنانی تۆ بۆ ماڵپەڕەکەمان (rekto.net) و خزمەتگوزارییە بازرگانییە دیجیتاڵییەکانمان ڕێکدەخات. بە سەردانکردن یان بەکارهێنانی خزمەتگوزارییەکانمان ڕەزامەندیت دەبێت بە مەرجەکان. ئەگەر ڕەزامەند نیت، تکایە ماڵپەڕەکە بەکارمەهێنە.',
      servicesTitle: 'دەربارەی خزمەتگوزارییەکانمان',
      servicesText:
        'ڕێکتۆ ئاجەنسییەکی بازاڕکردنی دیجیتاڵیە کە خزمەتگوزارییەکانی ڕیکلامی تیکتۆک، بازاڕکردنی تۆڕە کۆمەڵایەتییەکان، دروستکردنی لیـد، و ڕاوێژکاری بازاڕکردن بۆ کاروبارەکانی عێراق و کوردستان پێشکەش دەکات.',
      responsibilitiesTitle: 'بەرپرسیارییەکانی کڕیار',
      responsibilitiesIntro: 'وەک کڕیارێکی ڕێکتۆ، ڕەزامەندیت دەبێت بە:',
      responsibilitiesList: [
        'پێدانی زانیاری ڕاست و تەواو لەسەر کاروبارەکەت',
        'پابەندبوون بە هەموو یاسا و ڕێنماییە پەیوەستەکان',
        'دڵنیاکردنەوە کە ناوەڕۆکی ڕیکلامەکانت مافی لایەنی سێیەم پێنەشکێنێت',
        'پارەدان بەپێی مەرجە ڕێککەوتووەکان',
        'پەیوەندی خێرا لەسەر پەسەندکردن و ڕەخنەی کەمپەین',
      ],
      deliveryTitle: 'پێشکەشکردنی خزمەتگوزاری',
      deliveryText:
        'ئێمە خزمەتگوزارییەکانمان بە ڕێژەیەکی گونجاو و شارەزایی پێشکەش دەکەین. ئەنجامی کەمپەینەکان بە هۆی هۆکارە جۆراوجۆرن وەک دۆخی بازاڕ، پێشبڕکێ، و یاساکانی پلاتفۆرمەکان. ئێمە هەوڵ دەدەین باشترین ئەنجام بۆ تۆ بێت، بەڵام ناتوانین ئەنجامی دیاریکراو دڵنیا بکەین.',
      paymentTitle: 'مەرجەکانی پارەدان',
      paymentText:
        'مەرجەکانی پارەدان لە ڕێککەوتنی تایبەتی خزمەتگوزارییەکاندا دیاری دەکرێت. کڕیاران بەرپرسیاری پارەدانە بەپێی کاتی ڕێککەوتووەن. دواکەوتنی پارەدان دەتوانێت ببێتە هۆی ڕاگرتنی خزمەتگوزاری یان پارەی زیادە.',
      ipTitle: 'مافی مادی و فکری',
      ipText:
        'هەموو ناوەڕۆک، لۆگۆ و مادەی دروستکراو لەلایەن ڕێکتۆوە مافی ڕێکتۆیە ئەگەر بە نووسین ڕێککەوتنێکی تر نەکرابێت. کڕیاران مافی براند و ناوەڕۆکی خۆیان دەهێلنەوە.',
      liabilityTitle: 'سنووردانی بەرپرسیاری',
      liabilityText:
        'ڕێکتۆ بەرپرسیاری زیانی ناڕاستەوخۆ، تایبەتی یان دوورەوە نییە کە لە بەکارهێنانی خزمەتگوزارییەکانەوە دروست بێت. زۆرترین بەرپرسیاری ئێمە سنووردارە بە پارەیە کە بۆ ئەو خزمەتگوزارییە دراوە.',
      terminationTitle: 'کۆتایی هێنان',
      terminationText:
        'هەر یەک لە دوو لایەن دەتوانێت بە پێی ڕێککەوتن خزمەتگوزاری کۆتایی پێبێنێت. لە کاتی کۆتایی هێناندا، کڕیار بەرپرسیاری پارەدانی خزمەتگوزارییە ئەنجامدراوەکانە.',
      changesTitle: 'نامە لە مەرجەکان',
      changesText:
        'ئێمە مافی نامە لەم مەرجەکانە هەیە. نامەیەکان لە کاتی بڵاوکردنەوە لەسەر ماڵپەڕەکەمانەوە کاریگەر دەبن. بەردەوامبوونی تۆ لە بەکارهێنان بە واتای ڕەزامەندییە.',
      lawTitle: 'یاسای دەسەڵاتدار',
      lawText:
        'ئەم مەرجەکانە لەژێر یاساکانی هەرێمی کوردستان-عێراق ڕێکدەخرێن و تێگەیشتن بەپێی ئەوانە.',
      contactTitle: 'پەیوەندی پێوە',
      contactLines: [
        'ڕێکتۆ',
        'ئیمەیڵ: contact@rekto.net',
        'ماڵپەڕ: rekto.net',
        'هەولێر، هەرێمی کوردستان، عێراق',
      ],
    },
    ar: {
      headerTitle: 'شروط الخدمة',
      back: 'رجوع',
      introTitle: 'الموافقة على الشروط',
      introText:
        'مرحباً بك في ريكتو. تحكم شروط الخدمة هذه ("الشروط") استخدامك لموقعنا (rekto.net) وخدمات التسويق الرقمي الخاصة بنا. من خلال الوصول إلى موقعنا أو استخدام خدماتنا، فإنك توافق على الالتزام بهذه الشروط. إذا كنت لا توافق، يرجى عدم استخدام موقعنا أو خدماتنا.',
      servicesTitle: 'عن خدماتنا',
      servicesText:
        'ريكتو وكالة تسويق رقمي تقدم إعلانات TikTok والتسويق عبر وسائل التواصل الاجتماعي وتوليد العملاء المحتملين والاستشارات التسويقية للشركات في العراق وكردستان. صُممت خدماتنا لمساعدة الشركات على نمو حضورها الرقمي والوصول إلى عملائها المستهدفين.',
      responsibilitiesTitle: 'مسؤوليات العميل',
      responsibilitiesIntro: 'كعميل لدى ريكتو، فإنك توافق على:',
      responsibilitiesList: [
        'تقديم معلومات دقيقة وكاملة عن عملك',
        'الامتثال لجميع القوانين واللوائح المعمول بها',
        'ضمان ألا ينتهك محتوى إعلاناتك حقوق أطراف ثالثة',
        'الدفع مقابل الخدمات وفقاً للشروط المتفق عليها',
        'التواصل بسرعة بشأن موافقات الحملة والملاحظات',
      ],
      deliveryTitle: 'تقديم الخدمة',
      deliveryText:
        'سنقدم خدماتنا بعناية ومهارة معقولة. يعتمد أداء الحملات على عوامل متعددة مثل ظروف السوق والمنافسة وسياسات المنصات. نسعى لتحقيق أفضل النتائج، لكننا لا نضمن نتائج أو مؤشرات أداء محددة.',
      paymentTitle: 'شروط الدفع',
      paymentText:
        'سيتم تحديد شروط الدفع في اتفاقيات الخدمة الفردية. العملاء مسؤولون عن دفع الرسوم وفق الجدول المتفق عليه. قد يؤدي التأخر في الدفع إلى تعليق الخدمة أو فرض رسوم إضافية.',
      ipTitle: 'الملكية الفكرية',
      ipText:
        'جميع المحتويات والشعارات والمواد التي تنشئها ريكتو تبقى ملكاً لنا ما لم يتم الاتفاق على خلاف ذلك كتابةً. يحتفظ العملاء بملكية أصول علامتهم التجارية والمحتوى الذي يقدمونه لنا.',
      liabilityTitle: 'حدود المسؤولية',
      liabilityText:
        'لا تتحمل ريكتو أي مسؤولية عن الأضرار غير المباشرة أو العرضية أو الخاصة أو التبعية الناتجة عن استخدام خدماتنا. وتقتصر مسؤوليتنا الإجمالية على الرسوم المدفوعة مقابل الخدمة المعنية.',
      terminationTitle: 'الإنهاء',
      terminationText:
        'يجوز لأي طرف إنهاء الخدمات بإشعار مناسب وفقاً لاتفاقية الخدمة. عند الإنهاء، يظل العملاء مسؤولين عن دفع الخدمات المقدمة.',
      changesTitle: 'تغييرات الشروط',
      changesText:
        'نحتفظ بحق تعديل هذه الشروط في أي وقت. تصبح التغييرات سارية بمجرد نشرها على موقعنا. استمرارك في استخدام خدماتنا بعد التغييرات يعني قبولك لها.',
      lawTitle: 'القانون الحاكم',
      lawText:
        'تُحكم هذه الشروط وتُفسر وفق قوانين إقليم كردستان العراق.',
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
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]} weight="semiBold">{localized.servicesTitle}</Text>
          <Text style={[styles.text, isRTL && styles.textRTL]}>{localized.servicesText}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]} weight="semiBold">{localized.responsibilitiesTitle}</Text>
          <Text style={[styles.text, isRTL && styles.textRTL]}>{localized.responsibilitiesIntro}</Text>
          {localized.responsibilitiesList.map((item) => (
            <Text key={item} style={[styles.bullet, isRTL && styles.textRTL]}>• {item}</Text>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]} weight="semiBold">{localized.deliveryTitle}</Text>
          <Text style={[styles.text, isRTL && styles.textRTL]}>{localized.deliveryText}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]} weight="semiBold">{localized.paymentTitle}</Text>
          <Text style={[styles.text, isRTL && styles.textRTL]}>{localized.paymentText}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]} weight="semiBold">{localized.ipTitle}</Text>
          <Text style={[styles.text, isRTL && styles.textRTL]}>{localized.ipText}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]} weight="semiBold">{localized.liabilityTitle}</Text>
          <Text style={[styles.text, isRTL && styles.textRTL]}>{localized.liabilityText}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]} weight="semiBold">{localized.terminationTitle}</Text>
          <Text style={[styles.text, isRTL && styles.textRTL]}>{localized.terminationText}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]} weight="semiBold">{localized.changesTitle}</Text>
          <Text style={[styles.text, isRTL && styles.textRTL]}>{localized.changesText}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]} weight="semiBold">{localized.lawTitle}</Text>
          <Text style={[styles.text, isRTL && styles.textRTL]}>{localized.lawText}</Text>
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
