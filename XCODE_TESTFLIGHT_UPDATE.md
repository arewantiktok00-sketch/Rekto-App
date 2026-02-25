# Rekto: Xcode & TestFlight — Send Update to Testers

## This project is NOT Expo Go

- You use **React Native** with a **native iOS app** in the `ios/` folder.
- `expo run:ios` (or running from Xcode) builds **your own Rekto app** — a standalone binary. Testers get that app, not Expo Go.
- **Expo Go** is a different app that loads projects via URL; you are not using that.

---

## How you send an update (only way): Archive in Xcode

To put a new build on TestFlight you must:

1. **Create an Archive** in Xcode (Product → Archive).
2. **Upload that archive** to App Store Connect (Distribute App → App Store Connect).

There is no other way to send an update to TestFlight. The archive is the build Apple accepts for TestFlight and App Store.

---

## Step-by-step: Open in Xcode and send to TestFlight

### 1. Open the project in Xcode (workspace only)

```bash
open ios/Rekto.xcworkspace
```

Always use **Rekto.xcworkspace**, not `Rekto.xcodeproj`.

### 2. Apply your changes

The code changes (headers, overflow fixes, etc.) are already in the project. When you Archive, Xcode will build that code. No extra step to “apply” changes — just archive.

### 3. Set scheme and destination

- At the top of Xcode: scheme = **Rekto**.
- Destination = **Any iOS Device (arm64)** (do not use a simulator — Archive needs a device target).

### 4. Create the Archive (this is the “update” build)

- Menu: **Product** → **Archive**.
- Wait until the build finishes. The **Organizer** window opens with your new archive.

### 5. Upload to App Store Connect (then TestFlight)

1. In Organizer, select the new archive.
2. Click **Distribute App**.
3. **App Store Connect** → Next.
4. **Upload** → Next.
5. Keep default options → Next.
6. Choose your distribution certificate/signing → Next.
7. Click **Upload**.

### 6. Enable build for TestFlight testers

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → your app **Rekto**.
2. **TestFlight** tab.
3. When the new build appears (processing can take a few minutes), open it and add the build to a group (e.g. Internal Testing or External Testing).
4. Testers get the update via the TestFlight app.

---

## Version and build number for each new upload

- In **app.json**: `version` (e.g. `1.1.0`) and `ios.buildNumber` (e.g. `2`).
- Each TestFlight/App Store upload must have a **new build number** (e.g. 2 → 3) if the version is the same.
- After changing `buildNumber` in `app.json`, run:

```bash
npx expo prebuild --platform ios --clean
cd ios && pod install && cd ..
```

Then open **Rekto.xcworkspace** again and **Product** → **Archive**.

---

## Summary

| Question | Answer |
|----------|--------|
| Expo Go? | **No.** Standalone React Native app. |
| How to send update to TestFlight? | **Only** by creating an **Archive** in Xcode and uploading it to App Store Connect. |
| Where to run / archive? | In **Xcode**, open **ios/Rekto.xcworkspace**, then **Product** → **Archive** → **Distribute App** → Upload. |

Your latest code is already in the project; opening Xcode and archiving is enough to build and send that update.
