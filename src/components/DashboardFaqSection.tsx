import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { safeQuery, supabase } from '@/integrations/supabase/client';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export function DashboardFaqSection() {
  const { t, language } = useLanguage();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchFaqs = useCallback(async () => {
    try {
      const { data } = await safeQuery((client) =>
        client.from('faqs').select('*').eq('is_active', true).order('display_order', { ascending: true }).limit(5)
      );
      const list = (data || []).map((faq: any) => {
        const question = language === 'ckb' ? (faq.question_ckb || faq.question_ar || '') : (faq.question_ar || faq.question_ckb || '');
        const answer = language === 'ckb' ? (faq.answer_ckb || faq.answer_ar || '') : (faq.answer_ar || faq.answer_ckb || '');
        return { id: faq.id, question, answer };
      });
      setFaqs(list);
    } catch {
      setFaqs([]);
    }
  }, [language]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  useFocusEffect(
    useCallback(() => {
      fetchFaqs();
    }, [fetchFaqs])
  );

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-faqs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'faqs' }, () => {
        fetchFaqs();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFaqs]);

  if (faqs.length === 0) return null;

  const styles = createStyles(colors, isDark);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (navigation as any).navigate('ProfileStack', { screen: 'FAQ' })}
          style={styles.seeAll}
        >
          <Text style={styles.seeAllText}>{t('seeAll')}</Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>{t('faq')}</Text>
          <View style={styles.iconWrap}>
            <HelpCircle size={20} color={colors.foreground.muted} />
          </View>
        </View>
      </View>
      {faqs.map((item) => (
        <View key={item.id} style={styles.item}>
          <TouchableOpacity
            style={styles.questionRow}
            onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.question} numberOfLines={expandedId === item.id ? 0 : 2}>{item.question}</Text>
            {expandedId === item.id ? <ChevronUp size={20} color="#A1A1AA" /> : <ChevronDown size={20} color="#A1A1AA" />}
          </TouchableOpacity>
          {expandedId === item.id && item.answer ? (
            <Text style={styles.answer}>{item.answer}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}
const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    wrap: {
      marginTop: 8,
      marginBottom: 24,
    },
    header: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    titleRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 8,
    },
    iconWrap: {
      padding: 6,
      backgroundColor: isDark ? colors.card.background : colors.card.background,
      borderRadius: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '100',
      color: colors.foreground.DEFAULT,
      fontFamily: 'Rabar_021',
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    seeAll: {},
    seeAllText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.primary.DEFAULT,
      fontFamily: 'Rabar_021',
    },
    item: {
      marginBottom: 8,
      borderRadius: 12,
      backgroundColor: isDark
        ? colors.card.background
        : colors.background.secondary ?? '#F9FAFB',
      overflow: 'hidden',
    },
    questionRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      
    },
    question: {
      flex: 1,
      fontSize: 14,
      color: colors.foreground.DEFAULT,
      fontFamily: 'Rabar_021',
      writingDirection: 'rtl',
      textAlign: 'right',
      alignSelf: 'flex-start',
      width: '100%',

    },
    answer: {
      fontSize: 13,
      color: colors.foreground.muted,
      fontFamily: 'Rabar_021',
      writingDirection: 'rtl',
      textAlign: 'right',
      paddingHorizontal: 12,
      paddingBottom: 12,
      alignSelf: 'flex-start',
      flexDirection: 'row',
    },
  });

