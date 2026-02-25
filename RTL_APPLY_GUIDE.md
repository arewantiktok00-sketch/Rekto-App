# RTL Application Guide — Kurdish (ckb) & Arabic (ar)

The architecture is in place (`I18nManager` + restart, `rtl.ts` helpers, `ScreenHeader`). Apply the following **on every screen** so RTL works consistently.

---

## 1. Headers — Use `<ScreenHeader>` Only

**Rule:** Every screen with a back button must use `<ScreenHeader>` from `@/components/common/ScreenHeader`. No custom header rows.

```tsx
import { ScreenHeader } from '@/components/common/ScreenHeader';

<ScreenHeader
  title={t('screenTitle')}
  onBack={() => navigation.goBack()}
  style={{ paddingTop: insets.top + 16 }}
/>
```

**Screens to check:** CreateAd, CampaignDetail, Analytics, Profile and all sub-screens (Personal Info, Payment Methods, Transaction History, Notification Settings, Appearance, Language, Privacy, Help, FAQ, Wallet), Login, SignUp, ForgotPassword, VerifyCode, Notifications, Links, Invoice(s), TopResults, Tutorial, Onboarding. Replace any custom header (TouchableOpacity + title Text) with `<ScreenHeader>`.

---

## 2. Labels, Descriptions, Body Text — RTL alignment

**Rule:** Use `<Text>` from `@/components/common/Text` for all labels, descriptions, and body copy. It **automatically** right-aligns in RTL (ckb/ar) and left-aligns in LTR; only `textAlign: 'center'` in your style is respected (stays centered). You do not need to add `textAlignRTL()` manually for most screens.

For custom style objects that must stay LTR (e.g. numbers), use `textAlign: 'left'` and `writingDirection: 'ltr'`, or use the `<LTRNumber>` component / `ltrNumberStyle` for numbers and prices.

---

## 3. TextInput — Use `inputStyleRTL()`

**Rule:** Every `<TextInput>` must get RTL-aware alignment and padding.

```tsx
import { inputStyleRTL } from '@/utils/rtl';

<TextInput
  style={[styles.input, inputStyleRTL()]}
  placeholder={t('placeholder')}
  placeholderTextColor={colors.input.placeholder}
  value={value}
  onChangeText={setValue}
/>
```

Optionally add font: `fontFamily: isRTL ? 'Rabar_021' : 'Poppins-Regular'` (e.g. from `getFontFamily(language, 'regular')`). Ensure **no** TextInput is missing `textAlign` and `writingDirection`; `inputStyleRTL()` provides both plus `paddingStart`/`paddingEnd`.

---

## 4. Arrows and Chevrons — Use `iconTransformRTL()`

**Rule:** Every horizontal arrow/chevron must flip in RTL.

```tsx
import { iconTransformRTL } from '@/utils/rtl';

<ChevronRight size={20} color={colors.foreground.muted} style={iconTransformRTL()} />
<ArrowRight style={iconTransformRTL()} />
<ChevronLeft style={iconTransformRTL()} />
```

Search for: `ChevronRight`, `ChevronLeft`, `ArrowRight`, `ArrowLeft`, `ChevronDown` (if used in a horizontal context), and apply `style={iconTransformRTL()}` (or add it to the style array).

---

## 5. Layout — Logical Props Only

**Rule:** Use logical (start/end) props instead of physical (left/right) so layout mirrors in RTL.

| Replace | With |
|--------|------|
| `marginLeft` | `marginStart` |
| `marginRight` | `marginEnd` |
| `paddingLeft` | `paddingStart` |
| `paddingRight` | `paddingEnd` |
| `left: X` (position) | `start: X` |
| `right: X` (position) | `end: X` |
| `borderLeftWidth` | `borderStartWidth` |
| `borderRightWidth` | `borderEndWidth` |
| `borderLeftColor` | `borderStartColor` |
| `borderRightColor` | `borderEndColor` |
| `borderTopLeftRadius` | `borderTopStartRadius` |
| `borderTopRightRadius` | `borderTopEndRadius` |
| `borderBottomLeftRadius` | `borderBottomStartRadius` |
| `borderBottomRightRadius` | `borderBottomEndRadius` |

Do a project-wide find for these and replace in StyleSheets and inline styles. Do **not** use `flexDirection: 'row-reverse'` for RTL; use `flexDirection: 'row'` and let the system mirror.

---

## 6. Dropdowns / Pickers

- Selected value: `textAlignRTL()` on the text.
- Chevron: `iconTransformRTL()`.
- Row: `flexDirection: 'row'` (no row-reverse).
- Container: `paddingStart` / `paddingEnd` instead of `paddingLeft` / `paddingRight`.

---

## 7. Sliders (Budget, Duration)

Wrap the slider in a View and mirror when RTL:

```tsx
<View style={[styles.sliderWrap, I18nManager.isRTL && { transform: [{ scaleX: -1 }] }]}>
  <Slider ... />
</View>
```

Apply to Budget slider and Duration slider in CreateAd and any other screen with a slider.

---

## 8. Numbers, Prices, Dates — Always LTR

Use `<LTRNumber>` or `ltrNumberStyle` / `textLTR` from `@/utils/rtl` so numbers never flip.

```tsx
import { LTRNumber, ltrNumberStyle } from '@/components/common/Text'; // LTRNumber
import { ltrNumberStyle } from '@/utils/rtl';

<LTRNumber>$20</LTRNumber>
<Text style={[styles.value, ltrNumberStyle]}>394.7K</Text>
```

---

## 9. Bottom Tab Bar

- Do **not** set `flexDirection` manually on the tab bar; use `flexDirection: 'row'` so the system can mirror.
- Do **not** use `direction: 'ltr'` on the tab container.
- Tabs will reverse when `I18nManager.isRTL` is true (e.g. Profile on far left in RTL).

---

## 10. Verification Checklist (per screen)

After applying the above:

1. Switch to Kurdish → app restarts → layout is RTL.
2. Header: back button on **right**, title **centered**, back arrow points **left** (←).
3. Labels/descriptions: **right**-aligned.
4. Inputs: cursor on **right**, text flows **right-to-left**.
5. Dropdowns: text **right**-aligned, chevron on **left**.
6. Cards: content mirrored (e.g. image on right if it was on left in English).
7. Arrows/chevrons: direction flipped.
8. Numbers/prices: still **LTR** (e.g. $20, 394.7K).
9. Bottom nav: tabs reversed (e.g. Profile on far left).
10. No overflow or clipping.

---

## Files to Audit

- **Screens:** Dashboard, CreateAd (all steps), CampaignDetail, Campaigns, Analytics, Profile, PersonalInfo, PaymentMethods, TransactionHistory, NotificationSettings, AppearanceSettings, LanguageSettings, PrivacySecurity, HelpSupport, FAQ, WalletBalance, Notifications, Links, LinkEditor, Tutorial, Invoice, InvoiceHistory, TopResults, Login, SignUp, ForgotPassword, VerifyCode, Onboarding, Payment flows.
- **Components:** CampaignCard, StatCard, TopResultsList, PromoBanner, HeroBanner, NotificationDetailModal, CustomTabBar, any dropdown/picker components.

Apply the rules above to each; use global find-and-replace for logical props first, then go screen-by-screen for headers, text, inputs, and icons.
