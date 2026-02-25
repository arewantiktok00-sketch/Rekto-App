# How to See JavaScript/UI Changes When You Run the App

The fixes (Tutorial redesign, RTL, header, language switch) are **in the code**. If you don't see them, the app is loading an **old JavaScript bundle**.

## Rule: Metro Serves the New Code

- **Native build (Xcode or `npx expo run:ios`)** = builds the **native** app (iOS/Android).
- **JavaScript** is loaded from **Metro** when you run a **development** build.
- So: **Metro must be running first**, then you run the app. The app connects to Metro and loads the **current** JS from your project.

## Steps (do every time you want to see latest code)

### 1. Start Metro with cache clear (Terminal 1)

```bash
cd /Users/arewanrekto/Desktop/RektoApp
npx expo start --clear
```

Leave this running. Wait until you see “Metro waiting on …” or the QR code.

### 2. Run the app (Terminal 2, or Xcode)

**Option A – Terminal**

```bash
cd /Users/arewanrekto/Desktop/RektoApp
npx expo run:ios
```

**Option B – Xcode**

- Open the project in Xcode and run (▶) as usual.
- The app will still load JS from Metro if Metro is running.

### 3. Reload to load the latest bundle

After the app is open:

- In the **Metro terminal** (Terminal 1), press **`r`** to reload,  
  **or**
- In the **simulator/device**: **Cmd+D** (iOS simulator) or shake device → **Reload**.

You should then see:

- Tutorial screen: **thumbnail area (180px)**, **play button overlay**, **“Watch Now”** gradient button.
- RTL / language / header fixes as implemented.

## If you still see old UI

1. **Quit the app** completely (swipe away from app switcher).
2. In Terminal 1, stop Metro (Ctrl+C), then run again:
   ```bash
   npx expo start --clear
   ```
3. Run the app again from Xcode or `npx expo run:ios`.
4. When the app opens, press **`r`** in the Metro terminal (or Reload from dev menu).

Only a **release** build (e.g. Archive in Xcode, or EAS build) bakes the JS into the app; that bundle is from the time you built. For day-to-day dev, use the steps above so the app always loads the latest JS from Metro.
