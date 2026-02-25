import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/common/Text';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  MessageCircle, 
  Instagram, 
  Facebook, 
  Phone,
  Send,
  Globe,
  Music2,
  Twitter,
  Linkedin,
  Youtube,
  AtSign,
  Store
} from 'lucide-react-native';

// Platform icon configuration with exact brand colors
const createPlatformIcons = (themeColors: any): Record<string, { icon: any; color: string }> => ({
  whatsapp: { icon: MessageCircle, color: '#25D366' },
  viber: { icon: Phone, color: '#7360F2' },
  instagram: { icon: Instagram, color: '#E4405F' },
  facebook: { icon: Facebook, color: '#1877F2' },
  phone: { icon: Phone, color: '#1A1A2E' },
  telegram: { icon: Send, color: '#0088CC' },
  tiktok: { icon: Music2, color: themeColors.foreground.DEFAULT },
  twitter: { icon: Twitter, color: '#1DA1F2' },
  linkedin: { icon: Linkedin, color: '#0A66C2' },
  youtube: { icon: Youtube, color: '#FF0000' },
  email: { icon: AtSign, color: '#EA4335' },
  website: { icon: Globe, color: '#64748B' },
  korek_phone: { icon: Phone, color: '#FF6B00' },
  asiacell_phone: { icon: Phone, color: '#00A650' },
  zain_phone: { icon: Phone, color: '#6E2585' },
  app_store: { icon: Store, color: '#007AFF' },
  google_play: { icon: Store, color: '#34A853' },
});

interface MiniLinkPreviewProps {
  displayName: string;
  avatarUrl?: string | null;
  platforms: Record<string, string>; // { whatsapp: "123", instagram: "@user" }
  platformOrder: string[];
  cta: string | null;
  theme?: string;
}

export const MiniLinkPreview: React.FC<MiniLinkPreviewProps> = ({
  displayName,
  avatarUrl,
  platforms,
  platformOrder,
  cta,
  theme = 'light',
}) => {
  const { colors } = useTheme();
  const PLATFORM_ICONS = createPlatformIcons(colors);
  const styles = createStyles(colors);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  // Get active platforms (those with values) in order
  const activePlatforms = platformOrder.filter(
    (platform) => platforms[platform] && platforms[platform].trim() !== ''
  );

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <View style={styles.phoneFrame}>
      {/* Phone notch - more realistic */}
      <View style={styles.notch} />
      
      {/* Content */}
      <View style={styles.content}>
        {/* Avatar - React Native requires source={{ uri }} and explicit dimensions */}
        <View style={styles.avatarContainer}>
          {avatarUrl && typeof avatarUrl === 'string' && avatarUrl.startsWith('https://') && !imageFailed ? (
            <ExpoImage
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              contentFit="cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
            </View>
          )}
        </View>

        {/* Display Name */}
        <Text style={styles.displayName} numberOfLines={1}>
          {displayName || 'Untitled'}
        </Text>

        {/* Platform Icons Row */}
        {activePlatforms.length > 0 && (
          <View style={styles.platformsRow}>
            {activePlatforms.slice(0, 5).map((platform) => {
              const config = PLATFORM_ICONS[platform];
              if (!config) return null;
              const IconComponent = config.icon;
              
              // Handle Instagram gradient
              if (platform === 'instagram') {
                return (
                  <LinearGradient
                    key={platform}
                    colors={['#F58529', '#DD2A7B', '#8134AF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.platformIcon}
                  >
                    <IconComponent size={12} color={colors.primary.foreground} />
                  </LinearGradient>
                );
              }
              
              return (
                <View
                  key={platform}
                  style={[styles.platformIcon, { backgroundColor: config.color }]}
                >
                  <IconComponent size={12} color={colors.primary.foreground} />
                </View>
              );
            })}
          </View>
        )}

        {/* CTA Button */}
        {cta && (
          <View style={styles.ctaButton}>
            <Text style={styles.ctaText}>
              {cta === 'CONTACT_US' ? 'Contact Us' : 'Send Message'}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footerContainer}>
          <Text style={styles.footer}>Powered by Rekto</Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  phoneFrame: {
    width: 120,
    height: 200,
    backgroundColor: colors.card.background,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.border.DEFAULT,
    overflow: 'hidden',
    // Enhanced shadow for depth
    shadowColor: colors.border.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  notch: {
    width: 40,
    height: 6,
    backgroundColor: colors.border.DEFAULT,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    justifyContent: 'space-between',
  },
  avatarContainer: {
    marginBottom: 6,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border.light,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    // Subtle shadow for depth
    shadowColor: colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    color: colors.primary.foreground,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  displayName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
    marginBottom: 10,
    textAlign: 'center',
    maxWidth: 100,
    // Better text rendering
    includeFontPadding: false,
  },
  platformsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10,
    width: '100%',
    minHeight: 24,
  },
  platformIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    // Subtle shadow for depth
    shadowColor: colors.border.DEFAULT,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  ctaButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    width: '100%',
    marginBottom: 6,
    // Enhanced shadow
    shadowColor: colors.border.DEFAULT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  ctaText: {
    color: colors.primary.foreground,
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
  footerContainer: {
    marginTop: 'auto',
    paddingTop: 4,
  },
  footer: {
    fontSize: 6,
    color: colors.foreground.muted,
    textAlign: 'center',
    letterSpacing: 0.2,
    includeFontPadding: false,
  },
});

export default MiniLinkPreview;
