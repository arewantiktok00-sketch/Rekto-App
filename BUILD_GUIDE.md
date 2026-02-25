# 📱 Complete Build Guide for RektoApp

This guide will help you build your Expo/React Native app for production on both Android and iOS.

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Method 1: EAS Build (Recommended)](#method-1-eas-build-recommended)
3. [Method 2: Local Build](#method-2-local-build)
4. [Android Build](#android-build)
5. [iOS Build](#ios-build)
6. [Configuration](#configuration)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Expo CLI** - Install globally: `npm install -g expo-cli`
- **EAS CLI** (for cloud builds) - Install: `npm install -g eas-cli`

### For Android Builds
- **Java Development Kit (JDK)** 17 or higher
- **Android Studio** with Android SDK
- **Android SDK Platform Tools**
- Environment variables set:
  - `ANDROID_HOME` - Path to Android SDK
  - `JAVA_HOME` - Path to JDK

### For iOS Builds (macOS only)
- **macOS** (required for iOS builds)
- **Xcode** (latest version from App Store)
- **CocoaPods** - Install: `sudo gem install cocoapods`
- **Apple Developer Account** ($99/year)

### Accounts Needed
- **Expo Account** (free) - Sign up at [expo.dev](https://expo.dev)
- **Google Play Console** (for Android) - $25 one-time fee
- **Apple App Store Connect** (for iOS) - $99/year

---

## Method 1: EAS Build (Recommended) ☁️

EAS Build is Expo's cloud build service. It's the easiest and most reliable way to build your app.

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
eas login
```

### Step 3: Configure EAS Build

Create `eas.json` in your project root:

```bash
cd RektoApp
eas build:configure
```

Or manually create `eas.json`:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "gradleCommand": ":app:assembleDebug"
      },
      "ios": {
        "buildConfiguration": "Debug"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "bundleIdentifier": "com.anonymous.RektoApp"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Step 4: Update app.json

Make sure your `app.json` has proper configuration:

```json
{
  "expo": {
    "name": "RektoApp",
    "slug": "RektoApp",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "rektoapp",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.anonymous.RektoApp",
      "buildNumber": "1"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/images/android-icon-foreground.png"
      },
      "package": "com.anonymous.RektoApp",
      "versionCode": 1,
      "permissions": [
        "INTERNET",
        "ACCESS_NETWORK_STATE"
      ]
    }
  }
}
```

### Step 5: Build for Android

#### Build APK (for testing):
```bash
eas build --platform android --profile preview
```

#### Build AAB (for Google Play Store):
```bash
eas build --platform android --profile production
```

### Step 6: Build for iOS

#### Build for Simulator (testing):
```bash
eas build --platform ios --profile preview
```

#### Build for App Store:
```bash
eas build --platform ios --profile production
```

### Step 7: Download Build

After the build completes, you'll get a link to download your app. You can also check builds at:
- [expo.dev/builds](https://expo.dev/builds)

---

## Method 2: Local Build 🏠

If you prefer to build locally on your machine.

### For Android

#### Step 1: Generate Native Code

```bash
cd RektoApp
npx expo prebuild --platform android
```

#### Step 2: Build APK (Debug)

```bash
cd android
./gradlew assembleDebug
```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

#### Step 3: Build AAB (Release - for Play Store)

1. Create a keystore (one-time):
```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore rektoapp-release-key.keystore -alias rektoapp-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

2. Create `android/keystore.properties`:
```properties
rektoappReleaseStoreFile=rektoapp-release-key.keystore
rektoappReleaseStorePassword=YOUR_STORE_PASSWORD
rektoappReleaseKeyAlias=rektoapp-key-alias
rektoappReleaseKeyPassword=YOUR_KEY_PASSWORD
```

3. Update `android/app/build.gradle`:
```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('keystore.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    ...
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['rektoappReleaseStoreFile'])
                storePassword keystoreProperties['rektoappReleaseStorePassword']
                keyAlias keystoreProperties['rektoappReleaseKeyAlias']
                keyPassword keystoreProperties['rektoappReleaseKeyPassword']
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

4. Build release AAB:
```bash
cd android
./gradlew bundleRelease
```

The AAB will be at: `android/app/build/outputs/bundle/release/app-release.aab`

### For iOS (macOS only)

#### Step 1: Generate Native Code

```bash
cd RektoApp
npx expo prebuild --platform ios
```

#### Step 2: Install Dependencies

```bash
cd ios
pod install
cd ..
```

#### Step 3: Open in Xcode

```bash
open ios/RektoApp.xcworkspace
```

#### Step 4: Configure Signing

1. In Xcode, select your project
2. Go to "Signing & Capabilities"
3. Select your team
4. Xcode will automatically manage provisioning

#### Step 5: Build

- **For Simulator**: Product → Destination → Choose Simulator → Product → Run (⌘R)
- **For Device**: Connect device → Select device → Product → Run (⌘R)
- **For App Store**: Product → Archive → Distribute App

---

## Android Build Details

### APK vs AAB

- **APK**: Direct install file, larger size, for direct distribution
- **AAB**: Google Play optimized format, smaller size, required for Play Store

### Version Management

Update in `app.json`:
```json
{
  "expo": {
    "android": {
      "versionCode": 2  // Increment for each release
    }
  }
}
```

### Permissions

Add required permissions in `app.json`:
```json
{
  "expo": {
    "android": {
      "permissions": [
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

---

## iOS Build Details

### Bundle Identifier

Update in `app.json`:
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.rektoapp"
    }
  }
}
```

### Version Management

```json
{
  "expo": {
    "ios": {
      "buildNumber": "2"  // Increment for each release
    }
  }
}
```

### App Store Requirements

1. **App Icons**: 1024x1024px required
2. **Screenshots**: Required for App Store listing
3. **Privacy Policy**: Required URL
4. **App Store Connect**: Create app listing before submission

---

## Configuration

### Environment Variables

Create `.env` file (don't commit to git):

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

Update `app.json` to use environment variables:
```json
{
  "expo": {
    "extra": {
      "supabaseUrl": process.env.EXPO_PUBLIC_SUPABASE_URL,
      "supabaseAnonKey": process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    }
  }
}
```

### Update Package Name

**Android** (`app.json`):
```json
{
  "expo": {
    "android": {
      "package": "com.yourcompany.rektoapp"
    }
  }
}
```

**iOS** (`app.json`):
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.rektoapp"
    }
  }
}
```

After changing package name, regenerate native code:
```bash
npx expo prebuild --clean
```

---

## Quick Build Commands

### EAS Build (Cloud)
```bash
# Android APK (testing)
eas build --platform android --profile preview

# Android AAB (production)
eas build --platform android --profile production

# iOS (production)
eas build --platform ios --profile production

# Both platforms
eas build --platform all --profile production
```

### Local Build
```bash
# Android APK
cd android && ./gradlew assembleDebug

# Android AAB
cd android && ./gradlew bundleRelease

# iOS (requires Xcode)
npx expo run:ios
```

---

## Troubleshooting

### Common Issues

#### 1. "Command not found: eas"
```bash
npm install -g eas-cli
```

#### 2. Android Build Fails
- Check Java version: `java -version` (should be 17+)
- Check Android SDK: Ensure Android SDK is installed
- Clean build: `cd android && ./gradlew clean`

#### 3. iOS Build Fails
- Update CocoaPods: `cd ios && pod repo update && pod install`
- Clean Xcode: Product → Clean Build Folder (⇧⌘K)

#### 4. "Package name already exists"
- Change package name in `app.json`
- Run `npx expo prebuild --clean`

#### 5. Keystore Issues
- Never lose your keystore file!
- Backup keystore securely
- If lost, you cannot update your app on Play Store

#### 6. Build Timeout
- EAS Build has time limits
- Check build logs at expo.dev
- Consider upgrading EAS plan for longer builds

---

## Next Steps After Building

### Android (Google Play Store)

1. **Create App Listing**:
   - Go to [Google Play Console](https://play.google.com/console)
   - Create new app
   - Fill in store listing details

2. **Upload AAB**:
   - Go to Production → Create new release
   - Upload your `.aab` file
   - Add release notes
   - Submit for review

3. **Testing**:
   - Use Internal Testing track first
   - Test on multiple devices
   - Fix any issues before production

### iOS (App Store)

1. **Create App Listing**:
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Create new app
   - Fill in app information

2. **Upload Build**:
   - Use Xcode: Product → Archive → Distribute App
   - Or use EAS Submit: `eas submit --platform ios`

3. **App Review**:
   - Submit for review
   - Wait for Apple approval (usually 24-48 hours)

---

## Useful Resources

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [React Native Documentation](https://reactnative.dev/)
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com)

---

## Support

If you encounter issues:
1. Check Expo forums: [forums.expo.dev](https://forums.expo.dev)
2. Check GitHub issues
3. Review build logs carefully
4. Ensure all prerequisites are installed

---

**Good luck with your build! 🚀**
