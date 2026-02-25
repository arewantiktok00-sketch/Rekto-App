# Push Notifications - Important Note

## Current Status
Push notifications are currently **disabled** for Expo Go compatibility.

## Why?
Firebase messaging (`@react-native-firebase/messaging`) requires native code and does **NOT work with Expo Go**. It only works in:
- Development builds (custom builds)
- Production builds (when you build your own app)

## What I Did
I've stubbed out the push notifications functions so the app can run in Expo Go without errors. The functions will:
- Return `false` for permissions
- Return `null` for tokens
- Do nothing when setting up handlers

This means push notifications won't work, but the app won't crash.

## To Enable Push Notifications Later:

### Option 1: Use Expo Notifications (Recommended for Expo)
```bash
npx expo install expo-notifications
```

Then update `pushNotifications.ts` to use Expo's notification API instead of Firebase.

### Option 2: Create Development Build with Firebase
1. Install Firebase packages:
   ```bash
   npm install @react-native-firebase/app @react-native-firebase/messaging
   ```

2. Create development build:
   ```bash
   npx expo prebuild
   npx expo run:android  # or run:ios
   ```

3. Update `pushNotifications.ts` to use Firebase (restore original code)

## Current Behavior
- ✅ App runs in Expo Go without errors
- ❌ Push notifications don't work (expected)
- ✅ All other features work normally

You can test all features except push notifications in Expo Go!
