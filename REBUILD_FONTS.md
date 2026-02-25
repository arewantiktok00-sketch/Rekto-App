# Rebuild Fonts - PowerShell Commands

## For Expo Projects

Since this is an Expo project, you don't need `pod install`. Just restart with cache cleared:

### Option 1: Clear Cache and Restart (Recommended)
```powershell
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"
npx expo start --clear
```

### Option 2: Rebuild Native Apps (if using development build)
```powershell
# For iOS (if you have ios folder)
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"
cd ios
pod install
cd ..

# For Android
cd "C:\Users\Arewan\Documents\DUGMA\Test v2\RektoApp"
npx expo run:android
```

## PowerShell Command Syntax

PowerShell uses `;` instead of `&&`:

```powershell
# WRONG (bash syntax)
cd ios && pod install && cd ..

# CORRECT (PowerShell syntax)
cd ios; pod install; cd ..
```

## Quick Test

After restarting, check if fonts load:
1. Open app
2. Check console for font loading messages
3. Verify text appears in correct fonts
4. Switch language to Kurdish/Arabic and verify Rabar_021 appears
