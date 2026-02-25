# 🚀 Complete Build Guide - From Scratch to Production

This is your **ONE guide** for everything: running, building, and deploying your RektoApp.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [First Time Setup](#first-time-setup)
3. [Running Your App](#running-your-app)
4. [Building Your App](#building-your-app)
5. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

### What You Need:

1. **Node.js** (v18 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version` in PowerShell

2. **Expo Account** (Free)
   - Sign up: https://expo.dev/signup

3. **PowerShell** (Already on Windows)

---

## 🎯 First Time Setup

### Step 1: Open PowerShell

Press `Windows Key`, type `PowerShell`, press `Enter`

### Step 2: Navigate to Your Project

```powershell
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"
```

### Step 3: Verify You're in the Right Place

```powershell
pwd
# Should show: C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp

dir
# Should show: package.json, app.json, src/, etc.
```

### Step 4: Check Node.js

```powershell
node --version
# Should show: v18.x.x or higher
```

**If error:** Install Node.js from https://nodejs.org/ and restart PowerShell

### Step 5: Install Dependencies

```powershell
npm install
```

**Wait 2-5 minutes** - Downloads all required packages

### Step 6: Install EAS CLI (Global)

```powershell
npm install -g eas-cli
```

**Note:** Can run from any folder (the `-g` makes it global)

### Step 7: Verify EAS CLI

```powershell
eas --version
# Should show: eas-cli/x.x.x
```

### Step 8: Login to Expo

```powershell
eas login
```

**If no account:** Create one at https://expo.dev/signup

---

## 🏃 Running Your App

### Method 1: Development Server (Recommended)

```powershell
# Make sure you're in RektoApp folder
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"

# Start the app
npm start
```

**You'll see:**
- QR code in terminal
- Metro bundler running

**To test on phone:**
1. Install **Expo Go** app on your phone
2. Scan the QR code
3. App loads on your phone! 📱

**To test on emulator:**
- Press `a` for Android emulator
- Press `i` for iOS simulator (macOS only)
- Press `w` for web browser

### Method 2: Direct Run

```powershell
# Android
npm run android

# iOS (macOS only)
npm run ios

# Web
npm run web
```

---

## 🏗️ Building Your App

### Step 1: Update Package Name (Important!)

**Edit `app.json`:**

Change these values:
```json
{
  "expo": {
    "android": {
      "package": "com.yourcompany.rektoapp"  // Change from "com.anonymous.RektoApp"
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.rektoapp"  // Change from "com.anonymous.RektoApp"
    }
  }
}
```

**Why?** `com.anonymous.RektoApp` is a placeholder. You need your own unique package name.

### Step 2: Update Version

**Edit `app.json`:**

```json
{
  "expo": {
    "version": "1.0.0",  // Update for each release
    "android": {
      "versionCode": 1  // Increment for each release (1, 2, 3...)
    },
    "ios": {
      "buildNumber": "1"  // Increment for each release ("1", "2", "3"...)
    }
  }
}
```

### Step 3: Verify eas.json

**Your `eas.json` should look like this:**

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
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

**Note:** `bundleIdentifier` should be in `app.json`, NOT in `eas.json`!

### Step 4: Build Android APK (Testing)

```powershell
# Make sure you're in RektoApp folder
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"

# Build APK
eas build --platform android --profile preview
```

**What happens:**
1. Uploads your code to Expo servers
2. Builds your app in the cloud
3. Takes 10-20 minutes
4. You get a download link

**After build completes:**
- Check email for download link
- Or visit: https://expo.dev/builds
- Download APK and install on Android device

### Step 5: Build Android AAB (Production - Play Store)

```powershell
eas build --platform android --profile production
```

**This creates an AAB file** (required for Google Play Store)

**Time:** 15-25 minutes

### Step 6: Build iOS (Production - App Store)

```powershell
eas build --platform ios --profile production
```

**Note:** Works on Windows! No macOS needed.

**Time:** 20-30 minutes

**After build:**
- Download from https://expo.dev/builds
- Upload to App Store Connect

---

## 📱 Submitting to Stores

### Google Play Store

1. **Create App Listing:**
   - Go to https://play.google.com/console
   - Create new app
   - Fill in store listing

2. **Upload AAB:**
   - Go to Production → Create new release
   - Upload your `.aab` file
   - Add release notes
   - Submit for review

### Apple App Store

1. **Create App Listing:**
   - Go to https://appstoreconnect.apple.com
   - Create new app
   - Fill in app information

2. **Upload Build:**
   - Download your iOS build from expo.dev
   - Use Transporter app or Xcode to upload
   - Or use: `eas submit --platform ios`

3. **Submit for Review:**
   - Complete app listing
   - Submit for review
   - Wait for approval (24-48 hours)

---

## 🐛 Troubleshooting

### Error 1: "eas.json is not valid"

**Error:**
```
eas.json is not valid.
- "build.production.ios.bundleIdentifier" is not allowed
```

**Solution:**
Remove `bundleIdentifier` from `eas.json`. It should only be in `app.json`:

**Wrong (eas.json):**
```json
"production": {
  "ios": {
    "bundleIdentifier": "com.anonymous.RektoApp"  // ❌ Remove this
  }
}
```

**Correct (eas.json):**
```json
"production": {
  "android": {
    "buildType": "app-bundle"
  }
  // bundleIdentifier is in app.json, not here
}
```

**Correct (app.json):**
```json
"ios": {
  "bundleIdentifier": "com.yourcompany.rektoapp"  // ✅ Here
}
```

### Error 2: "npm is not recognized"

**Solution:**
1. Install Node.js from https://nodejs.org/
2. Restart PowerShell
3. Verify: `node --version`

### Error 3: "Command not found: eas"

**Solution:**
```powershell
npm install -g eas-cli
eas --version
```

### Error 4: "Port 8081 already in use"

**Solution:**
```powershell
# Stop the previous server (Ctrl + C)
# Or kill the port
npx kill-port 8081
```

### Error 5: "Package name already exists"

**Solution:**
Change package name in `app.json`:
```json
"android": {
  "package": "com.yourcompany.rektoapp"  // Use unique name
}
```

Then rebuild:
```powershell
eas build --platform android --profile preview
```

### Error 6: Build Fails

**Check:**
1. All dependencies installed: `npm install`
2. `app.json` is valid JSON
3. `eas.json` is valid JSON
4. Package name is unique
5. Check build logs at https://expo.dev/builds

---

## 📝 Quick Command Reference

### Setup (First Time)
```powershell
# Navigate to project
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"

# Install dependencies
npm install

# Install EAS CLI
npm install -g eas-cli

# Login
eas login
```

### Running
```powershell
# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

### Building
```powershell
# Build Android APK (testing)
eas build --platform android --profile preview

# Build Android AAB (production)
eas build --platform android --profile production

# Build iOS (production)
eas build --platform ios --profile production
```

### Checking
```powershell
# Check Node.js
node --version

# Check npm
npm --version

# Check EAS CLI
eas --version

# Check current folder
pwd

# List files
dir
```

---

## ✅ Complete Workflow

### First Time (Do Once)

```powershell
# 1. Open PowerShell
# 2. Navigate to project
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"

# 3. Install dependencies
npm install

# 4. Install EAS CLI
npm install -g eas-cli

# 5. Login
eas login

# 6. Update package name in app.json (change com.anonymous.RektoApp)
```

### Every Day (Development)

```powershell
# 1. Navigate to project
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"

# 2. Start app
npm start

# 3. Scan QR code with Expo Go app
```

### When Ready to Build

```powershell
# 1. Update version in app.json

# 2. Build Android APK (testing)
eas build --platform android --profile preview

# 3. Test the APK on your device

# 4. Build Android AAB (production)
eas build --platform android --profile production

# 5. Upload to Google Play Store
```

---

## 🎯 Important Notes

### Package Name Rules

- Must be unique (no one else can use it)
- Format: `com.yourcompany.appname`
- Examples:
  - ✅ `com.rekto.app`
  - ✅ `com.yourcompany.rektoapp`
  - ❌ `com.anonymous.RektoApp` (placeholder)

### Version Management

**Android:**
- `versionCode`: Integer (1, 2, 3...) - Must increase each release
- `version`: String ("1.0.0", "1.0.1"...) - User-facing version

**iOS:**
- `buildNumber`: String ("1", "2"...) - Must increase each release
- `version`: String ("1.0.0"...) - User-facing version

### Build Types

- **APK**: Direct install file, for testing
- **AAB**: Google Play optimized, required for Play Store
- **IPA**: iOS app file, for App Store

---

## 📚 Resources

- **Expo Docs:** https://docs.expo.dev/
- **EAS Build:** https://docs.expo.dev/build/introduction/
- **Build Status:** https://expo.dev/builds
- **Expo Account:** https://expo.dev

---

## 🎉 You're Ready!

**To start developing:**
```powershell
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"
npm start
```

**To build for production:**
```powershell
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"
eas build --platform android --profile preview
```

**That's everything you need!** 🚀
