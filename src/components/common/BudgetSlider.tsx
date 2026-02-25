import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { formatUSDEnglish } from '@/utils/currency';
import { getFontFamily } from '@/utils/getFontFamily';
import { ltrNumber, rtlIcon } from '@/utils/rtl';
import Slider from '@react-native-community/slider';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

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
  budgetValues,
  tenDollarEnabled,
  isRTL = false,
  language: languageProp,
}) => {
  const { colors } = useTheme();
  const { t, language: contextLang } = useLanguage();
  const language = (languageProp ?? contextLang) as 'ckb' | 'ar';
  const isCkbAr = language === 'ckb' || language === 'ar';
  const styles = createStyles(colors, isRTL, language);
  const getAmountLabel = (v: number) => (isCkbAr ? (v === 10 ? t('amount10USD') : v === 20 ? t('amount20USD') : v === 100 ? t('amount100USD') : formatUSDEnglish(v)) : formatUSDEnglish(v));

  const getNearestBudgetValue = (val: number) => {
    if (budgetValues.length === 0) return val;
    return budgetValues.reduce((closest, current) =>
      Math.abs(current - val) < Math.abs(closest - val) ? current : closest,
    budgetValues[0]);
  };

  const getVisualPercentage = (val: number): number => {
    if (val <= 10) return 0;
    if (val === 20) return 12;
    if (val >= 100) return 100;
    return 12 + ((val - 21) / 79) * 88;
  };

  const getValueFromVisualPosition = (percent: number): number => {
    const clamped = Math.max(0, Math.min(100, percent));

    if (tenDollarEnabled && clamped <= 6) return 10;
    if (clamped <= 12) return 20;
    if (clamped >= 99) return 100;

    const normalized = (clamped - 12) / 88;
    return Math.round(21 + normalized * 79);
  };

  const normalizedValue = getNearestBudgetValue(value);
  const visualPercentage = getVisualPercentage(normalizedValue);

  // Quick select; row order is mirrored natively in RTL
  const quickValues = tenDollarEnabled ? [10, 20, 100] : [20, 100];

  const markers = [
    { value: 10, percent: 0, visible: tenDollarEnabled },
    { value: 20, percent: 12, visible: true },
    { value: 100, percent: 100, visible: true },
  ].filter(marker => marker.visible);

  return (
    <View style={styles.container}>
      {/* Quick Select Buttons — RTL: mirror order (100, 20, 10) with spacing */}
      <View style={styles.quickSelectRow}>
        {quickValues.map((v) => (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            style={[
              styles.quickButton,
              value === v && styles.quickButtonActive,
            ]}
          >
            <Text style={[
              styles.quickButtonText,
              value === v && styles.quickButtonTextActive,
              ltrNumber,
            ]}>
              {getAmountLabel(v)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Slider + markers: RTL mirror track; labels stay LTR and un-flipped */}
      <View style={[styles.sliderAndMarkersWrap, isRTL && styles.sliderAndMarkersWrapRTL]}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          step={0.1}
          value={visualPercentage}
          onValueChange={(raw) => onChange(getValueFromVisualPosition(raw))}
          onSlidingComplete={(raw) => onChange(getValueFromVisualPosition(raw))}
          minimumTrackTintColor={colors.primary.DEFAULT}
          maximumTrackTintColor={colors.border.DEFAULT}
          thumbTintColor={colors.primary.DEFAULT}
        />
        <View style={styles.markersRow}>
          {markers.map((marker) => (
            <Pressable
              key={marker.value}
              onPress={() => onChange(marker.value)}
              style={[
                styles.markerWrapper,
                marker.percent === 0 ? { start: 0, end: undefined, alignItems: 'flex-start' as const } : undefined,
                marker.percent === 100 ? { end: 0, start: undefined, alignItems: 'flex-end' as const } : undefined,
                marker.percent > 0 && marker.percent < 100
                  ? { start: `${marker.percent}%`, end: undefined, marginStart: -10, alignItems: 'center' as const }
                  : undefined,
              ]}
            >
              <View
                style={[
                  styles.markerDot,
                  value === marker.value && styles.markerDotActive,
                ]}
              />
              {/* Un-flip label when parent is scaleX:-1 so numbers read LTR */}
              <View style={rtlIcon()}>
                <Text
                  style={[
                    styles.markerLabel,
                    value === marker.value && styles.markerLabelActive,
                    ltrNumber,
                  ]}
                >
                  {getAmountLabel(marker.value)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: any, isRTL?: boolean, language?: 'ckb' | 'ar') => {
  const lang = language ?? 'ckb';
  const fontSemibold = getFontFamily(lang, 'semibold');
  const fontMedium = getFontFamily(lang, 'medium');
  const rowDir = 'row';
  return StyleSheet.create({
  container: {
    gap: 12,
  },
  quickSelectRow: {
    flexDirection: rowDir,
    gap: 24,
    justifyContent: 'flex-start',
  },
  quickSelectRowRTL: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  quickButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.background.secondary || '#27272A',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickButtonActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  quickButtonText: {
    fontSize: 16,
    fontFamily: fontSemibold,
    color: colors.foreground.muted || '#A1A1AA',
  },
  quickButtonTextActive: {
    color: colors.primary.foreground,
  },
  sliderAndMarkersWrap: {
    width: '100%',
  },
  sliderAndMarkersWrapRTL: {
    transform: [{ scaleX: -1 }],
  },
  slider: {
    width: '100%',
    height: 40,
  },
  markersRow: {
    position: 'relative',
    height: 32,
    marginTop: 4,
    overflow: 'hidden',
    width: '100%',
  },
  markerWrapper: {
    position: 'absolute',
    flexDirection: rowDir,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border.DEFAULT,
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
  },
  markerDotActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  markerLabel: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: fontMedium,
    color: colors.foreground.muted || '#71717A',
  },
  markerLabelActive: {
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
});
};