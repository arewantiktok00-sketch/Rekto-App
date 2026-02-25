# OneSignal APNs Setup for iOS

To enable push notifications on **iOS**, you configure **Apple Push Notification service (APNs)** in the **OneSignal dashboard**. You do **not** need to put APNs keys or Key ID in the app code.

## What you need

1. **Key ID** – From your Apple Developer account (APNs Auth Key).
2. **Team ID** – From Apple Developer → Membership.
3. **Bundle ID** – Your app’s bundle ID (e.g. from `app.json` / Xcode).
4. **.p8 file** – The APNs Auth Key file you download from Apple (only once).

You do **not** send these to anyone; you add them yourself in OneSignal.

## Steps

### 1. Create a APNs key in Apple Developer

1. Go to [Apple Developer](https://developer.apple.com/account/) → **Certificates, Identifiers & Profiles**.
2. Under **Keys**, click **+** to create a new key.
3. Name it (e.g. “OneSignal APNs”), enable **Apple Push Notifications service (APNs)**.
4. Continue and **Register**. Download the **.p8** file **once** (you can’t download it again).
5. Note the **Key ID** shown on the page.

### 2. Get your Team ID and Bundle ID

- **Team ID**: Same Apple Developer account → **Membership** → Team ID.
- **Bundle ID**: In your project: `app.json` → `expo.ios.bundleIdentifier`, or in Xcode under the app target → **General** → **Bundle Identifier**.

### 3. Add the key in OneSignal

1. Open [OneSignal Dashboard](https://dashboard.onesignal.com/) → your app.
2. Go to **Settings** → **Platforms** → **Apple iOS (APNs)**.
3. Choose **APNs Auth Key** (recommended).
4. Upload your **.p8** file.
5. Enter **Key ID**.
6. Enter **Team ID**.
7. Enter **Bundle ID** (must match your app).
8. Save.

After this, OneSignal uses APNs for iOS push. The app only needs your **OneSignal App ID** (already in `src/lib/onesignal.ts`); no Key ID or .p8 file goes in the repo.

## Summary

| Item    | Where it goes        |
|---------|----------------------|
| Key ID  | OneSignal dashboard  |
| Team ID | OneSignal dashboard  |
| Bundle ID | OneSignal dashboard |
| .p8 file | OneSignal dashboard (upload) |
| OneSignal App ID | Already in app code |

You do **not** need to send Key ID or .p8 to anyone; add them only in the OneSignal dashboard.
