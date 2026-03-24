import { Text } from '@/components/common/Text';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigation } from '@react-navigation/native';
import { AlertCircle, CreditCard, HelpCircle } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export function DashboardAwaitingPayment() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const [awaiting, setAwaiting] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) {
      setAwaiting([]);
      return;
    }

    let mounted = true;

    const fetchAwaiting = async () => {
      const { data } = await supabase
        .from('campaigns')
        .select('id, title, status')
        .eq('user_id', user.id)
        .in('status', ['awaiting_payment', 'verifying_payment'])
        .order('created_at', { ascending: false });
      if (mounted) {
        setAwaiting(Array.isArray(data) ? data : []);
      }
    };

    fetchAwaiting();

    const channel = supabase
      .channel(`awaiting-payment-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaigns', filter: `user_id=eq.${user.id}` },
        () => {
          fetchAwaiting();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  if (awaiting.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <AlertCircle size={20} color="#F59E0B" />
        <Text style={styles.title}>{t('awaitingPayment')}</Text>
      </View>
      {awaiting.slice(0, 3).map((c: any) => (
        <TouchableOpacity
          key={c?.id}
          style={styles.card}
          onPress={() => (navigation as any).navigate('CampaignDetail', { id: c?.id })}
          activeOpacity={0.8}
        >
          <View style={styles.cardTopRow}>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle} numberOfLines={1}>چاوەڕوانی پارەدان</Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>{c?.title || c?.id}</Text>
            </View>
            <View style={styles.leftIconWrap}>
              <AlertCircle size={20} color="#D97706" />
            </View>
          </View>
          <View style={styles.cardBottomRow}>
            <TouchableOpacity
              style={styles.payButtonWrap}
              onPress={() => (navigation as any).navigate('CampaignDetail', { id: c?.id })}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#7C3AED', '#9333EA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.payButton}
              >
                <CreditCard size={14} color="#FFFFFF" />
                <Text style={styles.payButtonText}>{t('payNow')}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => (navigation as any).navigate('Main', { screen: 'Tutorial' })}
              activeOpacity={0.85}
            >
              <HelpCircle size={16} color="#6D28D9" />
              <Text style={styles.whyText}>{t('howToPay')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    wrap: { marginBottom: 16 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: '#D97706',
      fontFamily: 'Rabar_021',
      writingDirection: 'rtl',
    },
    card: {
      padding: 16,
      backgroundColor: isDark ? 'rgba(120,53,15,0.2)' : 'rgba(255,251,235,0.5)',
      borderRadius: 16,
      borderWidth: 2,
      borderColor: 'rgba(245,158,11,0.5)',
      marginBottom: 10,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    leftIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: '#FEF3C7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTextWrap: { flex: 1, alignItems: 'flex-end' },
    cardTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.foreground.DEFAULT,
      fontFamily: 'Rabar_021',
      writingDirection: 'rtl',
      textAlign: 'right',
    },
    cardSubtitle: {
      marginTop: 2,
      fontSize: 14,
      color: colors.foreground.muted,
      fontFamily: 'Rabar_021',
      writingDirection: 'rtl',
      textAlign: 'right',
    },
    cardBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 2,
    },
    payButtonWrap: {
      borderRadius: 10,
      overflow: 'hidden',
    },
    payButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    payButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
      fontFamily: 'Rabar_021',
    },
    helpButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#C4B5FD',
      backgroundColor: isDark ? colors.card?.background ?? '#27272A' : '#FFFFFF',
    },
    whyText: {
      fontSize: 14,
      color: '#6D28D9',
      fontFamily: 'Rabar_021',
    },
  });
