# Splash Screen Fixes - Logo & Full-Screen Issues

## Issues Fixed

### 1. Logo Not Showing
**Problem:** The Lottie animation was playing but the logo image layer was missing.

**Solution:**
- Added `imageAssetsFolder="images"` prop to `LottieView` to tell Lottie where to find the image assets
- Added `imageAssets` map to explicitly provide the image asset (if supported)
- Preloaded the image asset using `expo-asset` to ensure it's bundled and available
- The JSON references `"images/img_0.png"` with `"u":"images/"` and `"p":"img_0.png"`, so Lottie looks for images in the `images/` folder relative to the JSON file

### 2. Not Full-Screen / Wrong Aspect Ratio
**Problem:** The animation was not filling the entire device screen.

**Solution:**
- Added `Dimensions` import to get screen width and height
- Changed container styles to use `absoluteFillObject` and explicit screen dimensions
- Changed `resizeMode` from `"contain"` to `"cover"` to fill the screen without black bars
- Removed safe area padding from root container (background still fills entire screen)
- Used `position: 'absolute'` with explicit `top: 0, left: 0, right: 0, bottom: 0` to ensure full-screen coverage

## Files Changed

### `RektoApp/src/screens/AnimatedSplash.tsx`
- Added `Dimensions` import and screen size constants
- Added `imageAssetsFolder="images"` prop to `LottieView`
- Added `imageAssets` map (if supported by library version)
- Updated styles to use `SCREEN_WIDTH` and `SCREEN_HEIGHT` for full-screen coverage
- Changed `resizeMode` to `"cover"` for full-screen fill
- Removed safe area padding from root container
- Updated container styles to use `absoluteFillObject` for proper full-screen rendering

## Expected Folder Structure

```
RektoApp/
  assets/
    animations/
      splash.json          # Main Lottie animation file
      images/
        img_0.png          # Logo image referenced by splash.json
        logo.png           # (Additional logo file if needed)
```

## How It Works

1. **Image Loading:**
   - The Lottie JSON file (`splash.json`) references `"images/img_0.png"` with path `"u":"images/"` and filename `"p":"img_0.png"`
   - `lottie-react-native` looks for images in the `images/` folder relative to the JSON file location
   - We provide `imageAssetsFolder="images"` to tell Lottie where to find the images
   - We preload the image using `expo-asset` to ensure it's bundled and available when Lottie needs it

2. **Full-Screen Rendering:**
   - Uses `Dimensions.get('window')` to get actual screen size
   - Container uses `absoluteFillObject` to fill entire screen
   - `resizeMode="cover"` ensures animation fills screen without black bars
   - Background is pure black (`#000000`) and fills entire screen

## Testing Checklist

- [ ] Logo appears in animation on Android emulator
- [ ] Logo appears in animation on Android real device
- [ ] Logo appears in animation on iOS simulator
- [ ] Logo appears in animation on iOS real device
- [ ] Logo appears in animation on web preview
- [ ] Animation fills entire screen (no black bars) on Android
- [ ] Animation fills entire screen (no black bars) on iOS
- [ ] Animation fills entire screen (no black bars) on web
- [ ] Splash shows first on cold start (before home/tabs)
- [ ] No flicker between native splash and animated splash
- [ ] Animation completes and navigates correctly

## Notes

- If `imageAssets` prop is not supported by your `lottie-react-native` version, remove it and rely on `imageAssetsFolder` alone
- The `imageAssetsFolder` path is relative to where the JSON file is located in the bundle
- For Expo, assets are bundled automatically, so the relative path `"images"` should work correctly
- If images still don't load, you may need to check the actual bundle structure or use a different approach (e.g., embedding images in JSON or using base64)
