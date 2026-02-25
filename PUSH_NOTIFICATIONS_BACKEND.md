# Push Notifications – Backend (Production)

## 1. Deploy Edge Function

Deploy the reusable push function to your Supabase project:

```bash
supabase functions deploy send-onesignal-push
```

## 2. Environment Secrets

In **Supabase Dashboard → Project Settings → Edge Functions → Secrets**, set:

- `ONESIGNAL_REST_API_KEY` – OneSignal Dashboard → Settings → Keys & IDs → **REST API Key** (used as `Authorization: Key <value>`)
- `ONESIGNAL_APP_ID` – OneSignal **App ID** (already used in the app; e.g. in `src/lib/onesignal.ts`)

The function also uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (provided automatically by Supabase at runtime).

## 3. Reusable Backend API

**Function name:** `send-onesignal-push`

**Behaviour:**

1. Resolve OneSignal `player_id` from `notification_preferences` (column `push_subscription.player_id`) for each `user_id`.
2. Call OneSignal REST API: `POST https://api.onesignal.com/notifications`.
3. Send push with title, body, and optional `data` for navigation.

**Request body (from client or other Edge Functions):**

```json
{
  "external_user_ids": ["uuid1", "uuid2"],
  "title": "Campaign Approved",
  "body": "Your ad is live.",
  "type": "campaign_approved",
  "data": { "campaign_id": "..." }
}
```

Or single user:

```json
{
  "user_id": "uuid",
  "title": "...",
  "body": "...",
  "data": { ... }
}
```

## 4. When to Send Push (All Important Events)

After creating an **in-app notification** (DB insert into `notifications`), the backend or client **must** also trigger a push so the user gets it when the app is closed.

| Event | Who triggers | Action |
|--------|----------------|--------|
| Owner approves content | Client (AdReviewQueue) | Already calls `sendPushToCampaignUser` → invokes `send-onesignal-push` |
| Awaiting payment | Backend (e.g. after status → `verifying_payment`) | After DB notification insert, invoke `send-onesignal-push` with `user_id`, title, body, `data: { campaign_id }` |
| Payment received | Backend (webhook or edge function) | After DB notification, invoke `send-onesignal-push` |
| Campaign approved (live) | Backend / TikTok callback | After DB notification, invoke `send-onesignal-push` |
| Campaign rejected | Client (AdReviewQueue) | Already calls `sendPushToCampaignUser` |
| Campaign status changed | Backend (when updating campaign status) | After DB notification, invoke `send-onesignal-push` |
| Billing / discount update | Client (DiscountManagementScreen) | Already calls `send-onesignal-push` then inserts notifications |

**Rule:** For any flow that inserts a row into `notifications`, also call `send-onesignal-push` (with the same user_id(s), title, body, and any `data` needed for deep link).

## 5. Client Usage (Already Wired)

- `sendPushToUsers(userIds, title, body, options)` – invokes `send-onesignal-push` with `external_user_ids`.
- `sendPushToCampaignUser(campaignId, title, body, dataType)` – resolves `user_id` from campaign, then calls `sendPushToUsers` with `data: { campaign_id, type }`.

Ensure the Edge Function above is deployed and secrets are set so these client calls succeed in production.
