# Send iOS Update via Xcode

Your app is ready for Xcode. Use this guide to build and submit an update to App Store Connect.

## 1. Open the project in Xcode

**Always open the workspace** (not the `.xcodeproj`):

```bash
open ios/Rekto.xcworkspace
```

Or from Finder: go to `RektoApp/ios/` and double‑click **Rekto.xcworkspace**.

## 2. Before you archive

- **Signing**: In Xcode, select the **Rekto** project → **Rekto** target → **Signing & Capabilities**. Choose your Team and ensure **Automatically manage signing** is on (or set provisioning profiles for release).
- **Scheme**: At the top, set the scheme to **Rekto** and the run destination to **Any iOS Device (arm64)** (not a simulator).

## 3. Create an archive

1. Menu: **Product** → **Archive**.
2. Wait for the build to finish. The **Organizer** window will open with your new archive.

## 4. Upload to App Store Connect

1. In Organizer, select the new archive.
2. Click **Distribute App**.
3. Choose **App Store Connect** → **Next**.
4. Choose **Upload** → **Next**.
5. Leave options as default (e.g. upload symbols, manage version and build number) → **Next**.
6. Pick the correct signing identity/certificate → **Next**.
7. Review and click **Upload**.

## 5. Version and build number (for this update)

Current values in `app.json`:

- **version**: `1.1.0`
- **iOS buildNumber**: `2`

To ship a new build of the same version (e.g. 1.1.0), increase **buildNumber** in `app.json` (e.g. to `3`) and run:

```bash
npx expo prebuild --platform ios --clean
cd ios && pod install && cd ..
```

Then open **Rekto.xcworkspace** in Xcode and **Product** → **Archive** again.

## Commands already run for you

- `cd ios && pod install && cd ..` — CocoaPods installed/updated.
- `npx expo run:ios --configuration Release` — Release build was started (may still be running or you can run it again to verify).

## Quick commands

```bash
# Install/update pods
cd ios && pod install && cd ..

# Run on simulator (debug)
npx expo run:ios

# Build Release (for device/archive)
npx expo run:ios --configuration Release
```

After uploading from Xcode, submit the build for review in [App Store Connect](https://appstoreconnect.apple.com) (TestFlight or App Store).
