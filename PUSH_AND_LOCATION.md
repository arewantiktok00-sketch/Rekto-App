# Push Notifications & Location (Apple Review)

## Push notifications

### User → Owner (new ad)
- When a **user** creates an ad and submits it, the app:
  1. Calls the **notify-owners-new-ad** Supabase Edge Function with: `campaign_id`, `campaign_title`, `user_id`, **`user_display_name`**.
  2. Your **backend** (Edge Function) should:
     - Create in-app notifications for owners (if you do that).
     - **Send push notifications to all owners** (e.g. via OneSignal or your `send-push-notification` function), e.g. title: **"New ad"**, body: **"About the ad – [user_display_name]"** (or similar).

The app now sends `user_display_name` so the push can include the creator’s name.

### Owner → User (ad accepted)
- When an **owner** accepts content or verifies & runs an ad, the app:
  1. Calls **send-push-notification** with the campaign’s **user_id**, title e.g. **"Ad accepted"**, body e.g. **"Your ad was accepted. Complete payment now to go live."**
  2. The user receives a **push** even when the app is in the background or closed.

Translations for these messages exist in `src/locales` as `pushAdAcceptedTitle` and `pushAdAcceptedBody` (EN, CKB, AR).

---

## Location – we do NOT use it

- **Info.plist** (`ios/Rekto/Info.plist`) does **not** contain any location usage keys:
  - No `NSLocationWhenInUseUsageDescription`
  - No `NSLocationAlwaysAndWhenInUseUsageDescription`
  - No `NSLocationAlwaysUsageDescription`
- **app.json** does not add location permissions.
- There is **no** `expo-location` or other location package in **package.json**.
- The app does **not** request or use the user’s location anywhere in the codebase.

If Apple still says the app “asks for location”, possible causes:

1. **OneSignal**  
   Some OneSignal SDK versions can prompt for location (e.g. for geotargeting).  
   - In **OneSignal Dashboard** → your app → **Settings**, check for any “Location” or “Collect location” option and **disable** it if you don’t need it.

2. **Other SDKs**  
   Another dependency might add a location permission. Check the **Xcode project** (e.g. **Signing & Capabilities**, **Info** tab) and any **plugin** that might inject permissions.

3. **Old build**  
   Ensure you’re submitting the **latest** build that was built from this project (no old binary that had location).

**Summary:** In this repo we do **not** use or ask for location. If the rejection persists, disable location in OneSignal (and any other service) and resubmit.
