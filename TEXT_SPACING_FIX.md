# Text Spacing Fix Guide

## What Was Fixed

1. **Font Loading**: Added Rabar_021 font loading in `App.tsx` using `expo-font`
2. **Typography System**: Updated `typography.ts` with:
   - Increased letter spacing for RTL languages (Kurdish/Arabic)
   - Increased line height for RTL (1.67x-1.75x vs 1.33x-1.43x for LTR)
   - Added `includeFontPadding: false` to prevent text overlap
3. **Invoice Navigation**: Fixed invoice button to navigate directly to `InvoiceHistory`
4. **Profile Screen**: Updated to use typography system

## How to Apply Typography to Other Components

### Option 1: Use TypographyText Component (Recommended)
```tsx
import { TypographyText } from '@/components/common/TypographyText';

<TypographyText variant="h1">Title</TypographyText>
<TypographyText variant="body">Body text</TypographyText>
```

### Option 2: Use getTypographyStyles Hook
```tsx
import { useLanguage } from '@/contexts/LanguageContext';
import { getTypographyStyles } from '@/theme/typography';

const { language } = useLanguage();
const typography = getTypographyStyles(language as 'en' | 'ckb' | 'ar');

<Text style={[typography.body, { color: colors.foreground.DEFAULT }]}>
  Text content
</Text>
```

### Option 3: Add Typography to Existing Styles
```tsx
const styles = StyleSheet.create({
  text: {
    ...typography.body,
    fontSize: 16, // Can override if needed
    color: colors.foreground.DEFAULT,
  },
});
```

## Key Properties for Text Spacing

Always include these for RTL languages:
- `letterSpacing`: 0.3-1.0 (higher for RTL)
- `lineHeight`: 1.5x-1.75x font size (higher for RTL)
- `includeFontPadding: false` (prevents overlap)

## Files Updated

- ✅ `RektoApp/src/App.tsx` - Font loading
- ✅ `RektoApp/src/theme/typography.ts` - Typography system
- ✅ `RektoApp/src/screens/profile/Profile.tsx` - Typography applied
- ✅ `RektoApp/src/screens/main/Dashboard.tsx` - Typography applied
- ✅ `RektoApp/src/screens/profile/FAQ.tsx` - Typography applied
- ✅ `RektoApp/src/components/common/TypographyText.tsx` - New component

## Next Steps

Apply typography to remaining screens:
- CampaignCard.tsx
- CreateAd.tsx
- CampaignDetail.tsx
- Links.tsx
- All profile screens
- All main screens
