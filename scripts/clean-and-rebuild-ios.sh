#!/bin/bash
# Clean rebuild for iOS – kill Metro, clear caches, reinstall, prepare for Xcode
set -e
cd "$(dirname "$0")/.."
echo "=== Killing Metro and Node processes ==="
pkill -f "react-native start" 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true
pkill -f "node.*rekto" 2>/dev/null || true
echo "=== Clearing watchman ==="
watchman watch-del-all 2>/dev/null || true
echo "=== Removing node_modules, iOS build artifacts, Pods ==="
rm -rf node_modules
rm -rf ios/Pods ios/Podfile.lock ios/build 2>/dev/null || true
rm -rf $TMPDIR/metro-* $TMPDIR/haste-* 2>/dev/null || true
echo "=== npm install ==="
npm install
echo "=== Regenerating iOS project (if ios folder exists, run prebuild; else use existing) ==="
if [ -d "ios" ]; then
  echo "=== Pod install ==="
  (cd ios && pod install)
else
  echo "No ios folder. Run: npx expo prebuild --platform ios --clean"
  echo "Then: cd ios && pod install"
fi
echo "=== Done. Run app: npm run ios  OR  open ios/Rekto.xcworkspace in Xcode ==="
echo "=== Start Metro in another terminal: npm start ==="
