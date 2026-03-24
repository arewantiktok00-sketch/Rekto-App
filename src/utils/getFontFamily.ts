/**
 * Font Family Utility
 * Returns correct font based on language
 * 
 * Rules:
 * - English text → Poppins (with weight variants)
 * - Kurdish/Arabic text → Rabar_021
 * - ALL numbers (even in Kurdish/Arabic mode) → Poppins
 */

export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold';
export type Language = 'ckb' | 'ar';

const fonts = {
  // English fonts - Poppins
  regular: 'Poppins-Regular',
  medium: 'Poppins-Medium',
  semibold: 'Poppins-SemiBold',
  bold: 'Poppins-Bold',
  
  // Kurdish/Arabic font - Rabar
  kurdish: 'Rabar_021',
  arabic: 'Rabar_021',
};

/**
 * Get font family for text based on language
 * For Kurdish/Arabic text, use Rabar_021
 * For English text, use Poppins with weight
 */
export const getFontFamily = (
  language: Language,
  weight: FontWeight = 'regular'
): string => {
  // App is Kurdish/Arabic only; default text always uses Rabar.
  return fonts.kurdish;
};

/**
 * Get font family for numbers
 * Numbers ALWAYS use Poppins (default Poppins-Medium per design)
 */
export const getNumberFontFamily = (weight: FontWeight = 'medium'): string => {
  switch (weight) {
    case 'bold':
      return fonts.bold;
    case 'semibold':
      return fonts.semibold;
    case 'regular':
      return fonts.regular;
    case 'medium':
    default:
      return fonts.medium;
  }
};

/**
 * Check if text contains numbers
 * Used to determine if we should use Poppins for numbers
 */
export const containsNumbers = (text: string): boolean => {
  return /\d/.test(text);
};

/**
 * Get font family for mixed content (text + numbers)
 * Text uses language-specific font, numbers use Poppins
 * For simplicity, if content has numbers, use Poppins for the whole string
 * (React Native doesn't support per-character font styling easily)
 */
export const getFontFamilyForMixedContent = (
  language: Language,
  text: string,
  weight: FontWeight = 'regular'
): string => {
  // If text contains numbers, prefer Poppins for better number rendering
  if (containsNumbers(text)) {
    return getNumberFontFamily(weight);
  }
  
  // Otherwise use language-specific font
  return getFontFamily(language, weight);
};
