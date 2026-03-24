import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { AdaptiveSlider } from '@/components/common/AdaptiveSlider';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

/**
 * Non-linear visual mapping for budget slider (matches web).
 * $10 → 0%, $20 → 12%, $21–$100 → linear 12% to 100%.
 */
export function getVisualPercentage(val: number): number {
  if (val <= 10) return 0;
  if (val === 20) return 12;
  if (val >= 100) return 100;
  const range = 100 - 21;
  const position = val - 21;
  return 12 + (position / range) * 88;
}

function visualToValue(visualPercent: number, tenDollarEnabled: boolean): number {
  if (visualPercent <= 0) return tenDollarEnabled ? 10 : 20;
  if (visualPercent < 12) return 20;
  if (visualPercent >= 100) return 100;
  const t = (visualPercent - 12) / 88;
  return Math.round(21 + t * 79);
}

interface BudgetSliderProps {
  value: number;
  onChange: (value: number) => void;
  budgetValues: number[];
  tenDollarEnabled: boolean;
  isRTL?: boolean;
  language?: 'ckb' | 'ar';
}

export const BudgetSlider: React.FC<BudgetSliderProps> = ({
  value,
  onChange,
  tenDollarEnabled,
  language: languageProp,
  isRTL,
}) => {
  const { colors } = useTheme();
  const { language: contextLang } = useLanguage();
  const language = (languageProp ?? contextLang) as 'ckb' | 'ar';
  const styles = createStyles(colors, language, isRTL ?? false);

  const visualPercent = getVisualPercentage(value);

  const handleSliderChange = (visual: number) => {
    const budget = visualToValue(visual, tenDollarEnabled);
    if (budget !== value) onChange(budget);
  };

  return (
    <View style={styles.container}>
      <View style={styles.quickSelectRow}>
        <View style={styles.quickLeft}>
          {tenDollarEnabled && (
            <Pressable
              onPress={() => onChange(10)}
              style={[styles.quickChip, value === 10 && styles.quickChipActive]}
            >
              <Text style={[styles.quickText, value === 10 && styles.quickTextActive, { writingDirection: 'ltr' }]}>$10</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => onChange(20)}
            style={[styles.quickChip, value === 20 && styles.quickChipActive]}
          >
            <Text style={[styles.quickText, value === 20 && styles.quickTextActive, { writingDirection: 'ltr' }]}>$20</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => onChange(100)}
          style={[styles.quickChip, value === 100 && styles.quickChipActive]}
        >
          <Text style={[styles.quickText, value === 100 && styles.quickTextActive, { writingDirection: 'ltr' }]}>$100</Text>
        </Pressable>
      </View>

      <AdaptiveSlider
        minimumValue={0}
        maximumValue={100}
        step={0.5}
        value={visualPercent}
        onValueChange={handleSliderChange}
        minimumTrackTintColor={colors.primary?.DEFAULT ?? '#7C3AED'}
        maximumTrackTintColor={colors.border?.DEFAULT ?? '#E4E4E7'}
        thumbTintColor={colors.primary?.DEFAULT ?? '#7C3AED'}
        style={styles.slider}
      />
    </View>
  );
};

const createStyles = (colors: any, _language?: 'ckb' | 'ar', isRTL?: boolean) => {
  return StyleSheet.create({
    container: {
      width: '100%',
      marginTop: 4,
    },
    quickSelectRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    quickLeft: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    quickChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#E4E4E7',
      backgroundColor: colors.background?.secondary ?? '#F4F4F5',
    },
    quickChipActive: {
      borderColor: '#C4B5FD',
      backgroundColor: '#EDE9FE',
    },
    quickText: {
      color: '#71717A',
      fontSize: 14,
      fontFamily: 'Poppins-SemiBold',
    },
    quickTextActive: {
      color: '#7C3AED',
    },
    slider: {
      width: '100%',
      height: 40,
    },
  });
};
