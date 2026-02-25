import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Linking, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppSettingsRealtime } from '@/hooks/useAppSettingsRealtime';
import { supabase } from '@/integrations/supabase/client';
import { Text } from '@/components/common/Text';
import { spacing, borderRadius } from '@/theme/spacing';
import { Megaphone, X } from 'lucide-react-native';

interface AnnouncementData {
  enabled: boolean;
  title_ckb: string;
  title_ar: string;
  message_ckb: string;
  message_ar: string;
  button_text_ckb: string;
  button_text_ar: string;
  button_link: string | null;
  show_close: boolean;
}

export const FeatureAnnouncementPopup: React.FC = () => {
  const { language } = useLanguage();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [announcement, setAnnouncement] = useState<AnnouncementData | null>(null);
  const [visible, setVisible] = useState(false);
  const bounceAnim = useRef(new Animated.Value(1)).current;

  const fetchAnnouncement = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('app-settings', {
        body: { action: 'get', key: 'global' },
      });
      if (error) return;
      const settings = data?.settings?.value || null;
      const incoming = settings?.announcement as AnnouncementData | undefined;
      if (!incoming?.enabled) {
        setVisible(false);
        return;
      }

      const currentId = JSON.stringify(incoming);
      const dismissedId = await AsyncStorage.getItem('rekto_announcement_dismissed');
      if (dismissedId === currentId) {
        setVisible(false);
        return;
      }

      setAnnouncement(incoming);
      setVisible(true);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchAnnouncement();
  }, [fetchAnnouncement]);

  useAppSettingsRealtime({
    enabled: true,
    settingsKey: 'global',
    onUpdate: (payload) => {
      if ((payload?.new as any)?.value?.announcement) {
        fetchAnnouncement();
      }
    },
  });

  const handleClose = async () => {
    if (announcement) {
      await AsyncStorage.setItem('rekto_announcement_dismissed', JSON.stringify(announcement));
    }
    setVisible(false);
  };

  useEffect(() => {
    if (!visible) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, [visible, bounceAnim]);

  const title =
    language === 'ckb'
      ? announcement?.title_ckb
      : language === 'ar'
      ? announcement?.title_ar
      : announcement?.title_ckb;
  const message =
    language === 'ckb'
      ? announcement?.message_ckb
      : language === 'ar'
      ? announcement?.message_ar
      : announcement?.message_ckb;
  const buttonText =
    language === 'ckb'
      ? announcement?.button_text_ckb
      : language === 'ar'
      ? announcement?.button_text_ar
      : announcement?.button_text_ckb;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
                <Megaphone size={18} color={colors.primary.DEFAULT} />
              </Animated.View>
              <Text style={styles.headerTitle}>{title || 'ئاگادارکردنەوە'}</Text>
            </View>
            {announcement?.show_close ? (
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={18} color={colors.foreground.DEFAULT} />
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.message}>{message || ''}</Text>
          <View style={styles.actions}>
            {announcement?.button_link ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  handleClose();
                  if (announcement.button_link?.startsWith('http')) {
                    Linking.openURL(announcement.button_link);
                  } else {
                    const route = announcement.button_link || '';
                    if (route === '/create') {
                      Linking.openURL('rektoapp://create');
                    } else if (route === '/top-results') {
                      Linking.openURL('rektoapp://top-results');
                    }
                  }
                }}
              >
                <Text style={styles.primaryButtonText}>{buttonText || 'زیاتر بزانە'}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.secondaryButton} onPress={handleClose}>
              <Text style={styles.secondaryButtonText}>داخستن</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay.dark,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    card: {
      width: '100%',
      borderRadius: borderRadius.card,
      backgroundColor: colors.card.background,
      padding: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground.DEFAULT,
      textAlign: 'left',
    },
    closeButton: {
      padding: spacing.xs,
    },
    message: {
      fontSize: 14,
      color: colors.foreground.muted,
      textAlign: 'left',
      marginBottom: spacing.lg,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'flex-end',
    },
    primaryButton: {
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    primaryButtonText: {
      color: '#fff',
      fontWeight: '600',
    },
    secondaryButton: {
      backgroundColor: colors.border.DEFAULT,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    secondaryButtonText: {
      color: colors.foreground.DEFAULT,
      fontWeight: '600',
    },
  });
