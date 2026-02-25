import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing } from '@/theme/spacing';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, Flame, Heart, TrendingUp, Zap } from 'lucide-react-native';
import React, { useEffect, useMemo } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function Index() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useLanguage();
  const { colors } = useTheme();

  const gradientColors = ['#FAF9FC', '#F3F0F9', '#EBE5F5'];

  const styles = createStyles(colors);

  const content = useMemo(() => ({
    ckb: {
      headline: 'ڕیکلامی کاریگەر.',
      subheadline: 'متمانەی بازاڕکارەکان کە ئەنجام دەوێن، نەک ئاڵۆزی.',
      bubbles: [
        { icon: 'flame', text: '+٣٢٠٪ قازانج', color: '#F97316' },
        { icon: 'heart', text: 'موشتەریەکان حەزیان لە ڕێکتۆیە', color: '#EC4899' },
        { icon: 'zap', text: 'ڕیکلام لە چەند خولەکێکدا', color: '#8B5CF6' },
        { icon: 'check-circle', text: 'بەبێ بەڕێوەبەری ڕیکلام', color: '#22C55E' },
      ],
      tagline: '"چیرۆکی سەرکەوتنت لێرەوە دەست پێدەکات."',
      continueButton: 'بەردەوام بە',
      chooseLanguage: 'زمانەکەت هەڵبژێرە',
    },
    ar: {
      headline: 'إعلانات تحقق نتائج.',
      subheadline: 'موثوق من المسوقين الذين يريدون نتائج، وليس تعقيداً.',
      bubbles: [
        { icon: 'flame', text: '+٣٢٠٪ عائد', color: '#F97316' },
        { icon: 'heart', text: 'العملاء يحبون ريكتو', color: '#EC4899' },
        { icon: 'zap', text: 'إعلانات في دقائق', color: '#8B5CF6' },
        { icon: 'check-circle', text: 'بدون مدير إعلانات', color: '#22C55E' },
      ],
      tagline: '"قصة نجاحك تبدأ من هنا."',
      continueButton: 'متابعة',
      chooseLanguage: 'اختر لغتك',
    },
  }), []);

  const localized = content[language as 'ckb' | 'ar'] || content.ckb;
  const bubbleIcons = {
    'flame': Flame,
    'heart': Heart,
    'zap': Zap,
    'check-circle': CheckCircle,
  } as const;
  const rotations = [-2, 2, -1.5, 2.5];

  const Bubble = ({ index, label, color, Icon }: { index: number; label: string; color: string; Icon: any }) => {
    const translateY = useSharedValue(0);

    useEffect(() => {
      translateY.value = withRepeat(
        withSequence(
          withDelay(index * 250, withTiming(-10, { duration: 1250, easing: Easing.inOut(Easing.ease) })),
          withTiming(0, { duration: 1250, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }, [index, translateY]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateY: translateY.value },
        { rotate: `${rotations[index]}deg` },
      ],
    }));

    return (
      <Animated.View style={[styles.bubble, animatedStyle]}>
        <Icon size={16} color={color} />
        <Text style={styles.bubbleText} weight="bold">
          {label}
        </Text>
      </Animated.View>
    );
  };

  const buttonScale = useSharedValue(1);
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.glowOrbTop} pointerEvents="none" />
      <View style={styles.glowOrbBottom} pointerEvents="none" />
      <View style={[styles.content, { paddingTop: insets.top }]}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.headline} weight="bold">
          {localized.headline}
        </Text>
        <Text style={styles.subheadline} weight="regular">
          {localized.subheadline}
        </Text>

        <View style={styles.bubbleGrid}>
          {localized.bubbles.map((bubble, index) => {
            const Icon = bubbleIcons[bubble.icon as keyof typeof bubbleIcons] || TrendingUp;
            return (
              <Bubble
                key={`${bubble.text}-${index}`}
                index={index}
                label={bubble.text}
                color={bubble.color}
                Icon={Icon}
              />
            );
          })}
        </View>

        <Text style={styles.chooseLanguageText} weight="regular">
          {localized.chooseLanguage}
        </Text>
        <View style={styles.languageSelector} pointerEvents="box-none">
          {(['ckb', 'ar'] as const).map((lang) => {
            const isActive = language === lang;
            return (
              <TouchableOpacity
                key={lang}
                style={[styles.languageOption, isActive && styles.languageOptionActive]}
                onPress={() => setLanguage(lang)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.languageOptionText,
                    isActive && styles.languageOptionTextActive,
                  ]}
                  weight="medium"
                >
                  {lang === 'ckb' ? 'کوردی' : 'العربية'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.tagline} weight="regular">
          {localized.tagline}
        </Text>

        <Animated.View style={[styles.primaryButtonContainer, buttonAnimatedStyle]}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
            activeOpacity={0.9}
            onPressIn={() => { buttonScale.value = withTiming(0.98, { duration: 120 }); }}
            onPressOut={() => { buttonScale.value = withTiming(1, { duration: 120 }); }}
          >
            <LinearGradient
              colors={['#7C3AED', '#9333EA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText} weight="semiBold">
                {localized.continueButton}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
            <Text style={styles.footerLink}>Terms</Text>
          </TouchableOpacity>
          <Text style={styles.footerSeparator}> • </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Privacy')}>
            <Text style={styles.footerLink}>Privacy</Text>
          </TouchableOpacity>
          <Text style={styles.footerSeparator}> • </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Refund')}>
            <Text style={styles.footerLink}>Refund</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    direction: 'ltr',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 60,
    paddingBottom: 32,
    direction: 'ltr',
  },
  glowOrbTop: {
    position: 'absolute',
    top: -60,
    start: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#D8CCF0',
    opacity: 0.45,
  },
  glowOrbBottom: {
    position: 'absolute',
    bottom: -80,
    end: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#E0D6F4',
    opacity: 0.45,
  },
  logo: {
    height: 160,
    width: '100%',
    maxWidth: 220,
    marginBottom: spacing[6],
  },
  headline: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subheadline: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  bubbleGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing[12],
    direction: 'ltr',
  },
  bubble: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background.DEFAULT,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    shadowColor: 'rgba(139, 92, 246, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  bubbleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
  },
  chooseLanguageText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 10,
  },
  languageSelector: {
    width: '100%',
    backgroundColor: colors.card.background,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    direction: 'ltr',
  },
  languageOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  languageOptionActive: {
    backgroundColor: '#7C3AED',
  },
  languageOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  languageOptionTextActive: {
    color: colors.primary.foreground,
  },
  tagline: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#9CA3AF',
    marginBottom: 16,
  },
  primaryButtonContainer: {
    width: '100%',
    marginBottom: spacing[3],
    shadowColor: 'rgba(124, 58, 237, 0.5)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButton: {
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 40,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.primary.foreground,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    marginTop: spacing[8],
    alignItems: 'center',
    paddingBottom: spacing[8],
  },
  footerLink: {
    color: colors.foreground.muted,
    fontSize: 12,
  },
  footerSeparator: {
    color: colors.foreground.subtle,
    fontSize: 12,
  },
});
