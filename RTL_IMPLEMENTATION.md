# RTL Text Alignment — React Native App (Kurdish ckb & Arabic ar)

## Important: This is a React Native / Expo app

- **No** `src/index.css` — there is no global CSS file.
- **No** Tailwind — we use React Native `StyleSheet` and inline styles.
- **No** `src/pages/` — screens live in `src/screens/` (e.g. `src/screens/main/CreateAd.tsx`, `src/screens/auth/Login.tsx`).
- **No** `dir="rtl"` on `<html>` — we use `View` with `direction: 'rtl'` and per-component RTL styles.

## How RTL is implemented

### 1. Source of truth: `useLanguage().isRTL`

- **File:** `src/contexts/LanguageContext.tsx`
- `isRTL = I18nManager.isRTL || language === 'ckb' || language === 'ar'`
- Use this so RTL works **without app restart** when user switches to Kurdish/Arabic.

### 2. Global text component

- **File:** `src/components/common/Text.tsx`
- Uses `isRTL` from `useLanguage()` and applies `textAlign: 'right'` and `writingDirection: 'rtl'` when RTL.
- **Use `<Text>` from `@/components/common/Text`** everywhere so labels, titles, and body text align right automatically in ckb/ar.

### 3. RTL helpers

- **File:** `src/utils/rtl.ts`
- **`rtlText(isRTL?)`** — use for any text style: `style={[styles.label, rtlText(isRTL)]}`
- **`rtlRow(isRTL?)`** — use for rows (text + icon, label + value): `style={[styles.row, rtlRow(isRTL)]}`
- **`rtlContainer(isRTL?)`** — use for containers so content sits on the right: `alignItems: 'flex-end'`
- **`inputStyleRTL(isRTL?)`** — use on every `TextInput`: `style={[styles.input, inputStyleRTL(isRTL)]}`
- **`iconTransformRTL(isRTL?)`** — flip chevrons/arrows: `style={iconTransformRTL(isRTL)}`

### 4. Root layout

- **File:** `src/App.tsx`
- Wraps the app in `<View style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr' }}>` so layout direction flips.

### 5. Exception: numbers, currency, dates

- Always keep **LTR**: `writingDirection: 'ltr'`, `textAlign: 'left'`.
- Use `LTRNumber` from `@/components/common/Text` or `textLTR` / `ltrNumberStyle` from `@/utils/rtl` for prices and numbers.

## Screens already using RTL

- Dashboard, CreateAd, CampaignDetail, Profile, WalletBalance  
- Login, SignUp  
- Notifications, Analytics, Links  
- CustomTabBar, ScreenHeader, HeroBanner, TopResultsList, AppBanner, PromoBanner  

## Checklist for new screens

1. `const { isRTL } = useLanguage();`
2. Pass `isRTL` into `createStyles(..., isRTL)` and define `textRTL: { textAlign: 'right', writingDirection: 'rtl' }` and `rowReverse: { flexDirection: 'row-reverse' }`.
3. Apply `isRTL && styles.textRTL` to every `<Text>` that isn’t centered or a number.
4. Apply `isRTL && styles.rowReverse` (or `rtlRow(isRTL)`) to rows that should flip (e.g. label + value, text + icon).
5. Use `inputStyleRTL(isRTL)` on every `TextInput`.
6. Use `iconTransformRTL(isRTL)` on arrows/chevrons.

## Fonts

- **Kurdish / Arabic** → Rabar_021  
- **English and numbers** → Poppins  

These are applied in `Text` and theme/typography; no extra work needed for RTL.
