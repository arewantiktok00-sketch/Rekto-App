# User ↔ Owner Notifications: Every Notification = In-App + Push (“Push Up”)

**Rule:** Every notification (user→owner and owner→user) must be sent **both** as an **in-app notification** and as a **push notification** so it “pushes up” on the device. No notification should be in-app only.

- **App:** Owner→user push is sent via `@/services/notificationPush` (`sendPushToUsers`, `sendPushToCampaignUser`).
- **Backend:** User→owner push must be sent by your Edge Functions (e.g. `notify-owners-new-ad`, `owner-content` broadcast).

---

## 1. User → Owner (notify owners when user does something)

### New ad submitted (user creates campaign)

- **Where:** User submits ad in **CreateAd** → app calls **`notify-owners-new-ad`** Edge Function with `campaign_id`, `campaign_title`, `user_id`, `user_display_name`.
- **Backend (`notify-owners-new-ad`) must:**
  1. **In-app:** Insert a row per owner (or one shared notification) into `notifications` (or your owner-notifications table) so owners see it in the app.
  2. **Push:** Call your push service (e.g. **`send-push-notification`**) to send a **push to all owners**, e.g.:
     - Title: **"New ad"** / **"New ad submission"**
     - Body: **"Ad: [campaign_title] – by [user_display_name]"**
- So: **one event → in-app + push for owners.**

---

## 2. Owner → User (notify user when owner does something)

These are triggered from the app (Owner Dashboard) or from your backend (**admin-review**). In all cases the user should get **both** an in-app notification **and** a push.

### Content approved (owner accepts content)

- **In-app:** Created by **admin-review** (accept-content) when it inserts into `notifications` for the campaign’s `user_id`.
- **Push:** Sent from the **app** (AdReviewQueue) after `admin-review` success via **`send-push-notification`** with `user_ids: [campaign.user_id]`, title/body from `pushAdAcceptedTitle` / `pushAdAcceptedBody`.
- Optional: **admin-review** can also call **`send-push-notification`** so user gets push even if the app call fails (see **PUSH_NOTIFICATIONS_OWNER_ACTIONS.md**).

### Ad submitted to TikTok (owner runs verify-and-run)

- **In-app:** Created by **admin-review** (verify-and-run) when it inserts into `notifications` for the campaign’s `user_id`.
- **Push:** Sent from the **app** (AdReviewQueue) after success via **`send-push-notification`** with `pushAdSubmittedTitle` / `pushAdSubmittedBody` and `tag: 'ad_submitted'`.

### Ad rejected (owner rejects with reason)

- **In-app:** Created by **admin-review** (reject) when it inserts into `notifications` for the campaign’s `user_id`.
- **Push:** Sent from the **app** (AdReviewQueue) after success via **`send-push-notification`** with `pushAdRejectedTitle` / `pushAdRejectedBody` (reason in body) and `tag: 'ad_rejected'`.

### Owner sends a direct notification to a user (User Management → Notify)

- **In-app:** Created by **owner-content** (action `send_notification`) which writes to `notifications` for that user.
- **Push:** Sent from the **app** (UserManagementTab) via **`send-push-notification`** with `user_ids: [selectedUser.user_id]`, same title/body, so the user gets a push-up as well.

---

## 3. Other flows that should stay in-app + push

- **Promo banner tap:** Already creates in-app (owner-content `createUserNotification`) and push (**send-push-notification**) in **PromoBanner.tsx**.
- **Broadcast to all users:** Handled by **owner-content** (broadcast); backend should send both in-app and push to all target users.
- Any future “notify user” or “notify owner” action should follow the same rule: **create in-app notification + call send-push-notification** (or equivalent) so every notification “pushes up” on the device.

---

## 4. Summary

| Direction     | Event              | In-app                    | Push (push-up)                    |
|--------------|--------------------|---------------------------|-----------------------------------|
| User→Owner   | New ad submitted   | notify-owners-new-ad     | **Backend:** notify-owners-new-ad must call send-push to all owners |
| Owner→User   | Content approved   | admin-review              | App: `notificationPush.sendPushToCampaignUser` (AdReviewQueue) |
| Owner→User   | Ad submitted       | admin-review              | App: `notificationPush.sendPushToCampaignUser` (AdReviewQueue) |
| Owner→User   | Ad rejected        | admin-review              | App: `notificationPush.sendPushToCampaignUser` (AdReviewQueue) |
| Owner→User   | Direct notify user | owner-content             | App: `notificationPush.sendPushToUsers` (UserManagementTab) |
| Owner→User   | Promo tap          | owner-content             | App: `notificationPush.sendPushToUsers` (PromoBanner) |
| Owner→User   | Broadcast          | owner-content             | **Backend:** owner-content broadcast must send push to all target users |

## 5. Backend checklist (so every notification pushes up)

- [ ] **notify-owners-new-ad:** After creating in-app notifications for owners, call **send-push-notification** (or your push API) with `user_ids` = all owner user IDs, title e.g. "New ad", body e.g. "Ad: [campaign_title] – by [user_display_name]".
- [ ] **owner-content (broadcast):** When sending a broadcast, create in-app notifications for each user **and** call send-push for the same users so they get a push-up.
- [ ] **admin-review (accept / verify-and-run / reject):** Optionally call send-push in addition to the app; the app already sends push for these, so this is redundant but improves reliability.
