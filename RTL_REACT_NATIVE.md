# RTL in React Native (Kurdish / Arabic)

## How it works

- **`dir="rtl"`** is a **web-only** attribute and does nothing in React Native. Do not use it.
- RTL is driven by **I18nManager**: when the user selects Kurdish (ckb) or Arabic (ar), we call `I18nManager.forceRTL(true)` and then **restart the app** so the layout flips. When they select English, we call `I18nManager.forceRTL(false)` and restart.
- After restart, **`I18nManager.isRTL`** is the single source of truth. The app uses `useLanguage().isRTL`, which returns `I18nManager.isRTL`.

## Patterns

1. **Row layouts**  
   Use `flexDirection: 'row'`. When RTL is active, the system mirrors layout. For explicit flip (e.g. header back button), use `flexDirection: 'row-reverse'` when `isRTL`.

2. **Text**
   - Kurdish/Arabic labels: `textAlign: 'right'`, `writingDirection: 'rtl'` (and RTL font if needed).
   - **Amounts, dates, phone numbers**: always **LTR** — use `writingDirection: 'ltr'` and `textAlign: 'left'`, or the shared `textLTR` from `@/utils/rtl`.

3. **Icons that flip** (back arrow, chevrons)  
   `style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}`

4. **Spacing**  
   Use `marginStart` / `marginEnd` and `paddingStart` / `paddingEnd` instead of left/right so they flip with RTL.

5. **Overflow**  
   - Screen containers: `paddingHorizontal: 16` (or `paddingStart`/`paddingEnd`).
   - Text: `flexShrink: 1`, `numberOfLines` where needed.
   - Rows: `width: '100%'`, `minWidth: 0` on flex children so content doesn’t overflow.

## Files

- **LanguageContext** – sets `I18nManager.forceRTL` and optionally restarts via `react-native-restart` when the user changes language (not on init load).
- **src/utils/rtl.ts** – `isRTL()` and `textLTR` for amounts/dates/numbers.
- Screens use `useLanguage().isRTL` and apply header/row RTL styles and `textLTR` for numeric content.
