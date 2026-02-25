# Prepare to Update – Checklist

Use this after RTL/layout fixes and before submitting a new build to the App Store.

---

## 1. RTL (like Invoice screen)

- [x] **Profile section:** All screens use Invoice-style RTL:
  - Header: `[styles.header, isRTL && styles.headerRTL]`
  - Back: `[styles.backButtonWrap, isRTL && styles.rowReverse]`, Arrow `scaleX: -1`, label `textRTL`
  - Content: `textRTL` on text, `rowReverse` on rows where order should flip
- [x] **Legal:** Privacy, Terms, Refund – full RTL
- [x] **Other:** PaymentSuccess, NotFound, main/profile screens – RTL where needed

---

## 2. Layout – everything on screen (nothing invisible)

- [x] **Scroll padding:** All ScrollViews use `paddingBottom: insets.bottom + spacing.xl * 2` (or equivalent) so last cards/buttons are not cut off.
- [x] **Horizontal padding:** Profile and listed screens use `contentContainer` with `paddingStart`/`paddingEnd: spacing.lg` so content is centered and inside the screen.
- [x] **Cards/lists:** Use `width: '100%'` / `maxWidth: '100%'` so nothing overflows horizontally.

---

## 3. Rebuild and refresh

1. **Clean and rebuild**
   ```bash
   cd /Users/arewanrekto/Desktop/RektoApp
   rm -rf node_modules/.cache .expo
   npx expo run:ios --no-build-cache
   ```
2. **In simulator:** Fully close the app (swipe away), then open again.
3. **Reload JS (optional):** In simulator press **Cmd + R** to load latest bundle.

---

## 4. Before submitting update

1. **Bump build number** in Xcode: Rekto target → General → Identity → **Build** (e.g. 2, 3, 4).
2. **Bump version** if this is a new release: e.g. 1.0.0 → 1.0.1.
3. **Archive:** Product → Archive.
4. **Distribute:** Organizer → Distribute App → App Store Connect → Upload.
5. **App Store Connect:** Attach the new build to the version and submit for review (or TestFlight).

See **XCODE_UPDATE_GUIDE.md** for detailed Xcode/EAS steps.
