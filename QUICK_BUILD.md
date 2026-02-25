# 🚀 Quick Build Guide - Get Started in 5 Minutes

## Fastest Way: EAS Build (Cloud)

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Login
```bash
eas login
```

### Step 3: Build Android APK (Testing)
```bash
cd RektoApp
eas build --platform android --profile preview
```

### Step 4: Build Android AAB (Production - for Play Store)
```bash
eas build --platform android --profile production
```

### Step 5: Build iOS (Production - for App Store)
```bash
eas build --platform ios --profile production
```

That's it! Your build will be ready in 10-20 minutes. Download link will be provided.

---

## Local Build (If you prefer)

### Android APK (Local)
```bash
cd RektoApp
npx expo prebuild --platform android
cd android
./gradlew assembleDebug
# APK location: android/app/build/outputs/apk/debug/app-debug.apk
```

### Android AAB (Local - for Play Store)
```bash
cd RektoApp/android
./gradlew bundleRelease
# AAB location: android/app/build/outputs/bundle/release/app-release.aab
```

### iOS (Local - macOS only)
```bash
cd RektoApp
npx expo prebuild --platform ios
cd ios
pod install
cd ..
npx expo run:ios
```

---

## Before Building - Update These!

### 1. Update Package Name (Important!)

Edit `app.json`:
```json
{
  "expo": {
    "android": {
      "package": "com.yourcompany.rektoapp"  // Change from "com.anonymous.RektoApp"
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.rektoapp"  // Add this
    }
  }
}
```

### 2. Update Version
```json
{
  "expo": {
    "version": "1.0.0",  // Update for each release
    "android": {
      "versionCode": 1  // Increment for each release
    },
    "ios": {
      "buildNumber": "1"  // Increment for each release
    }
  }
}
```

### 3. Add App Icon
Make sure you have:
- `assets/images/icon.png` (1024x1024px)
- `assets/images/android-icon-foreground.png`
- `assets/images/android-icon-background.png`

---

## Common Commands

```bash
# Start development server
npm start

# Build Android APK (testing)
eas build --platform android --profile preview

# Build Android AAB (production)
eas build --platform android --profile production

# Build iOS (production)
eas build --platform ios --profile production

# Build both platforms
eas build --platform all --profile production

# Check build status
eas build:list

# View build logs
eas build:view [BUILD_ID]
```

---

## Need Help?

1. Check full guide: `BUILD_GUIDE.md`
2. Expo docs: https://docs.expo.dev/build/introduction/
3. Build logs: https://expo.dev/builds

---

**Ready to build? Run: `eas build --platform android --profile preview`** 🎉
