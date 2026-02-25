import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/contexts/LanguageContext';
import { isRTL, rtlText, rtlRow } from '@/utils/rtl';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius } from '@/theme/spacing';
import { getTypographyStyles } from '@/theme/typography';
import { getFontFamilyByLanguage } from '@/utils/fonts';
import { supabase, safeQuery } from '@/integrations/supabase/client';
import { Text } from '@/components/common/Text';
import { ScreenHeader } from '@/components/common/ScreenHeader';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export function FAQPage() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const rtl = isRTL(language);
  const { colors } = useTheme();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const fontFamily = getFontFamilyByLanguage(language as 'ckb' | 'ar');
  const styles = createStyles(colors, insets, typography, fontFamily, rtl);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [animations] = useState<Map<number, Animated.Value>>(new Map());

  const fetchFAQs = async () => {
    try {
      const { data, error } = await safeQuery((client) =>
        client
          .from('faqs')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
      );

      if (error) throw error;

      const formattedFaqs: FAQItem[] = (data || []).map((faq: any) => {
        // Safe language field access with fallback
        let question = '';
        let answer = '';
        
        if (language === 'ckb' && faq.question_ckb) {
          question = faq.question_ckb;
        } else if (language === 'ar' && faq.question_ar) {
          question = faq.question_ar;
        } else {
          question = faq.question_en || '';
        }
        
        if (language === 'ckb' && faq.answer_ckb) {
          answer = faq.answer_ckb;
        } else if (language === 'ar' && faq.answer_ar) {
          answer = faq.answer_ar;
        } else {
          answer = faq.answer_en || '';
        }
        
        return {
          id: faq.id,
          question,
          answer,
        };
      });

      setFaqs(formattedFaqs);
      
      // Initialize animations for each FAQ (only once)
      formattedFaqs.forEach((_, index) => {
        if (!animations.has(index)) {
          animations.set(index, new Animated.Value(0));
        }
      });
    } catch (error: any) {
      console.error('Error fetching FAQs:', error);
      // If table doesn't exist, use empty array
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFAQs();
  }, [language]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel('faqs-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'faqs' },
        () => {
          fetchFAQs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [language]);

  const toggleFAQ = (index: number) => {
    // Prevent multiple rapid clicks
    if (loading) return;
    
    const isExpanding = expandedIndex !== index;
    const newExpandedIndex = isExpanding ? index : null;
    setExpandedIndex(newExpandedIndex);

    // Get or create animation value
    let animValue = animations.get(index);
    if (!animValue) {
      animValue = new Animated.Value(0);
      animations.set(index, animValue);
    }

    // Use spring animation for smoother performance
    Animated.spring(animValue, {
      toValue: isExpanding ? 1 : 0,
      tension: 50,
      friction: 7,
      useNativeDriver: false, // Required for height animations
    }).start();
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('faqTitle') || 'Frequently Asked Questions'}
        onBack={() => navigation.goBack()}
        style={{ paddingTop: insets.top + 8 }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16, width: '100%' }}>
        {/* Top icon + subtitle */}
        <View style={styles.heroContainer}>
          <View style={styles.heroIconCircle}>
            <HelpCircle size={28} color="#7C3AED" />
          </View>
          <Text style={[styles.heroSubtitle, rtlText(rtl)]}>
            {t('faqSubtitle') || 'Find answers to common questions'}
          </Text>
        </View>

        {/* FAQ list with animation */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          </View>
        ) : faqs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, rtlText(rtl)]}>
              {t('noFaqsAvailable') || 'No FAQs available'}
            </Text>
          </View>
        ) : (
          faqs.map((faq, index) => {
            const isExpanded = expandedIndex === index;
            const animValue = animations.get(index) || new Animated.Value(0);
            
            // Use layout animation instead of height interpolation for better performance
            const opacity = animValue.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0.5, 1],
            });

            const rotate = animValue.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '180deg'],
            });

            return (
              <View
                key={faq.id}
                style={[styles.faqItem, isExpanded && styles.faqItemExpanded]}
              >
                <TouchableOpacity
                  style={[styles.faqQuestion, rtlRow(rtl)]}
                  onPress={() => toggleFAQ(index)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.faqQuestionText, rtlText(rtl)]}>{faq.question}</Text>
                  <Animated.View style={{ transform: [{ rotate }] }}>
                    <ChevronDown size={18} color={colors.foreground.muted} />
                  </Animated.View>
                </TouchableOpacity>
                {isExpanded && (
                  <Animated.View
                    style={[
                      styles.faqAnswerContainer,
                      {
                        opacity,
                      },
                    ]}
                  >
                    <View style={styles.faqAnswer}>
                      <Text style={[styles.faqAnswerText, rtlText(rtl)]}>{faq.answer}</Text>
                    </View>
                  </Animated.View>
                )}
              </View>
            );
          })
        )}

        {/* Contact Us footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, rtlText(rtl)]}>
            {t('faqCantFind') || "Couldn't find your answer?"}
          </Text>
          <TouchableOpacity
            onPress={() => {
              navigation.navigate('ProfileStack', { screen: 'HelpSupport' });
            }}
          >
            <Text style={[styles.footerLink, rtlText(rtl)]}>
              {t('contactUs') || 'Contact Us'}
            </Text>
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, insets: any, typography: any, fontFamily: string, rtl?: boolean) => StyleSheet.create({
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
    ...typography.h2,
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    color: colors.foreground.DEFAULT,
    fontFamily: fontFamily,
    marginHorizontal: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
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
  heroContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    ...typography.bodySmall,
    fontSize: 13,
    color: colors.foreground.muted,
    fontFamily: fontFamily,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    fontSize: 16,
    color: colors.foreground.muted,
    fontFamily: fontFamily,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  faqQuestionText: {
    ...typography.h3,
    flex: 1,
    fontSize: 16,
    color: colors.foreground.DEFAULT,
    marginEnd: spacing.sm,
    fontFamily: fontFamily,
  },
  faqAnswerContainer: {
    overflow: 'hidden',
    // Remove maxHeight constraint - use conditional rendering instead
  },
  faqAnswer: {
    padding: spacing.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  faqAnswerText: {
    ...typography.bodySmall,
    color: colors.foreground.muted,
    fontFamily: fontFamily,
  },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: colors.foreground.muted,
    marginBottom: spacing.xs,
    fontFamily: fontFamily,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
    fontFamily: fontFamily,
  },
});
