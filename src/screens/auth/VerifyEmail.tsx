import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mail } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius } from '@/theme/spacing';
import { Text } from '@/components/common/Text';

export function VerifyEmail() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Mail size={64} color={colors.primary.DEFAULT} />
        </View>
        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.subtitle}>
          We've sent a verification code to your email address. Please check your inbox and enter the code to verify your account.
        </Text>
        <TouchableOpacity
          style={styles.buttonContainer}
          onPress={() => (navigation as any).navigate('Auth', { screen: 'VerifyCode' })}
        >
          <LinearGradient
            colors={['#7C3AED', '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Enter Verification Code</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.resendButton}
          onPress={() => {
            // Resend verification
          }}
        >
          <Text style={styles.resendText}>Resend Code</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.status.scheduled.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.foreground.muted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: spacing.md,
  },
  button: {
    borderRadius: borderRadius.button,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.primary.foreground,
    fontSize: 17,
    fontWeight: '600',
  },
  resendButton: {
    padding: spacing.md,
  },
  resendText: {
    color: colors.primary.DEFAULT,
    fontSize: 14,
    fontWeight: '500',
  },
});
