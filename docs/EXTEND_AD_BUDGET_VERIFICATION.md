# Extend Ad Budget Fix — React Native Verification

This doc confirms the app implements the spec from the backend fix (tiktok-extend-ad).

## Backend Fixes (Already Deployed — No RN Change)

- **finalEndDate** used before init → moved above budget floor check.
- **Wrong adgroup** (used `list[0]`) → now matches exact `tiktok_adgroup_id` via `.find()`.
- **No budget floor** → enforces TikTok min: `totalTikTokDays * 20`, `finalBudget = Math.max(rawFinalBudget, tiktokMinBudget)`.
- **Budget fallback** → `target_spend || real_budget || total_budget || 0`.

---

## 1. Budget display (critical) — DONE

**Spec:** `displayBudget = campaign.target_spend ?? campaign.real_budget ?? campaign.total_budget ?? 0`

- **`src/utils/campaignBudget.ts`** — `getDisplayBudget(c)` implements the fallback.
- **Used in:**
  - **CampaignCard** — total budget, spent %, extend logic.
  - **CampaignDetail** — display budget and all spent-% calculations.
  - **Invoice** — `budgetUSD = getDisplayBudget(campaign)`.

---

## 2. Post-extension refetch (critical) — DONE

**Spec:** After successful extension submission, force-refetch campaign from DB; do not rely on cache.

- **CampaignDetail** — `ExtendAdModal` `onSuccess` calls `fetchCampaign(true)`.
  - `fetchCampaign(true)` skips the min-fetch interval and refetches from Supabase.
  - Fetched campaign is applied via `persistCampaignSnapshot(data)`, which calls `setCampaign(...)` and updates cache.
- **Campaigns list** — When extending from the list, `handleExtendSuccess` calls `refresh()` so the list is refetched.
- **Realtime** — CampaignDetail subscribes to `user-campaigns-{userId}` postgres changes, so when admin clears `extension_status` and updates budget, the UI updates.

---

## 3. Extension status display — DONE

**Spec:** Show status when `extension_status` is not null: `verifying_payment` → “Extension payment under review” (warning), `processing` → “Extension being applied...” (info).

- **`src/utils/campaignBudget.ts`** — `getExtensionStatusText(status)` returns `{ text, color: 'warning' | 'info' }` for those two values.
- **CampaignCard** — Renders a chip with that text when `extension_status` is set.
- **CampaignDetail** — Renders a banner under “Last updated” with the same text and styles.

---

## 4. ExtendAdModal budget and API — DONE

**Spec:**

- Cost per day: `Math.max(campaign.daily_budget, 20)`.
- Base cost: `extensionDays * costPerDay` (no tax).
- Send **base only** as `extensionAmount` to the API.

**Implementation:**

- **`src/lib/pricing.ts`** — `MIN_EXTENSION_BUDGET_USD = 20`.
- **ExtendAdModal** — `baseBudgetUSD = extensionDays * Math.max(dailyBudget, MIN_EXTENSION_BUDGET_USD)`.
- **API body** — `extensionAmount: baseBudgetUSD` (no tax). Also sends `extensionDays`, `transactionId`, `paymentMethod`, `amountIQD`.

**Tax:** Spec mentions 21% for display; the app uses the shared `calculateTax` / `calculateTotalWithTax` from `lib/pricing.ts` for display and IQD. Only the **base** is sent as `extensionAmount`, as required.

**Payment methods:** FastPay (`7504881516`), FIB (`7504881516`), SuperQi / Qi Card (`4734053731`) — defined in `ExtendAdModal.tsx`.

---

## 5. Extension retry (backend handles it) — DONE

**Spec:** If TikTok API fails during extension, the backend resets `extension_status` to `'verifying_payment'` so admin can retry. The RN app must:

- **NOT** show "Extension failed" to users for this case.
- Keep showing "Extension payment under review" while status is `verifying_payment`.
- No user action needed — admin retries from Owner Dashboard.

**Implementation:** The app only shows status via `getExtensionStatusText()`. When status is `verifying_payment` we show "Extension payment under review" (warning). We do not show a permanent "Extension failed" when the backend resets to `verifying_payment` for retry. Alerts with `t('extensionFailed')` are only used for real API errors (network or business error from the extension-payment call), not for the async admin-retry flow.

---

## 6. Summary table (reference)

| Field | Meaning |
|-------|---------|
| `target_spend` | Internal tracking budget (most accurate after extensions) |
| `real_budget` | Mirror of target_spend |
| `total_budget` | TikTok-side lifetime budget (may be higher due to $20/day floor) |
| `extension_status` | `verifying_payment` → `processing` → cleared on success |

---

## 7. Backend summary — No app change

Request/response shape is unchanged; only backend budget logic was fixed. No further API changes needed in the app.
