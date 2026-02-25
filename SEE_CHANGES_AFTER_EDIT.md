# See Your Code Changes After Editing

**You use a development build (dev client), not Expo Go.** You run the app from **Xcode**. This guide is for that setup only.

If you don't see your latest changes (RTL, translations, header, notification modal, etc.), the Metro bundle is likely cached.

---

## Full reset: one command, then run from Xcode

Run this (kills Simulator + Metro, then starts Metro with cache cleared):

```bash
cd /Users/arewanrekto/Desktop/RektoApp
npm run fresh
```

Leave that terminal open. Wait until Metro is ready ("Bundler ready" or the menu).

Then run the app from Xcode (Product → Run, ⌘R). Your dev build will load the new bundle.

---

## Or do it step by step

### 1. Stop any running Metro

**Ctrl+C** in the Metro terminal.

### 2. Kill simulator + Metro, start Metro with cache cleared

```bash
cd /Users/arewanrekto/Desktop/RektoApp
npm run fresh
```

If port 8081 is in use after that, run:

```bash
npx expo start -c --port 8082
```

### 3. Run the app from Xcode

- Open the project in **Xcode** (e.g. `ios/RektoApp.xcworkspace` or your `.xcworkspace`).
- Select your simulator or device.
- **Product → Run** (or ⌘R).

Your dev build will connect to Metro and load the **new** JS bundle (with cache cleared). You are not using Expo Go.

---

## Short version (every time you want a fresh bundle)

1. **Ctrl+C** in the Metro terminal (if it’s running).
2. `cd /Users/arewanrekto/Desktop/RektoApp && npm run fresh`
3. In **Xcode**: **Product → Run** (⌘R).

---

## If you use `expo run:ios` instead of Xcode

Same idea: clear Metro cache first, then run the native build:

```bash
cd /Users/arewanrekto/Desktop/RektoApp
npx expo start -c
```

In a **second terminal**:

```bash
cd /Users/arewanrekto/Desktop/RektoApp
npx expo run:ios
```

This runs your **development build** on the simulator, not Expo Go.

---

## After the app loads

1. In the app: **Profile → Language** → **Kurdish (کوردی)** or **Arabic (عربي)**.
2. You should see:
   - **Header:** Title centered; back button on the right in RTL.
   - **Create Ad:** Budget in Kurdish/Arabic, RTL layout; fields right-aligned.
   - **Notification modal:** Buttons with full text in Kurdish/Arabic (no cut-off).
   - **Bottom tabs:** Content not hidden under the tab bar.
