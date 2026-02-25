# Apply Fonts Globally - Quick Fix

## What I Did

1. ✅ Fixed font path in `App.tsx` - Changed from `../../../assets/fonts/` to `../../assets/fonts/`
2. ✅ Added `fontFamily` to ALL text styles in `Dashboard.tsx`
3. ✅ Created a global `Text` component wrapper (`src/components/common/Text.tsx`)

## Next Steps - Apply Fonts to ALL Screens

You need to add `fontFamily` to ALL text styles in these files:

### Priority Files:
1. ✅ `src/screens/main/Dashboard.tsx` - DONE
2. ⚠️ `src/screens/main/Campaigns.tsx`
3. ⚠️ `src/screens/main/CreateAd.tsx`
4. ⚠️ `src/screens/main/CampaignDetail.tsx` - Already has fonts
5. ⚠️ `src/screens/profile/Profile.tsx`
6. ⚠️ `src/screens/auth/Login.tsx`
7. ⚠️ `src/screens/auth/SignUp.tsx`

### How to Apply:

In each screen's `createStyles` function, add `fontFamily` to ALL text-related styles:

```typescript
const createStyles = (colors: any, fontFamily: string) => StyleSheet.create({
  // Add fontFamily to ALL text styles
  title: {
    fontFamily, // <-- ADD THIS
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
  },
  body: {
    fontFamily, // <-- ADD THIS
    fontSize: 14,
    color: colors.foreground.muted,
  },
  // ... all other text styles
});
```

### Quick Find & Replace Pattern:

Search for text styles that DON'T have `fontFamily`:
- Look for styles with `fontSize`, `fontWeight`, `color`
- Add `fontFamily,` as the first property

### Missing Font File:

⚠️ **Poppins-Regular.ttf is MISSING!**

Add `Poppins-Regular.ttf` to `assets/fonts/` directory.

Without it, regular weight text will fall back to system font.

## Font Path Verification

Fonts should be at:
```
RektoApp/assets/fonts/
  - Poppins-Bold.ttf ✅
  - Poppins-Medium.ttf ✅
  - Poppins-SemiBold.ttf ✅
  - Poppins-Regular.ttf ❌ MISSING
  - Rabar_021.ttf ✅
```

## Test Fonts

After adding fonts to all screens:
1. Clear cache: `npx expo start --clear`
2. Check console for font loading errors
3. Verify fonts appear in app
