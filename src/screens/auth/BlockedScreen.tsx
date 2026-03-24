import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, BackHandler, Linking, StatusBar, Platform, SafeAreaView } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { spacing, borderRadius } from '@/theme/spacing';
import { AlertTriangle, LogOut, Mail, MessageCircle } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Text } from '@/components/common/Text';

interface BlockedScreenProps {
  reason?: string | null;
}

export function BlockedScreen({ reason: routeReason }: BlockedScreenProps) {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { signOut, isBlocked, blockReason, user } = useAuth();
  const { colors } = useTheme();
  const { t, language, isRTL } = useLanguage();
  const styles = createStyles(colors, insets, isRTL);
  
  // Get reason from route params or auth context
  const reason = (route.params as any)?.reason || routeReason || blockReason;

  // Prevent back button from navigating away
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Block back button - user cannot navigate away
      return true;
    });

    return () => backHandler.remove();
  }, []);

  // Ensure user stays on this screen if they become blocked
  useFocusEffect(
    React.useCallback(() => {
      if (user && isBlocked) {
        // User is blocked, ensure they stay on this screen
        // Navigation is already handled by RootNavigator
      }
    }, [user, isBlocked])
  );

  const handleLogout = async () => {
    await signOut();
    // Navigation will be handled by RootNavigator after signOut
  };

  const handleContactSupport = async () => {
    // Open WhatsApp support
    const whatsappNumber = '9647504881516';
    const message = reason 
      ? `Hello, I need help with my suspended account. Reason: ${reason}`
      : 'Hello, I need help with my suspended account.';
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    
    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback to email
        handleEmailSupport();
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      handleEmailSupport();
    }
  };

  const handleEmailSupport = async () => {
    const supportEmail = 'Contact@Rekto.net';
    const subject = 'Account Suspension Appeal';
    const body = reason 
      ? `Hello,\n\nI would like to appeal my account suspension.\n\nReason provided: ${reason}\n\nThank you.`
      : 'Hello,\n\nI would like to appeal my account suspension.\n\nThank you.';
    
    const mailtoUrl = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      }
    } catch (error) {
      console.error('Error opening email:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>⛔</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Account Unavailable</Text>

        {/* Message */}
        <Text style={styles.message}>
          Your access to Rekto has been restricted due to a violation of our community guidelines or terms of service.
        </Text>

        {/* Reason if provided */}
        {reason && (
          <View style={styles.reasonContainer}>
            <Text style={styles.reasonLabel}>Reason:</Text>
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        )}

        {/* Quote */}
        <View style={styles.quoteContainer}>
          <Text style={styles.quote}>
            "Trust is built through consistent actions, not words alone."
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleContactSupport}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#7C3AED', '#9333EA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientButton}
            >
              <MessageCircle size={18} color={colors.primary.foreground} style={{ marginEnd: 8 }} />
              <Text style={[styles.primaryButtonText, isRTL && styles.textRTL]}>Contact Support</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleEmailSupport}
            activeOpacity={0.8}
          >
            <Mail size={18} color={colors.primary.foreground} style={{ marginEnd: 8 }} />
            <Text style={[styles.secondaryButtonText, isRTL && styles.textRTL]}>Email Support</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <LogOut size={18} color="#6B7280" style={{ marginEnd: 8 }} />
            <Text style={[styles.logoutButtonText, isRTL && styles.textRTL]}>Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          If you believe this is an error, please contact our support team for assistance.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, insets: any, isRTL?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingStart: 24,
    paddingEnd: 24,
    paddingTop: insets.top + 20,
    paddingBottom: insets.bottom + 20,
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary.foreground,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Poppins-Bold' : 'Poppins-Bold',
  },
  message: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: (isRTL ? 'right' : 'center') as 'left' | 'right' | 'center',
    writingDirection: isRTL ? 'rtl' : 'ltr',
    lineHeight: 24,
    marginBottom: 20,
    paddingStart: 16,
    paddingEnd: 16,
  },
  reasonContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  reasonLabel: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  reasonText: {
    fontSize: 14,
    color: '#FECACA',
    lineHeight: 20,
  },
  quoteContainer: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderStartWidth: 3,
    borderStartColor: '#7C3AED',
    width: '100%',
  },
  quote: {
    fontSize: 14,
    color: '#A78BFA',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryButtonText: {
    color: colors.primary.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.primary.foreground,
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: (isRTL ? 'right' : 'center') as 'left' | 'right' | 'center',
    writingDirection: isRTL ? 'rtl' : 'ltr',
    marginTop: 32,
    paddingStart: 32,
    paddingEnd: 32,
    lineHeight: 18,
  },
});
