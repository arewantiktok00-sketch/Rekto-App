// REACT NATIVE FONT CONFIGURATION
// Use PostScript names (NOT filenames)

export const fonts = {
  // English fonts - Poppins
  regular: 'Poppins-Regular',
  medium: 'Poppins-Medium',
  semiBold: 'Poppins-SemiBold',
  bold: 'Poppins-Bold',
  
  // Kurdish/Arabic font - Rabar
  kurdish: 'Rabar_021',
  arabic: 'Rabar_021',
  rabar: 'Rabar_021',
};

// Helper: Get font based on language
export const getFontFamily = (
  isRTL: boolean, 
  weight: 'regular' | 'medium' | 'semiBold' | 'bold' = 'regular'
): string => {
  // Kurdish/Arabic always uses Rabar
  if (isRTL) {
    return fonts.kurdish;
  }
  
  // English uses Poppins with weight variants
  switch (weight) {
    case 'bold': return fonts.bold;
    case 'semiBold': return fonts.semiBold;
    case 'medium': return fonts.medium;
    default: return fonts.regular;
  }
};

// Helper: Get font by language code
export const getFontFamilyByLanguage = (language: 'ckb' | 'ar'): string => {
  return fonts.kurdish;
};

// Helper: Get font with weight for English, or RTL font for Kurdish/Arabic
export const getFontFamilyWithWeight = (
  language: 'ckb' | 'ar',
  weight: 'regular' | 'medium' | 'semiBold' | 'bold' = 'regular'
): string => {
  return fonts.kurdish;
};

// Re-export helpers from new utility for compatibility
export { getNumberFontFamily, getFontFamilyForMixedContent } from './getFontFamily';
