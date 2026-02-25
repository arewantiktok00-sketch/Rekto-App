# Run the app on iOS simulator

**Important:** All commands must be run from the **project folder**. If you get:
`ConfigError: The expected package.json path: /Users/arewanrekto/package.json does not exist`
it means you are in the wrong directory (e.g. your home folder `~`). Fix: `cd` into the project first.

## Correct project path

```bash
cd /Users/arewanrekto/Desktop/RektoApp
```

Then run any command below from there.

---

The app needs the **Metro bundler** to serve the JavaScript bundle. If you see "No script URL provided" in the simulator, Metro is not running.

## Option A: One command (recommended)

From the project root:

```bash
cd /Users/arewanrekto/Desktop/RektoApp
npx expo run:ios
```

This starts Metro, builds the app, and launches the simulator.

## Option B: Two terminals (kill + clear cache + run)

**Terminal 1 – start Metro (leave this running):**
```bash
cd /Users/arewanrekto/Desktop/RektoApp
npx expo start --clear
```

**Terminal 2 – build and run iOS:**
```bash
cd /Users/arewanrekto/Desktop/RektoApp
npx expo run:ios
```

## Option C: Xcode + Metro

1. **Start Metro first** (in a terminal at the project root):
   ```bash
   cd /Users/arewanrekto/Desktop/RektoApp
   npx expo start
   ```
2. Leave that terminal open, then in Xcode open **`ios/Rekto.xcworkspace`** and press **Run (⌘R)**.
3. If the simulator shows a red error, press **Reload (⌘R)** in the simulator so it fetches the bundle from Metro.

## If you see "No script URL provided" (red error)

1. **Start Metro** in a terminal:
   ```bash
   cd /Users/arewanrekto/Desktop/RektoApp
   npx expo start
   ```
2. In the simulator, tap **"Reload JS"** (or press ⌘R). The app will load from Metro at 127.0.0.1:8081.

If you changed `ios/Rekto/AppDelegate.swift`, rebuild in Xcode (⌘B) then Run (⌘R) again.
