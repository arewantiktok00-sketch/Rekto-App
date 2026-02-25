import { Platform, TextStyle } from 'react-native';
import { getFontFamilyWithWeight } from '@/utils/fonts';

/**
 * Typography system for Rekto App
 * Ensures proper letter spacing, line height, and font weights
 * for professional appearance
 * 
 * Uses PostScript font names from fonts.ts utility
 */

export interface TypographyStyles {
  h1: TextStyle;
  h2: TextStyle;
  h3: TextStyle;
  body: TextStyle;
  bodySmall: TextStyle;
  label: TextStyle;
  caption: TextStyle;
}

/**
 * Get typography styles based on language
 * English uses Poppins font family, Kurdish/Arabic uses Rabar_021
 * Note: Fonts must be loaded via expo-font in App.tsx
 */
export const getTypographyStyles = (language: 'ckb' | 'ar'): TypographyStyles => {
  const isRTL = true;
  // Use PostScript names from fonts utility
  const fontFamily = getFontFamilyWithWeight(language, 'regular');
  
  return {
    h1: {
      fontFamily: getFontFamilyWithWeight(language, 'bold'), // Use bold weight
      fontSize: 24,
      fontWeight: '700', // Bold for h1
      letterSpacing: isRTL ? 1 : 0.5, // More spacing for RTL to prevent overlap
      lineHeight: isRTL ? 40 : 32, // More line height for RTL (1.67x vs 1.33x)
      marginBottom: 8,
      includeFontPadding: false, // Prevent extra padding that causes overlap
    },
    h2: {
      fontFamily: getFontFamilyWithWeight(language, 'semiBold'), // Use semiBold weight
      fontSize: 20,
      fontWeight: '600', // SemiBold for h2 (headers)
      letterSpacing: isRTL ? 0.8 : 0.4,
      lineHeight: isRTL ? 34 : 28, // More line height for RTL (1.7x vs 1.4x)
      marginBottom: 6,
      includeFontPadding: false,
    },
    h3: {
      fontFamily: getFontFamilyWithWeight(language, 'semiBold'), // Use semiBold weight
      fontSize: 18,
      fontWeight: '600', // SemiBold for h3 (headers)
      letterSpacing: isRTL ? 0.6 : 0.3,
      lineHeight: isRTL ? 30 : 24, // More line height for RTL (1.67x vs 1.33x)
      marginBottom: 4,
      includeFontPadding: false,
    },
    body: {
      fontFamily,
      fontSize: 16,
      fontWeight: '400', // Regular for body
      letterSpacing: isRTL ? 0.5 : 0.3, // More spacing for RTL
      lineHeight: isRTL ? 28 : 22, // More line height for RTL (1.75x vs 1.375x)
      includeFontPadding: false,
    },
    bodySmall: {
      fontFamily,
      fontSize: 14,
      fontWeight: '400', // Regular for small body
      letterSpacing: isRTL ? 0.4 : 0.2,
      lineHeight: isRTL ? 24 : 20, // More line height for RTL (1.71x vs 1.43x)
      includeFontPadding: false,
    },
    label: {
      fontFamily: getFontFamilyWithWeight(language, 'medium'), // Use medium weight
      fontSize: 14,
      fontWeight: '500', // Medium for labels
      letterSpacing: isRTL ? 0.4 : 0.2,
      lineHeight: isRTL ? 24 : 20,
      color: '#6B7280', // gray-500
      includeFontPadding: false,
    },
    caption: {
      fontFamily,
      fontSize: 12,
      fontWeight: '400', // Regular for captions
      letterSpacing: isRTL ? 0.3 : 0.1,
      lineHeight: isRTL ? 20 : 16, // More line height for RTL (1.67x vs 1.33x)
      color: '#9CA3AF', // gray-400
      includeFontPadding: false,
    },
  };
};

/**
 * Get font family for a specific language
 * Uses PostScript names from fonts utility
 */
export const getFontFamily = (language: 'ckb' | 'ar'): string => {
  return getFontFamilyWithWeight(language, 'regular');
};

/**
 * Get SemiBold font style for headers and required hints
 */
export const getSemiBoldStyle = (language: 'ckb' | 'ar'): TextStyle => {
  const fontFamily = getFontFamilyWithWeight(language, 'semiBold');
  return {
    fontFamily,
    fontWeight: '600', // SemiBold
    includeFontPadding: false,
  };
};

/**
 * Card text styles with proper padding
 */
export const cardTextStyles = (language: 'ckb' | 'ar') => {
  const fontFamily = getFontFamilyWithWeight(language, 'regular');
  const fontFamilySemiBold = getFontFamilyWithWeight(language, 'semiBold');
  const isRTL = true;
  
  return {
    card: {
      padding: 16,
      marginBottom: 12,
      borderRadius: 12,
    },
    cardTitle: {
      fontFamily: fontFamilySemiBold, // Use semiBold for titles
      fontSize: 18,
      fontWeight: '600', // SemiBold for card titles
      letterSpacing: isRTL ? 0.6 : 0.3,
      lineHeight: isRTL ? 30 : 24,
      marginBottom: 8,
      includeFontPadding: false,
    },
    cardBody: {
      fontFamily,
      fontSize: 14,
      fontWeight: '400', // Regular for card body
      letterSpacing: isRTL ? 0.4 : 0.2,
      lineHeight: isRTL ? 24 : 20,
      includeFontPadding: false,
    },
  };
};

/**
 * Helper to apply typography to Text components
 */
export const applyTypography = (
  style: keyof TypographyStyles,
  language: 'ckb' | 'ar',
  additionalStyles?: TextStyle
): TextStyle => {
  const typography = getTypographyStyles(language);
  return {
    ...typography[style],
    ...additionalStyles,
  };
};
