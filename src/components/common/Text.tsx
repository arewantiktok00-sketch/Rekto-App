/**
 * Global Text component that automatically applies fonts based on language
 * Use this instead of React Native's Text component throughout the app
 */
import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet, TextStyle } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { isRTL } from '@/utils/rtl';
import { getFontFamilyWithWeight, fonts } from '@/utils/fonts';
import { getNumberFontFamily } from '@/utils/getFontFamily';

interface TextProps extends RNTextProps {
  weight?: 'regular' | 'medium' | 'semiBold' | 'bold';
  useNumbersFont?: boolean; // Use Poppins-Bold for numbers even in RTL
}

const mapFontWeight = (fontWeight?: string | number) => {
  if (!fontWeight) return undefined;
  const normalized = typeof fontWeight === 'number' ? fontWeight.toString() : fontWeight;
  if (normalized === '700' || normalized === 'bold' || normalized === '800' || normalized === '900') return 'bold';
  if (normalized === '600' || normalized === 'semiBold') return 'semiBold';
  if (normalized === '500' || normalized === 'medium') return 'medium';
  return 'regular';
};

export const Text: React.FC<TextProps> = ({ 
  style, 
  weight,
  useNumbersFont = false,
  children,
  ...props 
}) => {
  const { language } = useLanguage();
  const rtl = isRTL(language);
  
  // For numbers, always use Poppins-Bold regardless of language
  const flattenedStyle = StyleSheet.flatten(style) || {};
  const inferredWeight = weight ?? mapFontWeight(flattenedStyle.fontWeight) ?? 'regular';
  const textValue =
    typeof children === 'string'
      ? children
      : Array.isArray(children)
        ? children.filter((child) => typeof child === 'string').join('')
        : '';
  const hasArabicScript = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(textValue);
  const effectiveLanguage = hasArabicScript ? ('ckb' as const) : (language as 'ckb' | 'ar');
  const fontFamily = useNumbersFont
    ? fonts.bold
    : getFontFamilyWithWeight(effectiveLanguage, inferredWeight);
  const { fontFamily: _ignoredFontFamily, fontWeight: _ignoredFontWeight, textAlign: styleTextAlign, writingDirection: styleWritingDirection, ...restStyle } = flattenedStyle;

  // RTL: all text right-aligned for ckb/ar unless explicitly centered. Numbers use LTRNumber.
  const rtlTextAlign =
    styleTextAlign === 'center'
      ? 'center'
      : rtl
        ? 'right'
        : (styleTextAlign ?? 'left');
  const rtlWritingDirection = styleWritingDirection ?? (rtl ? 'rtl' : 'ltr');
  const safeFontFamily = fontFamily || 'Poppins-Regular';

  console.log('TEXT_DEBUG', {
    fontFamily,
    rtl,
    rtlTextAlign,
    styleTextAlign,
    children: typeof children === 'string' ? children.substring(0, 20) : 'node',
  });

  return (
    <RNText
      style={[
        restStyle,
        { fontFamily: safeFontFamily, textAlign: rtlTextAlign, writingDirection: rtlWritingDirection },
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};

/** Numbers, prices, dates — always LTR and Poppins. Use for $20, 394.7K, 36,830 IQD. */
export const LTRNumber: React.FC<RNTextProps & { weight?: 'regular' | 'medium' | 'semibold' | 'bold' }> = ({
  style,
  weight = 'regular',
  ...props
}) => (
  <RNText
    style={[
      { writingDirection: 'ltr', textAlign: 'left', fontFamily: getNumberFontFamily(weight) },
      style as TextStyle,
    ]}
    {...props}
  />
);
