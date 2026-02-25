import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Gift,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Plus,
  ExternalLink,
  Megaphone,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { iconTransformRTL } from '@/utils/rtl';
import { getFontFamily } from '@/utils/getFontFamily';
import { formatDistanceToNow, format } from 'date-fns';
import { useNavigation } from '@react-navigation/native';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info' | 'admin' | 'discount';
  is_read: boolean;
  created_at: string;
  campaign_id?: string;
}

const NOTIFICATION_COLORS = {
  success: '#22C55E',
  warning: '#EAB308',
  error: '#EF4444',
  admin: '#A855F7',
  info: '#3B82F6',
};

interface NotificationDetailModalProps {
  visible: boolean;
  notification: Notification | null;
  onClose: () => void;
  onMarkAsRead?: (id: string) => void;
  onViewCampaign?: (campaignId: string) => void;
  onCreateAd?: () => void;
}

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  visible,
  notification,
  onClose,
  onMarkAsRead,
  onViewCampaign,
  onCreateAd,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t, language, isRTL } = useLanguage();
  const navigation = useNavigation<any>();

  const fontFamily = getFontFamily(language as 'ckb' | 'ar', 'regular');
  const fontFamilySemiBold = getFontFamily(language as 'ckb' | 'ar', 'semibold');
  const fontFamilyMedium = getFontFamily(language as 'ckb' | 'ar', 'medium');
  const fontFamilyBold = getFontFamily(language as 'ckb' | 'ar', 'bold');
  const styles = createStyles(colors, insets, fontFamily, fontFamilySemiBold, fontFamilyMedium, fontFamilyBold, isRTL);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Bounce animation for Gift icon
      if (notification?.type === 'discount' || notification?.type === 'admin') {
        Animated.loop(
          Animated.sequence([
            Animated.timing(bounceAnim, {
              toValue: 1.2,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(bounceAnim, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      bounceAnim.setValue(1);
    }
  }, [visible, notification?.type]);

  if (!notification) return null;

  const msgStr = (notification.message && String(notification.message)) || '';
  const titleStr = (notification.title && String(notification.title)) || '';
  const isDiscountNotification =
    notification.type === 'admin' ||
    notification.type === 'discount' ||
    titleStr.toLowerCase().includes('discount') ||
    msgStr.toLowerCase().includes('discount') ||
    msgStr.toLowerCase().includes('خەسم') ||
    msgStr.toLowerCase().includes('داشکان');

  const getIcon = () => {
    const size = 22;
    if (isDiscountNotification) {
      return (
        <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
          <Gift size={size} color={colors.primary.DEFAULT} />
        </Animated.View>
      );
    }
    switch (notification.type) {
      case 'success':
        return <CheckCircle size={size} color={colors.success} />;
      case 'warning':
        return <AlertTriangle size={size} color={colors.warning} />;
      case 'error':
        return <AlertCircle size={size} color={colors.error} />;
      case 'admin':
        return <Megaphone size={size} color={colors.primary.DEFAULT} />;
      default:
        return <Info size={size} color={colors.info} />;
    }
  };

  const handleCTAPress = () => {
    if (notification.campaign_id && onViewCampaign) {
      onViewCampaign(notification.campaign_id);
    } else if (onCreateAd) {
      onCreateAd();
    } else {
      // Fallback to navigation
      if (notification.campaign_id) {
        navigation.navigate('CampaignDetail' as never, { campaignId: notification.campaign_id } as never);
      } else {
        navigation.navigate('Main' as never, { screen: 'CreateAd' } as never);
      }
    }
    onClose();
  };

  const handleClose = () => {
    if (!notification.is_read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    onClose();
  };

  const sanitizeNotificationText = (value: string, fallback: string) => {
    // Display text as-is - backend should send correct language
    return value || fallback;
  };

  /** Fix erroneous ".review" / ". is" in server messages (leading dot after space). */
  const normalizeMessage = (msg: string) => {
    if (!msg || typeof msg !== 'string') return msg;
    return msg.replace(/\s+\.(\w)/g, ' $1').trim();
  };

  const formatRelativeTime = (date: Date) => {
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) {
      return language === 'ckb' ? 'ئێستا' : 'الآن';
    }
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    if (years > 0) {
      return language === 'ckb' ? `${years} ساڵ پێش` : `منذ ${years} سنة`;
    }
    if (months > 0) {
      return language === 'ckb' ? `${months} مانگ پێش` : `منذ ${months} شهر`;
    }
    if (weeks > 0) {
      return language === 'ckb' ? `${weeks} هەفتە پێش` : `منذ ${weeks} أسبوع`;
    }
    if (days > 0) {
      return language === 'ckb' ? `${days} ڕۆژ پێش` : `منذ ${days} يوم`;
    }
    if (hours > 0) {
      return language === 'ckb' ? `${hours} کاتژمێر پێش` : `منذ ${hours} ساعة`;
    }
    return language === 'ckb' ? `${minutes} خولەک پێش` : `منذ ${minutes} دقيقة`;
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.card}>
          <View style={styles.cardGlowTop} pointerEvents="none" />
          <View style={styles.cardGlowBottom} pointerEvents="none" />
          <View style={[styles.header, isRTL && styles.headerRTL]}>
            <TouchableOpacity
              style={[styles.closeButton, isRTL && styles.closeButtonRTL]}
              onPress={handleClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X color={colors.foreground.DEFAULT} size={22} />
            </TouchableOpacity>
            <Image
              source={require('../../../assets/images/logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={[styles.subTitle, isRTL && styles.textRTL]}>
              {isDiscountNotification ? t('specialOfferLabel') : t('notificationLabel')}
            </Text>
            <Text style={[styles.title, isRTL && styles.textRTL]} numberOfLines={2} allowFontScaling>
              {sanitizeNotificationText(notification.title, t('notificationTitleGeneric'))}
            </Text>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.messageRow, isRTL && styles.messageRowRTL]}>
              <View style={styles.iconBadge}>{getIcon()}</View>
              <Text style={[styles.message, isRTL && styles.textRTL]}>
                {normalizeMessage(sanitizeNotificationText(notification.message, t('notificationMessageGeneric')))}
              </Text>
            </View>
            <View style={styles.metadata}>
              <Text style={styles.dateText}>
                {format(new Date(notification.created_at), 'yyyy/MM/dd • HH:mm')}
              </Text>
              <View style={styles.timeAgoBadge}>
                <Text style={styles.timeAgoText}>
                  {formatRelativeTime(new Date(notification.created_at))}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.actions, isRTL && styles.actionsRTL]}>
            <TouchableOpacity
              style={[styles.primaryButton, styles.actionButtonFill, isRTL && styles.primaryButtonRTL]}
              onPress={handleCTAPress}
            >
              {notification.campaign_id ? (
                <>
                  <ExternalLink color={colors.primary.foreground} size={18} style={iconTransformRTL()} />
                  <Text style={[styles.primaryButtonText, isRTL && styles.textRTL]} numberOfLines={2} adjustsFontSizeToFit>{t('viewCampaign')}</Text>
                </>
              ) : (
                <>
                  <Plus color={colors.primary.foreground} size={18} style={iconTransformRTL()} />
                  <Text style={[styles.primaryButtonText, isRTL && styles.textRTL]} numberOfLines={2} adjustsFontSizeToFit>{t('createNewAd')}</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryButton, styles.actionButtonFill]} onPress={handleClose}>
              <Text style={[styles.secondaryButtonText, isRTL && styles.textRTL]} numberOfLines={2} adjustsFontSizeToFit>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (
  colors: any,
  insets: any,
  fontFamily: string,
  fontFamilySemiBold: string,
  fontFamilyMedium: string,
  fontFamilyBold: string,
  isRTL?: boolean
) =>
  StyleSheet.create({
    // Use one deterministic row direction across modal layout.
    // Prevents mixed LTR/RTL row structures on iOS.
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    backgroundColor: colors.overlay.dark,
      padding: 16,
    },
    backdrop: {
      flex: 1,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      borderRadius: 28,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.primary.DEFAULT + '40',
      backgroundColor: colors.card.background,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
    cardGlowTop: {
      position: 'absolute',
      top: -80,
      end: -60,
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: colors.primary.DEFAULT,
      opacity: 0.08,
    },
    cardGlowBottom: {
      position: 'absolute',
      bottom: -100,
      start: -80,
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: colors.primary.DEFAULT,
      opacity: 0.06,
    },
    header: {
      paddingTop: 24,
      paddingBottom: 16,
      paddingHorizontal: 24,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border.DEFAULT,
    },
    headerRTL: {
      flexDirection: 'row',
    },
    closeButton: {
      position: 'absolute',
      top: 12,
      end: 12,
      padding: 8,
      zIndex: 10,
    },
    closeButtonRTL: {
      end: undefined,
      start: 12,
    },
    messageRowRTL: {
      flexDirection: 'row',
    },
    textRTL: {
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    actionsRTL: {
      flexDirection: 'row',
    },
    primaryButtonRTL: {
      flexDirection: 'row',
    },
    headerLogo: {
      width: 120,
      height: 44,
      marginBottom: 8,
    },
    subTitle: {
      fontSize: 12,
      fontFamily: fontFamilyMedium,
      color: colors.foreground.muted,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    title: {
      fontSize: 20,
      fontFamily: fontFamilyBold,
      color: colors.foreground.DEFAULT,
      textAlign: 'center',
      flexShrink: 1,
      paddingHorizontal: 8,
    },
    content: {
      maxHeight: 300,
    },
    contentContainer: {
      padding: 20,
      gap: 16,
    },
    messageRow: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
      backgroundColor: colors.background.secondary,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    iconBadge: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background.secondary,
    },
    message: {
      flex: 1,
      fontSize: 15,
      fontFamily: fontFamily,
      color: colors.foreground.DEFAULT,
      lineHeight: 22,
    },
    metadata: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 32,
    },
  dateText: {
    fontSize: 14,
    fontFamily: fontFamily,
    color: colors.foreground.muted,
  },
  timeAgoBadge: {
    backgroundColor: colors.overlay.medium,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeAgoText: {
    fontSize: 12,
    fontFamily: fontFamily,
    color: colors.foreground.muted,
  },
    actions: {
      flexDirection: 'row',
      gap: 12,
      padding: 20,
      paddingBottom: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border.DEFAULT,
      width: '100%',
    },
    actionButtonFill: {
      flex: 1,
      minWidth: 0,
      minHeight: 48,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 999,
      backgroundColor: colors.primary.DEFAULT,
      minHeight: 48,
    },
    primaryButtonText: {
      fontSize: 15,
      fontFamily: fontFamilySemiBold,
      color: colors.primary.foreground,
      flexShrink: 1,
    },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: fontFamilyMedium,
    color: colors.foreground.DEFAULT,
  },
  });
