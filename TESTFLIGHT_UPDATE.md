# How to send an update to TestFlight

After you’ve made your changes (push notifications, no location, etc.), follow these steps to build and upload a new version to TestFlight.

## 1. Bump version (optional but recommended)

- In **app.json**: update `expo.version` (e.g. `1.1.0` → `1.1.1`) and under `ios` set `buildNumber` to a higher number (e.g. `2` → `3`).
- Or in Xcode: open **ios/Rekto.xcworkspace** → select target **Rekto** → **General** → **Version** and **Build**, and increase **Build** (and **Version** if you want).

## 2. Build the app

**Option A – EAS Build (recommended for TestFlight)**

```bash
cd /Users/arewanrekto/Desktop/RektoApp
npx eas build --platform ios --profile production
```

When the build finishes, EAS will give you a link. You can then either:

- **Submit to TestFlight from EAS:**  
  `npx eas submit --platform ios --profile production --latest`  
  (configure `production` in `eas.json` with the right credentials and App Store Connect API key if needed.)

**Option B – Xcode archive (manual)**

1. Open **ios/Rekto.xcworkspace** in Xcode (not the `.xcodeproj`).
2. Select the **Rekto** scheme and a **real device** or **Any iOS Device** as destination.
3. **Product** → **Clean Build Folder** (Shift+Cmd+K).
4. **Product** → **Archive**.
5. When the Organizer appears, select the new archive and click **Distribute App**.
6. Choose **App Store Connect** → **Upload** → follow the steps (signing, options) → **Upload**.

## 3. After upload

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → your app → **TestFlight**.
2. Wait for the build to finish **Processing** (often 5–15 minutes).
3. Add the build to the right **Test Group** (e.g. Internal Testing or External Testing).
4. Testers get the update via the TestFlight app when you make that build available to their group.

## 4. Run locally first (optional)

To test on simulator or device before uploading:

```bash
cd /Users/arewanrekto/Desktop/RektoApp
npx expo start
```

Then in Xcode: open **ios/Rekto.xcworkspace** → choose a simulator or device → **Product** → **Run**.

---

**Summary:**  
- **No location** is used in the app; if Apple still mentions location, disable it in OneSignal (see PUSH_AND_LOCATION.md).  
- **Push:** owners get notified when a user creates an ad (backend must send push using `user_display_name`); users get a push when the owner accepts the ad (handled in the app via `send-push-notification`).
