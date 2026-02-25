# Testing Fonts on Android Studio SDK/Emulator

## For Expo Projects - NO APK BUILD NEEDED! ✅

You **DON'T need to build APK** to test fonts. Expo loads fonts via JavaScript.

## How to Test Fonts on Android Emulator

### Option 1: Expo Go App (Easiest - No Build)
```powershell
# 1. Start Expo dev server
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"
npx expo start

# 2. Press 'a' to open on Android emulator
# OR scan QR code with Expo Go app on your phone
```

**Fonts work in Expo Go** because they're loaded via `expo-font` (JavaScript).

### Option 2: Development Build (If you have native code)
```powershell
# Build and run on Android emulator
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"
npx expo run:android
```

This builds the app and installs on emulator. Takes 5-10 minutes first time.

## What Each Command Does

| Command | What It Does | Builds APK? |
|---------|-------------|-------------|
| `npx expo start` | Starts Metro bundler | ❌ No |
| `npx expo start --android` | Opens on Android emulator (Expo Go) | ❌ No |
| `npx expo run:android` | Builds native app + installs on emulator | ✅ Yes (development build) |

## Check if Fonts Are Loading

### Step 1: Check Console Logs
When app starts, look for:
```
[App] All fonts loaded successfully
```

If you see errors, fonts aren't loading.

### Step 2: Verify Font Names
The font names in code MUST match what you loaded:

**In App.tsx:**
```javascript
'Poppins-Regular': require('../../assets/fonts/Poppins-Regular.ttf'),
```

**In fonts.ts:**
```javascript
regular: 'Poppins-Regular',  // Must match exactly!
```

### Step 3: Test Font Application
1. Open app on Android emulator
2. Check Dashboard - text should use Poppins
3. Switch language to Kurdish - text should use Rabar_021
4. If fonts don't appear, check console for errors

## Common Issues

### Issue 1: Fonts Not Loading
**Check:**
- Console for errors
- Font file paths are correct
- Font names match PostScript names

### Issue 2: Wrong Font Appears
**Fix:**
- Verify PostScript name (might be `Rabar021` not `Rabar_021`)
- Check `fontFamily` is applied to all text styles

### Issue 3: System Font Instead of Custom Font
**Fix:**
- Fonts not loaded - check console
- Font name mismatch - verify PostScript names
- Reload app: Shake device → Reload

## Quick Test Commands

```powershell
# Start Expo (clears cache)
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"
npx expo start --clear

# Then press 'a' for Android emulator
```

## Font Loading Status

Check in console:
- ✅ `[App] All fonts loaded successfully` = Fonts loaded
- ❌ `Failed to load fonts: ...` = Error loading fonts
- ⚠️ No message = Fonts might not be loading

## Next Steps

1. **Start Expo**: `npx expo start --clear`
2. **Open on Android**: Press 'a' or use Expo Go
3. **Check console**: Look for font loading message
4. **Verify fonts**: Text should use Poppins/Rabar_021

**You DON'T need to build APK to test fonts!** Expo Go works fine.
