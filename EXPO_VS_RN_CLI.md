# 📱 Expo vs React Native CLI - Complete Comparison & Build Guide

## 🤔 Which Should You Choose?

### **EXPO (Recommended for Your App) ✅**

**Best for:**
- ✅ Faster development and deployment
- ✅ Easier builds (cloud builds with EAS)
- ✅ No need to configure native code manually
- ✅ Over-the-air updates
- ✅ Built-in push notifications, camera, etc.
- ✅ Your app is already set up with Expo!

**Your current setup:** You're already using Expo! ✅

---

### **React Native CLI (Original)**

**Best for:**
- ✅ Need custom native modules not in Expo
- ✅ Full control over native code
- ✅ Complex native integrations
- ⚠️ More complex setup and builds
- ⚠️ Need to manage Android Studio / Xcode yourself

---

## 📊 Quick Comparison

| Feature | Expo | React Native CLI |
|---------|------|------------------|
| **Setup Time** | 5 minutes | 30+ minutes |
| **Build Complexity** | Easy (cloud) | Complex (local) |
| **Native Code Access** | Limited (can eject) | Full access |
| **Over-the-Air Updates** | ✅ Built-in | ❌ Need CodePush |
| **Push Notifications** | ✅ Built-in | ⚠️ Need setup |
| **Camera/Image Picker** | ✅ Built-in | ⚠️ Need setup |
| **Build Requirements** | Just Node.js | Android Studio + Xcode |
| **iOS Build** | ✅ Works on Windows | ❌ macOS only |
| **Learning Curve** | Easy | Steep |
| **Best For** | Most apps | Complex native needs |

---

## 🚀 EXPO BUILD GUIDE (Your Current Setup)

### Prerequisites

```bash
# 1. Install Node.js (v18+)
# Download from: https://nodejs.org/

# 2. Install Expo CLI globally
npm install -g expo-cli

# 3. Install EAS CLI (for cloud builds)
npm install -g eas-cli
```

### Step 1: Login to Expo

```bash
eas login
# Or create account: https://expo.dev/signup
```

### Step 2: Configure Build Settings

Your project already has `app.json`. Make sure it's configured:

```json
{
  "expo": {
    "name": "RektoApp",
    "slug": "rektoapp",
    "version": "1.0.0",
    "android": {
      "package": "com.yourcompany.rektoapp",
      "versionCode": 1
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.rektoapp",
      "buildNumber": "1"
    }
  }
}
```

### Step 3: Create EAS Build Config

```bash
cd RektoApp
eas build:configure
```

This creates `eas.json` with build profiles.

### Step 4: Build for Android

#### Build APK (for testing):
```bash
eas build --platform android --profile preview
```

#### Build AAB (for Google Play Store):
```bash
eas build --platform android --profile production
```

**Time:** 10-20 minutes  
**Result:** Download link provided

### Step 5: Build for iOS

```bash
eas build --platform ios --profile production
```

**Time:** 15-30 minutes  
**Note:** Works on Windows! No macOS needed.

### Step 6: Download Your Build

After build completes:
1. Check email for download link
2. Or visit: https://expo.dev/builds
3. Download and install on device

---

## 🏗️ REACT NATIVE CLI BUILD GUIDE

### Prerequisites

#### For Android:
```bash
# 1. Install Java JDK 17+
# Download from: https://adoptium.net/

# 2. Install Android Studio
# Download from: https://developer.android.com/studio

# 3. Set Environment Variables (Windows)
# Add to System Environment Variables:
ANDROID_HOME=C:\Users\YourName\AppData\Local\Android\Sdk
JAVA_HOME=C:\Program Files\Java\jdk-17

# 4. Add to PATH:
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
```

#### For iOS (macOS only):
```bash
# 1. Install Xcode from App Store
# 2. Install CocoaPods
sudo gem install cocoapods

# 3. Install Xcode Command Line Tools
xcode-select --install
```

### Step 1: Initialize React Native CLI Project

```bash
# Create new project
npx react-native@latest init RektoAppCLI

cd RektoAppCLI
```

### Step 2: Copy Your Code

```bash
# Copy your src/ folder
# Copy your package.json dependencies
# Update imports if needed
```

### Step 3: Install Dependencies

```bash
npm install
# or
yarn install
```

### Step 4: Build for Android

#### Generate Native Code:
```bash
# Not needed - already generated with CLI
```

#### Build Debug APK:
```bash
cd android
./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

#### Build Release APK:
```bash
# 1. Create keystore
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore rektoapp-release-key.keystore -alias rektoapp-key-alias -keyalg RSA -keysize 2048 -validity 10000

# 2. Create android/keystore.properties
rektoappReleaseStoreFile=rektoapp-release-key.keystore
rektoappReleaseStorePassword=YOUR_PASSWORD
rektoappReleaseKeyAlias=rektoapp-key-alias
rektoappReleaseKeyPassword=YOUR_PASSWORD

# 3. Update android/app/build.gradle (add signing config)

# 4. Build release
cd android
./gradlew assembleRelease
```

#### Build AAB (for Play Store):
```bash
cd android
./gradlew bundleRelease
# AAB: android/app/build/outputs/bundle/release/app-release.aab
```

### Step 5: Build for iOS (macOS only)

```bash
# 1. Install pods
cd ios
pod install
cd ..

# 2. Open in Xcode
open ios/RektoAppCLI.xcworkspace

# 3. In Xcode:
# - Select your team in Signing & Capabilities
# - Choose device/simulator
# - Product → Run (⌘R)

# 4. For App Store:
# - Product → Archive
# - Distribute App → App Store Connect
```

---

## 🎯 Which Should You Use?

### **Use EXPO if:**
- ✅ You want fastest development
- ✅ You want easiest builds (cloud)
- ✅ You don't need custom native code
- ✅ You want over-the-air updates
- ✅ You're building on Windows (iOS builds work!)
- ✅ **Your app is already set up with Expo!** ✅

### **Use React Native CLI if:**
- ⚠️ You need custom native modules
- ⚠️ You need full native code control
- ⚠️ You're comfortable with Android Studio/Xcode
- ⚠️ You have macOS for iOS builds
- ⚠️ You need specific native libraries not in Expo

---

## 💡 Recommendation for Your App

**STICK WITH EXPO!** ✅

**Reasons:**
1. ✅ Your app is already configured for Expo
2. ✅ All your dependencies work with Expo
3. ✅ Easier builds (no Android Studio setup needed)
4. ✅ Can build iOS on Windows via EAS
5. ✅ Faster development cycle
6. ✅ Over-the-air updates available

**If you need custom native code later:**
- Expo supports "development builds" (custom native code)
- Can use `expo prebuild` to generate native folders
- Can eject to bare workflow if needed

---

## 🚀 Quick Start Commands

### EXPO (Your Current Setup)

```bash
# Development
npm start

# Build Android APK (testing)
npm run build:android:preview

# Build Android AAB (production)
npm run build:android:production

# Build iOS (production)
npm run build:ios:production

# Build both platforms
npm run build:all
```

### React Native CLI

```bash
# Development
npm start
npm run android  # Android
npm run ios      # iOS (macOS only)

# Build Android
cd android && ./gradlew assembleRelease

# Build iOS (macOS only)
cd ios && pod install
# Then open in Xcode
```

---

## 📝 Migration: Expo → React Native CLI

If you ever need to migrate:

```bash
# 1. Generate native folders
npx expo prebuild

# 2. This creates android/ and ios/ folders
# 3. You can now use React Native CLI commands
# 4. But you lose some Expo features
```

**Note:** This is one-way. Hard to go back to Expo managed workflow.

---

## 🆘 Troubleshooting

### EXPO Build Issues

```bash
# Clear cache
expo start -c

# Check build status
eas build:list

# View build logs
eas build:view [BUILD_ID]
```

### React Native CLI Issues

```bash
# Android: Clean build
cd android && ./gradlew clean

# iOS: Clean pods
cd ios && rm -rf Pods && pod install

# Clear Metro cache
npm start -- --reset-cache
```

---

## 📚 Resources

### EXPO
- Docs: https://docs.expo.dev/
- EAS Build: https://docs.expo.dev/build/introduction/
- Forums: https://forums.expo.dev/

### React Native CLI
- Docs: https://reactnative.dev/docs/environment-setup
- Android Setup: https://reactnative.dev/docs/environment-setup?os=windows
- iOS Setup: https://reactnative.dev/docs/environment-setup?os=macos

---

## ✅ Final Recommendation

**For your RektoApp: Use EXPO!**

1. ✅ Already configured
2. ✅ Easier builds
3. ✅ Faster development
4. ✅ Can build iOS on Windows
5. ✅ All features you need are available

**Start building now:**
```bash
npm run build:android:preview
```

---

**Questions? Check the detailed guides:**
- `BUILD_GUIDE.md` - Complete build instructions
- `QUICK_BUILD.md` - 5-minute quick start
