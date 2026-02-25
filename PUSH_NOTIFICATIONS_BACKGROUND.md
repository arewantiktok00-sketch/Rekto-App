# Push Notifications (Background & Closed App)

## Current setup

- **OneSignal** is initialized in `src/App.tsx` when the user logs in (`initializeOneSignal(user.id)`).
- **Handlers** in `src/lib/onesignal.ts`:
  - **Foreground**: `foregroundWillDisplay` – notifications are shown while the app is open.
  - **Click**: `click` – deep linking (e.g. open CampaignDetail, CreateAd, OwnerDashboard) and navigation.
- **Permissions**: Requested via `OneSignal.Notifications.requestPermission(true)` (or legacy prompt) during init.
- **Player ID / token** are saved to Supabase `notification_preferences` (select-then-update-or-insert, no upsert/ON CONFLICT).

## Background and closed app

- **Background**: When the app is in the background, the **OS** (iOS/Android) shows the notification. OneSignal delivers the payload to the device; no extra app code is required for display.
- **Closed**: When the app is **fully closed**, the OS still receives the push and shows the notification. Tapping it should open the app; if you use **notification click** data (e.g. `campaign_id`), the handler in `onesignal.ts` runs after the app is opened and can navigate (e.g. via `navigate('CampaignDetail', { id: data.campaign_id })`).
- **Android**: Ensure a **notification channel** is configured (OneSignal/Android usually creates a default). For custom behavior, you can configure channels in the OneSignal dashboard or in app code if the SDK supports it.
- **iOS**: APNs must be set up in the OneSignal dashboard (Key ID, Team ID, Bundle ID, .p8). See **ONESIGNAL_APNS_IOS.md**.

## Ensuring notifications work when app is closed

1. **APNs (iOS)**: Follow **ONESIGNAL_APNS_IOS.md** and add the .p8 key and IDs in the OneSignal dashboard.
2. **Payload**: Include any data needed for deep linking in the notification payload (e.g. `additional_data: { campaign_id: '...' }`). The `click` handler in `src/lib/onesignal.ts` reads `event?.notification?.additionalData` and navigates accordingly.
3. **Testing**: Send a test notification from the OneSignal dashboard with the app fully closed; the notification should appear. Open the app by tapping it and confirm navigation (e.g. to Campaign Detail) if you send the right `additional_data`.

No change to app code is required for “receiving” when closed; only dashboard (APNs) and payload (data for deep link) need to be correct.
