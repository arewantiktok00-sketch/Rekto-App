# Premium Splash Screen Implementation

## Overview
A two-stage premium splash screen implementation inspired by Netflix/Disney+ with smooth animations and professional polish.

## Architecture

### Stage 1: Native Splash (Instant)
- Configured in `app.json`
- Shows immediately when app launches
- Static background (#0A0A0A) with centered logo
- Automatically hidden when app is ready

### Stage 2: Animated Splash (In-App)
- Component: `src/screens/AnimatedSplash.tsx`
- Duration: ~2.2 seconds
- Features:
  - Dark gradient background with subtle radial glow
  - Logo fade-in + scale-up animation
  - Light sweep/glow effect across logo
  - Haptic feedback on completion (Android)
  - Respects safe area (notch)

## Files Modified/Created

### Created Files
1. **`src/screens/AnimatedSplash.tsx`**
   - Premium animated splash screen component
   - Uses React Native Reanimated for smooth 60fps animations
   - SVG-based light sweep effect
   - Haptic feedback integration

### Modified Files
1. **`src/App.tsx`**
   - Replaced `SplashScreen` with `AnimatedSplash`
   - Updated state management for two-stage splash
   - Maintains font loading and native splash coordination

2. **`app.json`**
   - Updated native splash configuration
   - Background color: `#0A0A0A` (near-black)
   - Logo: `./assets/images/icon.png`
   - Ready for custom logo at `assets/logo.png`

## Logo Setup

### Current Setup
- Uses `assets/images/icon.png` (existing app icon)

### Custom Logo (Optional)
To use a custom logo:
1. Place your logo at `assets/logo.png` (PNG with transparent background)
2. Update `AnimatedSplash.tsx` line ~150:
   ```typescript
   const logoSource = require('../../assets/logo.png');
   ```
3. Update `app.json` splash image path if needed

## Animation Timeline

```
0ms     - Native splash visible
100ms   - Native splash hidden, animated splash starts
200ms   - Background fades in
400ms   - Logo starts fading in + scaling up
1200ms  - Logo fully visible, light sweep begins
2200ms  - Light sweep completes, haptic feedback, navigate
```

## Navigation Flow

The splash screen automatically navigates based on auth state:
- **Not authenticated** → `Index` screen (onboarding/login)
- **Authenticated** → `Main` tabs (dashboard)

This is handled by `RootNavigator.tsx` which checks `useAuth().user`.

## Dependencies

All dependencies are already installed:
- ✅ `react-native-reanimated` (~4.1.1)
- ✅ `react-native-svg` (^15.12.1)
- ✅ `expo-linear-gradient` (~15.0.8)
- ✅ `expo-haptics` (~15.0.8)
- ✅ `expo-splash-screen` (~31.0.13)

## Testing

### Android Emulator
```bash
npm run android
```

### Real Device
```bash
npm run android  # or npm run ios
```

### Expected Behavior
1. App launches → Native splash shows instantly
2. After ~100ms → Animated splash appears
3. Logo animates in smoothly
4. Light sweep passes across logo
5. After 2.2s → Navigates to appropriate screen
6. Smooth 60fps throughout

## Customization

### Adjust Animation Duration
Edit `AnimatedSplash.tsx`:
- Line ~100: Logo animation delay/duration
- Line ~110: Light sweep timing
- Line ~130: Total duration (currently 2200ms)

### Change Background Color
Edit `AnimatedSplash.tsx`:
- Line ~140: Gradient colors in `ExpoLinearGradient`
- Line ~160: Radial glow color and opacity

### Disable Haptic Feedback
Remove or comment out lines ~125-128 in `AnimatedSplash.tsx`

## Production Checklist

- [x] Native splash configured in `app.json`
- [x] Animated splash component created
- [x] Smooth 60fps animations (Reanimated)
- [x] Safe area respected (notch support)
- [x] Haptic feedback (Android)
- [x] Auth-based navigation
- [x] Logo path configurable
- [x] No jank or stuttering
- [x] Works on Android emulator + real devices

## Notes

- The splash only shows once per app launch
- Navigation is handled automatically by `RootNavigator`
- All animations use native driver where possible for performance
- The light sweep effect uses SVG masking for premium feel
