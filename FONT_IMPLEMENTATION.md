# Font Implementation - Poppins & Rabar_021

## Overview
The app now uses:
- **Poppins** font family for English text
- **Rabar_021** font for Kurdish/Arabic (RTL) text

## Font Loading
Currently, only `Rabar_021.ttf` is loaded in `app/_layout.tsx`.

**Note:** Poppins will use the system font stack on iOS/Android if not explicitly loaded. To add Poppins font files:
1. Download Poppins font files (Regular, SemiBold, Bold) from Google Fonts
2. Place them in `assets/fonts/`
3. Update `app/_layout.tsx` to load them:

```typescript
await Font.loadAsync({
  'Rabar_021': require('../assets/fonts/Rabar_021.ttf'),
  'Poppins': require('../assets/fonts/Poppins-Regular.ttf'),
  'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
  'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
});
```

## Typography System

### Headers (h1, h2, h3)
- **English:** Poppins SemiBold (fontWeight: '600')
- **Kurdish/Arabic:** Rabar_021 with appropriate weight

### Required Hints
- **English:** Poppins SemiBold (fontWeight: '600')
- **Kurdish/Arabic:** Rabar_021 SemiBold

### Body Text
- **English:** Poppins Regular (fontWeight: '400')
- **Kurdish/Arabic:** Rabar_021 Regular

## Updated Files

1. **`src/theme/typography.ts`**
   - Updated to use Poppins for English
   - Added `getFontFamily()` helper
   - Added `getSemiBoldStyle()` helper for headers and required hints

2. **`src/screens/main/CreateAd.tsx`**
   - All text styles now use typography system
   - Headers use SemiBold
   - Required hints use SemiBold
   - All text uses correct font family based on language

## Usage Example

```typescript
import { getTypographyStyles, getFontFamily, getSemiBoldStyle } from '@/theme/typography';
import { useLanguage } from '@/contexts/LanguageContext';

const { language } = useLanguage();
const typography = getTypographyStyles(language as 'en' | 'ckb' | 'ar');
const fontFamily = getFontFamily(language as 'en' | 'ckb' | 'ar');
const semiBoldStyle = getSemiBoldStyle(language as 'en' | 'ckb' | 'ar');

// Header
<Text style={[typography.h3, semiBoldStyle]}>Title</Text>

// Required hint
<Text style={[typography.caption, semiBoldStyle]}>Required</Text>

// Body text
<Text style={typography.body}>Content</Text>
```

## Next Steps

1. Add Poppins font files to `assets/fonts/` (optional, for exact font rendering)
2. Update other screens to use the typography system
3. Test on both English and Kurdish/Arabic languages
