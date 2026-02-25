import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { borderRadius, spacing } from '@/theme/spacing';
import { getTypographyStyles } from '@/theme/typography';
import { toast } from '@/utils/toast';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Globe, HelpCircle, Mail, MapPin, MessageCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { isRTL, rtlText, rtlRow, rtlInput } from '@/utils/rtl';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function HelpSupport() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const rtl = isRTL(language);
  const { colors } = useTheme();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const styles = createStyles(colors, insets, typography, rtl);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/9647504881516');
  };

  const handleWebsite = () => {
    Linking.openURL('https://rekto.net');
  };

  const handleEmail = () => {
    Linking.openURL('mailto:contact@rekto.net');
  };

  const handleSendFeedback = () => {
    if (!message.trim()) {
      toast.warning('Required', 'Please enter your message');
      return;
    }

    toast.success('Sent', 'Thanks for your feedback');

    setMessage('');
  };

  const faqs = [
    { question: t('faqCreateCampaign'), answer: t('faqCreateCampaignAnswer') },
    { question: t('faqPaymentMethods'), answer: t('faqPaymentMethodsAnswer') },
    { question: t('faqAdGoLive'), answer: t('faqAdGoLiveAnswer') },
    { question: t('faqEditCampaign'), answer: t('faqEditCampaignAnswer') },
    { question: t('faqAddFunds'), answer: t('faqAddFundsAnswer') },
    { question: t('faqMinBudget'), answer: t('faqMinBudgetAnswer') },
    { question: t('faqTrackPerformance'), answer: t('faqTrackPerformanceAnswer') },
    { question: t('faqRefund'), answer: t('faqRefundAnswer') },
  ];

  const toggleFaq = (index: number) => {
    setExpandedFaqIndex(expandedFaqIndex === index ? null : index);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('helpSupport') || 'Help & Support'}
        onBack={() => navigation.goBack()}
        style={{ paddingTop: insets.top + 8 }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16, width: '100%' }}>
        {/* CONTACT US */}
        <Text style={[styles.sectionLabel, rtlText(rtl)]}>{t('contactUs') || 'CONTACT US'}</Text>

        <TouchableOpacity style={[styles.contactCard, rtlRow(rtl)]} onPress={handleWhatsApp} activeOpacity={0.85}>
          <View style={[styles.contactIcon, styles.whatsappIcon, rtl && styles.contactIconRTL]}>
            <MessageCircle size={20} color="#16A34A" />
          </View>
          <View style={styles.contactContent}>
            <Text style={[styles.contactTitle, rtlText(rtl)]}>{t('whatsapp') || 'WhatsApp'}</Text>
            <Text style={[styles.contactSubtitle, rtlText(rtl)]}>+964 750 488 1516</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.contactCard, rtlRow(rtl)]} onPress={handleEmail} activeOpacity={0.85}>
          <View style={[styles.contactIcon, styles.emailIcon, rtl && styles.contactIconRTL]}>
            <Mail size={20} color="#2563EB" />
          </View>
          <View style={styles.contactContent}>
            <Text style={[styles.contactTitle, rtlText(rtl)]}>{t('email') || 'Email'}</Text>
            <Text style={[styles.contactSubtitle, rtlText(rtl)]}>contact@rekto.net</Text>
            </View>
          </TouchableOpacity>

        <TouchableOpacity style={[styles.contactCard, rtlRow(rtl)]} onPress={handleWebsite} activeOpacity={0.85}>
          <View style={[styles.contactIcon, styles.websiteIcon, rtl && styles.contactIconRTL]}>
            <Globe size={20} color={colors.primary.DEFAULT} />
          </View>
          <View style={styles.contactContent}>
            <Text style={[styles.contactTitle, rtlText(rtl)]}>{t('website') || 'Website'}</Text>
            <Text style={[styles.contactSubtitle, rtlText(rtl)]}>rekto.net</Text>
            </View>
          </TouchableOpacity>

        <View style={[styles.contactCard, rtlRow(rtl)]}>
          <View style={[styles.contactIcon, styles.locationIcon, rtl && styles.contactIconRTL]}>
            <MapPin size={20} color="#F97316" />
            </View>
          <View style={styles.contactContent}>
            <Text style={[styles.contactTitle, rtlText(rtl)]}>{t('ourLocation') || 'Our Location'}</Text>
            <Text style={[styles.contactSubtitle, rtlText(rtl)]}>
              Kurdistan Region, Erbil{'\n'}Ragaz 1, Albani, 27 Street
            </Text>
          </View>
        </View>

        {/* FAQ LIST */}
        <Text style={[styles.sectionLabel, rtlText(rtl)]}>
          {t('faqTitle') || 'FREQUENTLY ASKED QUESTIONS'}
        </Text>

        {faqs.map((faq, index) => {
          const isExpanded = expandedFaqIndex === index;
          return (
            <View
              key={index}
              style={[styles.faqItem, isExpanded && styles.faqItemExpanded]}
            >
              <TouchableOpacity
                style={[styles.faqQuestion, rtlRow(rtl)]}
                onPress={() => toggleFaq(index)}
                activeOpacity={0.8}
              >
                <Text style={[styles.faqQuestionText, rtlText(rtl)]}>{faq.question}</Text>
                {isExpanded ? (
                  <HelpCircle size={16} color={colors.foreground.muted} />
                ) : (
                  <HelpCircle size={16} color={colors.foreground.muted} />
                )}
              </TouchableOpacity>
              {isExpanded && (
                <View style={styles.faqAnswer}>
                  <Text style={[styles.faqAnswerText, rtlText(rtl)]}>{faq.answer}</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* SEND FEEDBACK */}
        <Text style={[styles.sectionLabel, rtlText(rtl)]}>
          {t('sendFeedback') || 'SEND FEEDBACK'}
        </Text>

        <View style={styles.feedbackCard}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, rtlText(rtl)]}>{t('yourName') || 'Your Name'}</Text>
            <TextInput
              style={[styles.input, rtlInput(rtl)]}
              value={name}
              onChangeText={setName}
              placeholder={t('enterYourName') || 'Enter your name'}
              placeholderTextColor={colors.foreground.muted}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, rtlText(rtl)]}>{t('emailAddress') || 'Email Address'}</Text>
            <TextInput
              style={[styles.input, rtlInput(rtl)]}
              value={email}
              onChangeText={setEmail}
              placeholder={t('enterEmailAddress') || 'Enter your email'}
              placeholderTextColor={colors.foreground.muted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, rtlText(rtl)]}>{t('message') || 'Message'}</Text>
            <TextInput
              style={[styles.input, styles.messageInput, rtlInput(rtl)]}
              value={message}
              onChangeText={setMessage}
              placeholder={
                t('tellUsHowWeCanHelp') ||
                'Tell us how we can help or share your feedback...'
              }
              placeholderTextColor={colors.foreground.muted}
              multiline
            />
          </View>

          <TouchableOpacity
            style={styles.feedbackButtonContainer}
            onPress={handleSendFeedback}
            activeOpacity={0.9}
          >
            <LinearGradient
            colors={colors.gradients.primaryButton.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.feedbackButton, rtlRow(rtl)]}
            >
              <Text style={[styles.feedbackButtonText, rtlText(rtl)]}>
                {t('sendFeedback') || 'Send Feedback'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, insets: any, typography: any, rtl?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  header: {
    paddingTop: insets.top + spacing.md,
    paddingStart: spacing.md,
    paddingEnd: spacing.md,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.DEFAULT,
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
  backButton: {
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  backButtonLabel: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  headerLeftSlot: {
    minWidth: 100,
    maxWidth: 100,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerRightSlot: {
    minWidth: 100,
    maxWidth: 100,
  },
  headerTitle: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    color: colors.foreground.DEFAULT,
    marginHorizontal: spacing.sm,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingStart: spacing.lg,
    paddingEnd: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: insets.bottom + spacing.xl * 2,
    width: '100%',
    maxWidth: '100%',
  },
  sectionLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.foreground.muted,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  contactCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.background,
    paddingStart: spacing.md,
    paddingEnd: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    marginBottom: spacing.sm,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  contactIconRTL: {
    marginEnd: 0,
    marginStart: spacing.md,
  },
  whatsappIcon: {
    backgroundColor: 'rgba(22,163,74,0.08)',
  },
  emailIcon: {
    backgroundColor: 'rgba(37,99,235,0.08)',
  },
  websiteIcon: {
    backgroundColor: 'rgba(124,58,237,0.08)',
  },
  locationIcon: {
    backgroundColor: 'rgba(249,115,22,0.08)',
  },
  contactContent: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  contactTitle: {
    ...typography.label,
    fontSize: 14,
    color: colors.foreground.DEFAULT,
    marginBottom: 2,
  },
  contactSubtitle: {
    ...typography.caption,
    fontSize: 12,
    color: colors.foreground.muted,
  },
  faqItem: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  faqItemExpanded: {
    borderColor: '#A855F7',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  faqQuestionText: {
    ...typography.bodySmall,
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.foreground.DEFAULT,
    marginEnd: spacing.sm,
  },
  faqAnswer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: 0,
  },
  faqAnswerText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.foreground.muted,
  },
  feedbackCard: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.label,
    fontSize: 13,
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.xs,
  },
  input: {
    height: 48,
    borderRadius: borderRadius.input,
    borderWidth: 1,
    borderColor: colors.input.border || colors.border.DEFAULT,
    backgroundColor: colors.input.background || colors.background.secondary,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.foreground.DEFAULT,
  },
  messageInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  feedbackButtonContainer: {
    marginTop: spacing.sm,
  },
  feedbackButton: {
    height: 52,
    borderRadius: borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackButtonText: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary.foreground,
  },
});

