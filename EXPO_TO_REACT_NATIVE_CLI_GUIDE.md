# 🚀 Complete Guide: Converting Expo to Pure React Native CLI

**For Beginners - Step by Step Like You're Learning Everything for the First Time!**

---

## 📚 What's the Difference?

### Expo (What You Have Now)
- ✅ Easy to start - just `npm start`
- ✅ No need to install Android Studio / Xcode
- ✅ Can test on phone with Expo Go app
- ❌ Limited native code access
- ❌ Bigger app size
- ❌ Some packages need "ejecting"

### React Native CLI (What We're Converting To)
- ✅ Full control over native code
- ✅ Smaller app size
- ✅ Can use any native library
- ✅ Better performance
- ❌ Need Android Studio (for Android)
- ❌ Need Xcode (for iOS - Mac only)
- ❌ More setup steps

---

## 🎯 Step 1: Understand Your Current Setup

**Right now, you have:**
- Expo project with `android/` folder (this is called "bare workflow")
- You can already build native apps
- But you're still using Expo's tools

**We're going to:**
- Remove Expo dependencies
- Use pure React Native CLI
- Keep all your code (it will work!)

---

## 🛠️ Step 2: Prerequisites (What You Need)

### For Android Development:
1. **Java Development Kit (JDK)**
   - Download: https://adoptium.net/
   - Install JDK 17 or 21
   - Verify: Open PowerShell, type `java -version`

2. **Android Studio**
   - Download: https://developer.android.com/studio
   - Install it (takes 10-15 minutes)
   - Open Android Studio → More Actions → SDK Manager
   - Install:
     - Android SDK Platform 33
     - Android SDK Build-Tools
     - Android Emulator
     - Android SDK Platform-Tools

3. **Set Environment Variables**
   - Press `Windows Key`, type "Environment Variables"
   - Click "Edit the system environment variables"
   - Click "Environment Variables" button
   - Under "System variables", click "New"
   - Add these:
     ```
     ANDROID_HOME = C:\Users\YourName\AppData\Local\Android\Sdk
     ```
     (Replace YourName with your actual username)
   - Find "Path" variable, click "Edit"
   - Add these paths:
     ```
     %ANDROID_HOME%\platform-tools
     %ANDROID_HOME%\tools
     %ANDROID_HOME%\tools\bin
     ```
   - Click OK on everything
   - **Restart PowerShell** (important!)

4. **Verify Setup**
   ```powershell
   # Open NEW PowerShell window
   java -version
   adb version
   ```

### For iOS Development (Mac Only):
1. **Xcode** (from App Store)
2. **CocoaPods**: `sudo gem install cocoapods`
3. **Xcode Command Line Tools**: `xcode-select --install`

---

## 🔄 Step 3: Create a Fresh React Native CLI Project

**IMPORTANT:** We'll create a NEW project and copy your code over. This is safer!

### Step 3.1: Create New React Native Project

```powershell
# Go to your parent folder (one level up from RektoApp)
cd "C:\Users\Arewan\Documents\DUGMA\Test v2"

# Create new React Native project
npx react-native@latest init RektoAppCLI --version 0.81.5

# Wait 2-3 minutes for it to install...
```

**What this does:**
- Creates a folder called `RektoAppCLI`
- Installs React Native 0.81.5 (same version you're using)
- Sets up Android and iOS folders
- Creates basic project structure

---

## 📦 Step 4: Copy Your Code

### Step 4.1: Copy Your Source Code

```powershell
# Copy your src folder
xcopy "RektoApp\src" "RektoAppCLI\src\" /E /I /Y

# Copy your assets
xcopy "RektoApp\assets" "RektoAppCLI\assets\" /E /I /Y

# Copy other important files
copy "RektoApp\babel.config.js" "RektoAppCLI\"
copy "RektoApp\tsconfig.json" "RektoAppCLI\"
copy "RektoApp\metro.config.js" "RektoAppCLI\"
```

### Step 4.2: Update package.json

**Open `RektoAppCLI/package.json` and add your dependencies:**

```json
{
  "dependencies": {
    "react": "19.1.0",
    "react-native": "0.81.5",
    
    // Navigation
    "@react-navigation/native": "^7.1.28",
    "@react-navigation/native-stack": "^7.10.1",
    "@react-navigation/bottom-tabs": "^7.10.1",
    "react-native-screens": "^4.16.0",
    "react-native-safe-area-context": "^5.6.0",
    "react-native-gesture-handler": "^2.28.0",
    
    // Supabase
    "@supabase/supabase-js": "^2.91.1",
    "react-native-url-polyfill": "^3.0.0",
    "@react-native-async-storage/async-storage": "^2.2.0",
    
    // UI Components
    "@gorhom/bottom-sheet": "^5.2.8",
    "@react-native-community/slider": "^5.1.2",
    "@react-native-community/datetimepicker": "^8.6.0",
    "@react-native-picker/picker": "^2.11.4",
    "react-native-linear-gradient": "^2.8.3",
    "react-native-toast-message": "^2.3.3",
    "react-native-svg": "^15.12.1",
    "lucide-react-native": "^0.562.0",
    
    // OneSignal
    "react-native-onesignal": "latest",
    
    // Other
    "lottie-react-native": "^7.3.5",
    "react-native-reanimated": "^4.1.1",
    "i18next": "^25.8.0",
    "react-i18next": "^16.5.3",
    "date-fns": "^4.1.0"
  }
}
```

### Step 4.3: Install Dependencies

```powershell
cd RektoAppCLI
npm install
```

---

## 🔧 Step 5: Replace Expo Packages

### Step 5.1: Find and Replace Expo Imports

**You need to replace these in your code:**

| Expo Package | React Native CLI Replacement |
|-------------|------------------------------|
| `expo-font` | `@react-native-community/fonts` or use system fonts |
| `expo-image` | `react-native` `Image` component |
| `expo-linear-gradient` | `react-native-linear-gradient` ✅ (you already have this!) |
| `expo-constants` | Remove or use `react-native` `Platform` |
| `expo-splash-screen` | `react-native-splash-screen` |
| `expo-notifications` | `react-native-onesignal` ✅ (you're using this!) |
| `expo-linking` | `react-native` `Linking` API |
| `expo-haptics` | `react-native-haptic-feedback` |
| `expo-image-picker` | `react-native-image-picker` |

### Step 5.2: Update Your Code Files

**Search and replace in all `.tsx` and `.ts` files:**

1. **Font Loading** (`src/App.tsx`):
   ```typescript
   // REMOVE THIS:
   import * as Font from 'expo-font';
   await Font.loadAsync({...});
   
   // REPLACE WITH:
   // Use system fonts or load fonts manually
   // For custom fonts, add to android/app/src/main/assets/fonts/
   ```

2. **Image Component**:
   ```typescript
   // REMOVE:
   import { Image } from 'expo-image';
   
   // REPLACE WITH:
   import { Image } from 'react-native';
   ```

3. **Linear Gradient** (Already correct!):
   ```typescript
   // This is already correct:
   import { LinearGradient } from 'react-native-linear-gradient';
   ```

4. **Constants**:
   ```typescript
   // REMOVE:
   import Constants from 'expo-constants';
   
   // REPLACE WITH:
   import { Platform } from 'react-native';
   // Use Platform.OS instead of Constants.platform
   ```

---

## 📱 Step 6: Configure Android

### Step 6.1: Update Android Package Name

**File: `android/app/build.gradle`**
```gradle
android {
    namespace 'com.Arewan.RektoApp'  // Your package name
    defaultConfig {
        applicationId 'com.Arewan.RektoApp'
        // ... rest of config
    }
}
```

### Step 6.2: Add Permissions

**File: `android/app/src/main/AndroidManifest.xml`**
```xml
<manifest>
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <!-- Add other permissions you need -->
</manifest>
```

### Step 6.3: Configure OneSignal (Android)

**File: `android/build.gradle`**
```gradle
buildscript {
    dependencies {
        classpath 'gradle.plugin.com.onesignal:onesignal-gradle-plugin:[0.14.0, 0.99.99]'
    }
}
```

**File: `android/app/build.gradle`**
```gradle
apply plugin: 'com.onesignal.androidsdk.onesignal-gradle-plugin'
```

### Step 6.4: Add Custom Fonts

1. Create folder: `android/app/src/main/assets/fonts/`
2. Copy your font files there:
   - `Rabar_021.ttf`
   - `Poppins-Regular.ttf`
   - `Poppins-Medium.ttf`
   - etc.

---

## 🍎 Step 7: Configure iOS (Mac Only)

### Step 7.1: Install Pods

```bash
cd ios
pod install
cd ..
```

### Step 7.2: Update Bundle Identifier

**File: `ios/RektoAppCLI/Info.plist`**
```xml
<key>CFBundleIdentifier</key>
<string>com.Arewan.RektoApp</string>
```

### Step 7.3: Configure OneSignal (iOS)

**File: `ios/RektoAppCLI/AppDelegate.mm`**
```objc
#import <OneSignalFramework/OneSignalFramework.h>

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  [OneSignal initialize:@"2dfb6596-21c6-4c73-ad3c-28cc1182eeff" withLaunchOptions:launchOptions];
  [OneSignal.Notifications requestPermission:^(BOOL accepted) {
    NSLog(@"Permission accepted: %d", accepted);
  }];
  return YES;
}
```

---

## 🚀 Step 8: Update Entry Point

### Step 8.1: Update index.js

**File: `RektoAppCLI/index.js`**
```javascript
import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
```

### Step 8.2: Create app.json (Simple Version)

**File: `RektoAppCLI/app.json`**
```json
{
  "name": "RektoAppCLI",
  "displayName": "RektoApp"
}
```

---

## 🧪 Step 9: Test Your App

### Step 9.1: Start Metro Bundler

```powershell
cd RektoAppCLI
npm start
```

**Keep this running!**

### Step 9.2: Run on Android

**Open a NEW PowerShell window:**
```powershell
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoAppCLI"
npm run android
```

**OR manually:**
```powershell
# Start emulator first (from Android Studio)
# Then:
npx react-native run-android
```

### Step 9.3: Run on iOS (Mac Only)

```bash
npm run ios
```

---

## 🐛 Step 10: Fix Common Issues

### Issue 1: "Unable to resolve module"
**Fix:**
```powershell
# Clear cache and reinstall
npm start -- --reset-cache
# In another terminal:
npm install
```

### Issue 2: "Gradle build failed"
**Fix:**
```powershell
cd android
./gradlew clean
cd ..
npm run android
```

### Issue 3: "Font not found"
**Fix:**
- Make sure fonts are in `android/app/src/main/assets/fonts/`
- Rebuild the app: `npm run android`

### Issue 4: "OneSignal not working"
**Fix:**
- Make sure you added the gradle plugin
- Rebuild: `cd android && ./gradlew clean && cd .. && npm run android`

---

## 📦 Step 11: Build for Production

### Android APK (Testing)

```powershell
cd android
./gradlew assembleRelease
```

**APK location:** `android/app/build/outputs/apk/release/app-release.apk`

### Android AAB (Play Store)

```powershell
cd android
./gradlew bundleRelease
```

**AAB location:** `android/app/build/outputs/bundle/release/app-release.aab`

### iOS (Mac Only)

1. Open `ios/RektoAppCLI.xcworkspace` in Xcode
2. Product → Archive
3. Distribute App

---

## ✅ Step 12: Final Checklist

- [ ] All Expo packages replaced
- [ ] Android Studio installed and configured
- [ ] Environment variables set
- [ ] Dependencies installed (`npm install`)
- [ ] Fonts copied to Android assets
- [ ] OneSignal configured in native code
- [ ] App runs on Android emulator
- [ ] App runs on real device
- [ ] Production build works

---

## 🎯 Quick Reference Commands

```powershell
# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS (Mac)
npm run ios

# Clean build
cd android
./gradlew clean
cd ..

# Build release APK
cd android
./gradlew assembleRelease

# Build release AAB
cd android
./gradlew bundleRelease
```

---

## 💡 Pro Tips

1. **Keep Expo version as backup** - Don't delete `RektoApp` folder until `RektoAppCLI` works perfectly!

2. **Use Git** - Commit your code before starting:
   ```powershell
   git add .
   git commit -m "Before converting to React Native CLI"
   ```

3. **Test incrementally** - After each step, test if the app still runs

4. **Read error messages** - They usually tell you exactly what's wrong

5. **Use React Native Debugger** - Install it for better debugging

---

## 🆘 Need Help?

**Common Resources:**
- React Native Docs: https://reactnative.dev/docs/getting-started
- Stack Overflow: Search your error message
- React Native Community: https://github.com/react-native-community

**Your project structure should look like:**
```
RektoAppCLI/
├── android/          (Native Android code)
├── ios/             (Native iOS code - Mac only)
├── src/              (Your React code)
├── assets/           (Images, fonts, etc.)
├── package.json      (Dependencies)
├── index.js          (Entry point)
└── metro.config.js   (Bundler config)
```

---

## 🎉 You're Done!

Once everything works:
1. Test thoroughly on real devices
2. Build production APK/AAB
3. Upload to Play Store / App Store
4. Delete old Expo project (after confirming new one works!)

**Remember:** This is a learning process. Take your time, test after each step, and don't be afraid to ask for help!

Good luck! 🚀
