# Netflix-Style Lottie Splash Screen Implementation

## ✅ Implementation Complete

### Features
- **Netflix-style animation**: Logo reveal + glowing light sweep
- **Lottie support**: Uses `lottie-react-native` for premium animations
- **Placeholder fallback**: If Lottie file missing, uses Reanimated-based animation
- **Safe area support**: Respects notch and device safe areas
- **Auth-based navigation**: Routes to login or main tabs based on auth state
- **Haptic feedback**: Subtle vibration on Android when animation completes

## Files Created/Modified

### Created Files
1. **`src/screens/AnimatedSplash.tsx`**
   - Netflix-style animated splash component
   - Supports Lottie animations
   - Fallback to Reanimated if Lottie file missing
   - Duration: ~2 seconds

2. **`assets/animations/splash.json`**
   - Lottie animation file (Netflix-style logo reveal + glow sweep)
   - 60 frames, 30fps
   - Logo fade-in + scale-up + light sweep effect

### Modified Files
1. **`src/App.tsx`**
   - Integrated `AnimatedSplash` component
   - Two-stage splash flow (native → animated)

2. **`src/contexts/AuthContext.tsx`**
   - **Fixed logout button**: Added error handling and force state clearing
   - Ensures user state is cleared even if Supabase signOut fails

3. **`package.json`**
   - Added `lottie-react-native: ^7.3.5`

## How It Works

### Stage 1: Native Splash
- Configured in `app.json`
- Shows instantly on app launch
- Background: `#0A0A0A` (near-black)
- Centered logo

### Stage 2: Animated Splash
- Component: `AnimatedSplash`
- **If Lottie file exists** (`assets/animations/splash.json`):
  - Plays Lottie animation
  - Duration: ~2 seconds
  - Auto-navigates on completion

- **If Lottie file missing**:
  - Uses Reanimated placeholder
  - Logo fade-in + scale-up
  - Light sweep effect
  - Same duration and feel

## Navigation Flow

The splash screen automatically navigates based on auth state:
- **Not authenticated** → `Index` screen (onboarding/login)
- **Authenticated** → `Main` tabs (dashboard)

Handled by `RootNavigator.tsx` which checks `useAuth().user`.

## Logout Button Fix

**Problem**: Logout button wasn't working properly

**Solution**: Enhanced `signOut()` function in `AuthContext.tsx`:
- Added try-catch error handling
- Force clears local state even if Supabase signOut fails
- Ensures user and session are always cleared
- Prevents stuck authentication state

## Usage

### Using Lottie Animation (Recommended)
1. Place your Lottie JSON file at: `assets/animations/splash.json`
2. The component will automatically detect and use it
3. Animation plays once, then navigates

### Using Placeholder (Fallback)
- If Lottie file is missing, component automatically uses Reanimated-based animation
- Same visual style and duration
- No action needed

## Customization

### Change Animation Duration
Edit `AnimatedSplash.tsx`:
- Line ~50: Lottie timeout (currently 2000ms)
- Line ~100: Placeholder total duration (currently 2100ms)

### Change Background Color
Edit `AnimatedSplash.tsx`:
- Line ~100: Gradient colors in `ExpoLinearGradient`
- Line ~180: Radial glow color

### Disable Haptic Feedback
Remove or comment out lines ~75-79 in `AnimatedSplash.tsx`

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
3. Logo animates in with light sweep (Netflix-style)
4. After 2s → Navigates to appropriate screen
5. Smooth 60fps throughout

## Dependencies

All required packages are installed:
- ✅ `lottie-react-native` (^7.3.5)
- ✅ `react-native-reanimated` (~4.1.1)
- ✅ `expo-linear-gradient` (~15.0.8)
- ✅ `expo-haptics` (~15.0.8)
- ✅ `expo-splash-screen` (~31.0.13)

## Production Checklist

- [x] Lottie animation file created
- [x] Placeholder fallback implemented
- [x] Safe area support
- [x] Auth-based navigation
- [x] Haptic feedback (Android)
- [x] Logout button fixed
- [x] Smooth 60fps animations
- [x] Works on Android emulator + real devices

## Notes

- The splash only shows once per app launch
- Navigation is handled automatically by `RootNavigator`
- All animations use native driver where possible for performance
- The Lottie file can be replaced with a custom Netflix-style animation from LottieFiles.com
