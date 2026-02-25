import { Text } from '@/components/common/Text';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppSettingsRealtime } from '@/hooks/useAppSettingsRealtime';
import { supabase } from '@/integrations/supabase/client';
import { sendPushToUsers } from '@/services/notificationPush';
import { spacing } from '@/theme/spacing';
import { iconTransformRTL } from '@/utils/rtl';
import { toast } from '@/utils/toast';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface PromoBannerSettings {
  active: boolean;
  banner: {
    enabled: boolean;
    text_en: string;
    text_ckb: string;
    text_ar: string;
    target_budget: number;
    display_price_iqd: number;
  };
}

export function PromoBanner() {
  const navigation = useNavigation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [promoData, setPromoData] = useState<PromoBannerSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const isRTL = language === 'ckb' || language === 'ar';

  const fetchPromoData = useCallback(async () => {
    try {
      // Fetch from app_settings directly (matches owner dashboard structure)
      const { data, error } = await supabase.functions.invoke('app-settings', {
        body: { action: 'get', key: 'global' }
      });

      if (error) {
        if (__DEV__) {
          console.warn('PromoBanner: fetch failed', error?.message ?? String(error));
        }
        setPromoData(null);
        setLoading(false);
        return;
      }

      const promoData = data?.settings?.value?.promo_banner;
      if (promoData && promoData.enabled) {
        // Transform to match expected structure
        setPromoData({
          active: true,
          banner: {
            enabled: promoData.enabled,
            text_en: promoData.text_en || '🔥 Special Offer!',
            text_ckb: promoData.text_ckb || '🔥 ئۆفەری تایبەت!',
            text_ar: promoData.text_ar || '🔥 عرض خاص!',
            target_budget: promoData.target_budget || 10,
            display_price_iqd: promoData.display_price_iqd || 15000,
          }
        });
      } else {
        setPromoData(null);
      }
    } catch (err) {
      if (__DEV__) {
        console.warn('PromoBanner: fetch error', err instanceof Error ? err.message : String(err));
      }
      setPromoData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromoData();
  }, [fetchPromoData]);

  // Real-time subscription for app_settings changes
  useAppSettingsRealtime({
    enabled: true,
    settingsKey: 'global',
    onUpdate: (payload) => {
      console.log('[PromoBanner] Real-time update received:', payload);
      // Refetch promo data when settings change
      fetchPromoData();
    },
  });

  useAppSettingsRealtime({
    enabled: true,
    settingsKey: 'promo_banner',
    onUpdate: (payload) => {
      console.log('[PromoBanner] promo_banner update received:', payload);
      fetchPromoData();
    },
  });

  const handlePress = async () => {
    if (!promoData || !user) return;

    const { target_budget, display_price_iqd } = promoData.banner;

    // Localized notification content
    const content = {
      en: {
        toastTitle: '✨ Special Offer Activated!',
        toastDesc: `$${target_budget} = ${display_price_iqd.toLocaleString()} IQD per day`,
        inAppTitle: '✨ Special Offer Applied',
        inAppMessage: `You're getting $${target_budget}/day for only ${display_price_iqd.toLocaleString()} IQD per day! Create your ad now.`,
        pushTitle: '✨ Special Offer Activated!',
        pushBody: `$${target_budget}/day for only ${display_price_iqd.toLocaleString()} IQD per day! Create your ad now.`,
      },
      ckb: {
        toastTitle: '✨ ئۆفەری تایبەت چالاک کرا!',
        toastDesc: `$${target_budget} = ${display_price_iqd.toLocaleString()} IQD بۆ هەر ڕۆژێک`,
        inAppTitle: '✨ ئۆفەری تایبەت جێبەجێ کرا',
        inAppMessage: `$${target_budget}/ڕۆژ بە تەنها ${display_price_iqd.toLocaleString()} IQD بۆ هەر ڕۆژێک! ئێستا ڕیکلامەکەت دروست بکە.`,
        pushTitle: '✨ ئۆفەری تایبەت چالاک کرا!',
        pushBody: `$${target_budget}/ڕۆژ بە تەنها ${display_price_iqd.toLocaleString()} IQD! ئێستا ڕیکلامەکەت دروست بکە.`,
      },
      ar: {
        toastTitle: '✨ تم تفعيل العرض الخاص!',
        toastDesc: `$${target_budget} = ${display_price_iqd.toLocaleString()} IQD لكل يوم`,
        inAppTitle: '✨ تم تطبيق العرض الخاص',
        inAppMessage: `تحصل على $${target_budget}/يوم بسعر ${display_price_iqd.toLocaleString()} IQD فقط لكل يوم! أنشئ إعلانك الآن.`,
        pushTitle: '✨ تم تفعيل العرض الخاص!',
        pushBody: `$${target_budget}/يوم بسعر ${display_price_iqd.toLocaleString()} IQD فقط! أنشئ إعلانك الآن.`,
      },
    }[language] || content.en;

    try {
      // 1. Show toast
      toast.success('Success', 'Operation completed');

      // 2. Create in-app notification
      await supabase.functions.invoke('owner-content', {
        body: {
          action: 'createUserNotification',
          user_id: user.id,
          title: content.inAppTitle,
          message: content.inAppMessage,
          type: 'info'
        }
      });

      // 3. Push up so user sees it on device
      await sendPushToUsers([user.id], content.pushTitle, content.pushBody, {
        data: { type: 'promo', target_budget, display_price_iqd },
        tag: 'promo',
      });

      // 4. Navigate to CreateAd with promo pre-filled
      navigation.navigate('Main', {
        screen: 'CreateAd',
        params: {
          prefill: {
            daily_budget: target_budget,
          },
          promo: {
            target_budget,
            display_price_iqd,
            active: true
          }
        }
      });
    } catch (err) {
      console.error('Error handling promo tap:', err);
      // Still navigate even if notifications fail
      navigation.navigate('Main', {
        screen: 'CreateAd',
        params: {
          prefill: {
            daily_budget: target_budget,
          },
          promo: {
            target_budget,
            display_price_iqd,
            active: true
          }
        }
      });
    }
  };

  if (loading || !promoData) {
    return null;
  }

  const { target_budget, display_price_iqd, text_en, text_ckb, text_ar } = promoData.banner;

  const bannerText = language === 'ckb' ? text_ckb : language === 'ar' ? text_ar : text_en;
  const perDayText = language === 'ckb'
    ? `${display_price_iqd.toLocaleString()} IQD بۆ هەر ڕۆژێک`
    : language === 'ar'
      ? `${display_price_iqd.toLocaleString()} IQD لكل يوم`
      : `${display_price_iqd.toLocaleString()} IQD per day`;

  const styles = createStyles(colors, isRTL);

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
      <LinearGradient
        colors={['#7C3AED', '#A855F7', '#EC4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.container}
      >
        <View style={[styles.row, isRTL && styles.rowRTL]}>
          <View style={styles.iconWrap}>
            <Sparkles size={24} color={colors.primary.foreground} />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.title}>{bannerText}</Text>
            <Text style={styles.subtitle}>{perDayText}</Text>
          </View>
          <View style={[styles.priceWrap, isRTL && { alignItems: 'flex-start' }]}>
            <Text style={styles.price}>{display_price_iqd.toLocaleString()}</Text>
            <Text style={styles.currency}>IQD</Text>
          </View>
          <ChevronRight
            size={24}
            color="rgba(255,255,255,0.6)"
            style={iconTransformRTL()}
          />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const createStyles = (colors: any, isRTL: boolean) => {
  const rowDir = 'row';
  return StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 16,
    padding: spacing.md,
  },
  row: {
    flexDirection: rowDir,
    alignItems: 'center',
  },
  rowRTL: {
    flexDirection: rowDir,
  },
  iconWrap: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  textWrap: {
    flex: 1,
    marginHorizontal: spacing.sm + 2,
  },
  title: {
    color: colors.primary.foreground,
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
  },
  priceWrap: {
    alignItems: 'flex-end',
  },
  price: {
    color: colors.primary.foreground,
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
  },
  currency: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
  });
};

