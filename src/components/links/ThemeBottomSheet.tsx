import { Text } from '@/components/common/Text';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { borderRadius, spacing } from '@/theme/spacing';
import { safeCall } from '@/utils/safeCall';
import { Check, X } from 'lucide-react-native';
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ThemeBottomSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface ThemeBottomSheetProps {
  selectedTheme: string;
  onSelectTheme: (themeId: string) => void;
}

interface ThemeFromAPI {
  id: string;
  name: string;
  category: 'men' | 'women';
  animation: string;
  preview_image_url: string;
  colors: {
    primary: string;
    background: string;
    text: string;
  };
  styling: {
    background: string;
    backgroundOverlay?: string;
    accentColor: string;
    textColor: string;
    cardBg: string;
    cardBorder: string;
  };
}

interface ThemeCard {
  id: string;
  name: string;
  category: 'elegant' | 'classic';
  colors: {
    bg: string;
    bgGradient?: string[];
    card: string;
    text: string;
  };
}

const { width } = Dimensions.get('window');
const THEME_CARD_WIDTH = (width - spacing.md * 3) / 2;
const THEME_CARD_HEIGHT = THEME_CARD_WIDTH * (16 / 9);

export const ThemeBottomSheet = forwardRef<ThemeBottomSheetRef, ThemeBottomSheetProps>(
  function ThemeBottomSheet({ selectedTheme, onSelectTheme }, ref) {
    const { colors } = useTheme();
    const { language, isRTL } = useLanguage();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [apiThemes, setApiThemes] = useState<ThemeCard[]>([]);
    const [error, setError] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      present: () => {
        setVisible(true);
        if (apiThemes.length === 0 && !loading) {
          loadThemes().catch((err) => {
            setError(err.message || 'Failed to load themes from server');
          });
        }
      },
      dismiss: () => setVisible(false),
    }));

    const mapApiTheme = (apiTheme: ThemeFromAPI): ThemeCard => {
      const background = apiTheme.colors?.background || colors.card.background;
      const primary = apiTheme.colors?.primary || background;
      return {
        id: apiTheme.id,
        name: apiTheme.name || apiTheme.id,
        category: apiTheme.category === 'women' ? 'elegant' : 'classic',
        colors: {
          bg: background,
          bgGradient: [background, primary],
          card: apiTheme.styling?.cardBg || background,
          text: apiTheme.colors?.text || apiTheme.styling?.textColor || colors.foreground.DEFAULT,
        },
      };
    };

    const loadThemes = async () => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('links-themes', {
          method: 'GET',
        });

        if (error || !data?.success) {
          throw new Error(error?.message || 'Failed to load themes from server');
        }

        const allThemes = (data?.themes || []) as ThemeFromAPI[];
        const mappedThemes = allThemes.map(mapApiTheme);
        if (mappedThemes.length === 0) {
          throw new Error('No themes available from server');
        }

        setApiThemes(mappedThemes);
      } catch (error: any) {
        console.error('Error loading themes from API:', error);
        setApiThemes([]);
        throw error;
      } finally {
        setLoading(false);
      }
    };

    const styles = createStyles(colors, isRTL);
    const availableThemes = apiThemes;

    const renderThemeCard = (theme: ThemeCard) => {
      const isSelected = selectedTheme === theme.id;
      const defaultThemeColors = {
        bg: colors.background.DEFAULT,
        bgGradient: [colors.background.DEFAULT, colors.primary.DEFAULT],
        card: colors.card.background,
        text: colors.foreground.DEFAULT,
      };
      const safeColors = theme?.colors ?? defaultThemeColors;
      const hasGradient = Array.isArray(safeColors.bgGradient) && safeColors.bgGradient.length > 0;

      return (
        <TouchableOpacity
          style={[styles.themeCard, isSelected && styles.themeCardSelected]}
          onPress={() => {
            if (__DEV__) console.log('[Theme] User selected theme:', theme.id);
            safeCall(onSelectTheme, theme.id);
            setVisible(false);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.phonePreview}>
            {hasGradient && safeColors.bgGradient ? (
              <LinearGradient
                colors={safeColors.bgGradient as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.previewContainer}
              >
                {renderPreviewContent(theme, safeColors)}
              </LinearGradient>
            ) : (
              <View style={[styles.previewContainer, { backgroundColor: safeColors.bg }]}>
                {renderPreviewContent(theme, safeColors)}
              </View>
            )}
          </View>
          {isSelected && (
            <View style={styles.selectedIndicator}>
              <Check size={16} color={colors.primary.foreground} />
            </View>
          )}
          <Text style={styles.themeName}>{theme.name}</Text>
        </TouchableOpacity>
      );
    };

    const renderPreviewContent = (theme: ThemeCard, safeColors: ThemeCard['colors']) => {
      const isDark = safeColors.text === colors.primary.foreground;
      const cardBg = safeColors.card || colors.card.background;
      const textColor = safeColors.text;
      return (
        <View style={styles.previewContent}>
          <View
            style={[
              styles.miniAvatar,
              { backgroundColor: isDark ? colors.overlay.light : colors.overlay.medium },
            ]}
          >
            <Text style={[styles.miniAvatarText, { color: textColor }]}>F</Text>
          </View>
          <Text style={[styles.miniName, { color: textColor }]}>fpb9fp</Text>
          <View style={styles.miniLinks}>
            <View style={[styles.miniLink, { backgroundColor: cardBg }]}>
              <Text style={[styles.miniLinkText, { color: textColor }]}>WhatsApp</Text>
            </View>
            <View style={[styles.miniLink, { backgroundColor: cardBg }]}>
              <Text style={[styles.miniLinkText, { color: textColor }]}>Instagram</Text>
            </View>
            <View style={[styles.miniLink, { backgroundColor: cardBg }]}>
              <Text style={[styles.miniLinkText, { color: textColor }]}>Call</Text>
            </View>
          </View>
        </View>
      );
    };

    const listItems = useMemo(() => availableThemes, [availableThemes]);

    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setVisible(false)}
      >
        <View style={[styles.modalRoot, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeButton}>
              <X size={24} color="#1A1A2E" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>هەڵبژاردنی دیزاین</Text>
            <View style={{ width: 40 }} />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7C3AED" />
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setError(null);
                  loadThemes().catch((err) => {
                    setError(err.message || 'Failed to load themes from server');
                  });
                }}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : listItems.length === 0 ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>No themes available. Please check your connection.</Text>
            </View>
          ) : (
            <FlatList
              data={listItems}
              numColumns={2}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => renderThemeCard(item)}
              contentContainerStyle={styles.contentContainer}
              columnWrapperStyle={styles.columnWrapper}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      </Modal>
    );
  }
);

const createStyles = (colors: any, isRTL: boolean) =>
  StyleSheet.create({
    modalRoot: {
      flex: 1,
      backgroundColor: colors.card.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
      backgroundColor: colors.card.background,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontFamily: 'Rabar_021',
      fontWeight: '600',
      color: '#1A1A2E',
      flex: 1,
      textAlign: 'center',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: spacing.md,
    },
    errorText: {
      fontSize: 14,
      color: '#EF4444',
      textAlign: 'center',
      marginBottom: spacing.md,
      fontFamily: 'Rabar_021',
    },
    retryButton: {
      backgroundColor: '#7C3AED',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.sm,
    },
    retryButtonText: {
      color: colors.primary.foreground,
      fontSize: 14,
      fontWeight: '600',
      fontFamily: 'Rabar_021',
    },
    contentContainer: {
      paddingBottom: 100,
      paddingTop: 16,
      paddingHorizontal: spacing.md,
    },
    columnWrapper: {
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 12,
    },
    themeCard: {
      width: THEME_CARD_WIDTH,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: '#F8FAFC',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    themeCardSelected: {
      borderColor: '#7C3AED',
    },
    phonePreview: {
      width: '100%',
      aspectRatio: 9 / 16,
      borderRadius: 12,
      overflow: 'hidden',
    },
    previewContainer: {
      flex: 1,
      paddingTop: 20,
      paddingHorizontal: 12,
    },
    previewContent: {
      flex: 1,
      alignItems: 'center',
    },
    miniAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    miniAvatarText: {
      fontSize: 14,
      fontWeight: '600',
    },
    miniName: {
      fontSize: 10,
      fontWeight: '600',
      marginBottom: 12,
    },
    miniLinks: {
      width: '100%',
      gap: 6,
    },
    miniLink: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    miniLinkText: {
      fontSize: 8,
      fontWeight: '500',
    },
    selectedIndicator: {
      position: 'absolute',
      top: 8,
      end: 8,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#7C3AED',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    themeName: {
      fontSize: 12,
      fontFamily: 'Poppins',
      fontWeight: '500',
      color: '#1A1A2E',
      textAlign: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
  });
