# RTL/LTR — Single Source of Truth

Use this whenever you implement RTL/LTR in the app.

## RTL/LTR rule for text

**Kurdish (ckb) + Arabic (ar) → ALL text = RTL**  
Labels, titles, hints, placeholders, button text.  
Use `textAlign: 'right'`, `writingDirection: 'rtl'`, and RTL font.

**English (en) → ALL text = LTR**  
Labels, titles, hints, placeholders, button text.  
Use `textAlign: 'left'`, `writingDirection: 'ltr'`, and English font.

**Numbers/currency/dates → always LTR** in all languages.

Example:

```ts
const isRTL = language === 'ckb' || language === 'ar';
const textStyle = {
  textAlign: isRTL ? 'right' : 'left',
  writingDirection: isRTL ? 'rtl' : 'ltr',
};
const numberStyle = {
  textAlign: 'left',
  writingDirection: 'ltr',
};
```

---

## 1) Detect RTL (single source of truth)

Use one of these everywhere:

```ts
const { language } = useLanguage();
const isRTL = language === 'ckb' || language === 'ar';
```

or:

```ts
import { I18nManager } from 'react-native';
const isRTL = I18nManager.isRTL;
```

Pass `isRTL` to styles: `createStyles(colors, isRTL, language)`.

---

## 2) Required helper styles (create `src/utils/rtl.ts`)

```ts
export const labelStyleRTL = (isRTL: boolean) => ({
  textAlign: isRTL ? 'right' : 'left',
  writingDirection: isRTL ? 'rtl' : 'ltr',
});

export const centerLabelStyleRTL = (isRTL: boolean) => ({
  textAlign: 'center',
  writingDirection: isRTL ? 'rtl' : 'ltr',
});

export const inputStyleRTL = (isRTL: boolean) => ({
  textAlign: isRTL ? 'right' : 'left',
  writingDirection: isRTL ? 'rtl' : 'ltr',
  paddingStart: 12,
  paddingEnd: 12,
});

export const ltrNumberStyle = {
  textAlign: 'left',
  writingDirection: 'ltr',
};
```

**Use these on all screens:**

- labels/titles/hints → `labelStyleRTL(isRTL)`
- centered button text → `centerLabelStyleRTL(isRTL)`
- TextInput → `inputStyleRTL(isRTL)`
- numbers/prices/dates → `ltrNumberStyle`

---

## 3) Layout rules

- Rows with **icon + text** → `flexDirection: isRTL ? 'row-reverse' : 'row'`
- **Header (back + title)** → same row-reverse rule
- **Chevron / arrow icons** → flip in RTL:

```ts
const iconTransformRTL = (isRTL: boolean) => ({
  transform: [{ scaleX: isRTL ? -1 : 1 }],
});
```

Use **logical spacing:** `marginStart`, `marginEnd`, `paddingStart`, `paddingEnd`.

---

## 4) Checklist for every screen

- [ ] Labels/titles/hints → `labelStyleRTL(isRTL)`
- [ ] Buttons text → `centerLabelStyleRTL(isRTL)`
- [ ] TextInputs → `inputStyleRTL(isRTL)`
- [ ] Numbers/currency/dates → `ltrNumberStyle`
- [ ] Row layout flipped with `row-reverse` when RTL
- [ ] Icons flipped with `iconTransformRTL(isRTL)`
- [ ] Do not mix RTL/LTR direction inside one text block.
- [ ] If the content is numeric or English, force LTR even in RTL screens.

---

**This is the single source of truth for RTL/LTR in our app.**
