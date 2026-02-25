# Admin Review Backend (admin-review Edge Function)

## Location

- **Path:** `supabase/functions/admin-review/index.ts`

## Actions

| Action | Body | Description |
|--------|------|-------------|
| `list` | `{ action: 'list' }` | Returns `{ campaigns: [...] }` for review queue. Includes extension fields when present. |
| `accept-content` | `{ action: 'accept-content', campaignId }` | Sets campaign status to `verifying_payment`. |
| `verify-and-run` | `{ action: 'verify-and-run', campaignId, advertiserId? }` | Sets campaign to `active`, stores advertiser id. |
| `invalid-id` | `{ action: 'invalid-id', campaignId }` | Resets to `waiting_for_admin`. |
| `reject` | `{ action: 'reject', campaignId, rejectionReason? }` | Sets status to `rejected`, saves reason. |
| **verify-extension** | `{ action: 'verify-extension', campaignId }` | Approves extension: clears `extension_status`, extends `real_end_date` by `extension_days`, updates `daily_budget` from `extension_daily_budget`. |
| **reject-extension** | `{ action: 'reject-extension', campaignId }` | Rejects extension: sets `extension_status = 'rejected'`. |

## List response

Each campaign in `campaigns` includes:

- All campaign columns from `campaigns` (including `extension_status`, `extension_days`, `extension_daily_budget`, `extension_payment_method` if columns exist).
- `user_email`, `user_name` from `profiles` (by `user_id`).

List returns campaigns where:

- `status IN ('waiting_for_admin', 'verifying_payment')`, or  
- `status = 'active'` and `extension_status IN ('verifying_payment', 'awaiting_payment')`.

## Auth

- Requests should send `Authorization: Bearer <session_access_token>`.
- The function checks that the token’s user exists in `owner_accounts.user_id`. If not, it returns `403 Unauthorized`.

## Database: extension columns (migration)

If your `campaigns` table does not have extension columns yet, add them:

```sql
-- Optional: add extension request columns to campaigns
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS extension_status text,
  ADD COLUMN IF NOT EXISTS extension_days int,
  ADD COLUMN IF NOT EXISTS extension_daily_budget numeric,
  ADD COLUMN IF NOT EXISTS extension_payment_method text;
```

- `extension_status`: e.g. `'awaiting_payment'`, `'verifying_payment'`, `'rejected'`, or `null` when approved/not requested.
- `extension_days`: number of days to extend.
- `extension_daily_budget`: daily budget for the extension.
- `extension_payment_method`: optional payment method text.

## Deploy

From project root:

```bash
npx supabase functions deploy admin-review
```

Or via Supabase Dashboard: link the repo and deploy the `admin-review` function.

## Frontend

- **List:** `fetch(SUPABASE_URL/functions/v1/admin-review, { method: 'POST', body: JSON.stringify({ action: 'list' }) })` with Bearer token.
- **Other actions:** `supabase.functions.invoke('admin-review', { body: { action, campaignId, ... } })`.

See `src/components/owner/AdReviewQueue.tsx` for usage.
