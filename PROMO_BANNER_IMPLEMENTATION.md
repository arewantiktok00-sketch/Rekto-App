# Promo Banner & Budget-Range Discounts Implementation

## ✅ Frontend Implementation Complete

### 1. PromoBanner Component
**Location:** `RektoApp/src/components/common/PromoBanner.tsx`

**Features:**
- ✅ Fetches promo data from `getActivePromo` Supabase Edge Function
- ✅ Displays gradient banner (purple to pink)
- ✅ Shows Sparkles icon + localized promo text
- ✅ Displays original IQD (crossed out) + discounted IQD
- ✅ Navigates to CreateAd with `daily_budget` prefilled
- ✅ RTL support for Kurdish/Arabic
- ✅ Only shows when `active: true` and `banner.enabled: true`

**Styling:**
- Full-width gradient button
- Left: Icon + Text
- Right: Price display + Chevron arrow
- RTL: Reverses flex direction, rotates chevron 180°

### 2. Dashboard Integration
**Location:** `RektoApp/src/screens/main/Dashboard.tsx`

**Position:**
- Below Hero Banner
- Above "Create Ad" button

### 3. Translations
**Added to all language files:**
- `promoBannerText`: "🔥 Special Offer!" / "🔥 ئۆفەری تایبەت!" / "🔥 عرض خاص!"
- `tapToCreate`: "Tap to create your ad" / "کرتە بکە بۆ دروستکردن" / "انقر للإنشاء"

## 🔧 Backend Requirements

### 1. Discount Code Structure Update
Add these fields to `discount_codes` table:

```sql
ALTER TABLE discount_codes 
ADD COLUMN budget_min NUMERIC(10,2) NULL,
ADD COLUMN budget_max NUMERIC(10,2) NULL;
```

**Example:**
```json
{
  "code": "SAVE10",
  "discount_value": 20,
  "discount_type": "percentage",
  "budget_min": 10,
  "budget_max": 20
}
```

This discount ONLY applies when user selects $10-$20 budget.

### 2. Create `getActivePromo` Edge Function

**Location:** `supabase/functions/getActivePromo/index.ts`

**Returns:**
```typescript
{
  active: boolean,
  banner: {
    enabled: boolean,
    text_en: string,
    text_ckb: string,
    text_ar: string
  },
  discounts: [{
    budget_min: number | null,
    budget_max: number | null,
    discount_value: number,
    discount_type: 'percentage' | 'fixed'
  }],
  exchangeRate: number
}
```

**Logic:**
1. Check if promo system is enabled in `app_settings`
2. Fetch active discount codes with `budget_min` and `budget_max`
3. Get exchange rate from `app_settings`
4. Return formatted response

**Example Implementation:**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Fetch app settings
  const { data: settings } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'promo')
    .single();

  const promoEnabled = settings?.value?.enabled ?? false;
  const bannerEnabled = settings?.value?.banner?.enabled ?? false;

  if (!promoEnabled || !bannerEnabled) {
    return new Response(JSON.stringify({ active: false }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Fetch active discounts with budget ranges
  const { data: discounts } = await supabase
    .from('discount_codes')
    .select('budget_min, budget_max, discount_value, discount_type')
    .eq('active', true)
    .not('budget_min', 'is', null)
    .not('budget_max', 'is', null);

  // Get exchange rate
  const { data: exchangeSettings } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'pricing')
    .single();

  const exchangeRate = exchangeSettings?.value?.exchange_rate ?? 1450;

  return new Response(JSON.stringify({
    active: true,
    banner: {
      enabled: bannerEnabled,
      text_en: settings.value.banner?.text_en || '🔥 Special Offer!',
      text_ckb: settings.value.banner?.text_ckb || '🔥 ئۆفەری تایبەت!',
      text_ar: settings.value.banner?.text_ar || '🔥 عرض خاص!'
    },
    discounts: discounts || [],
    exchangeRate
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### 3. Update Discount Validation Logic

**In CreateAd screen**, when applying discount codes:

```typescript
// Check if discount applies to selected budget
const appliesToBudget = (discount: Discount, budget: number) => {
  if (discount.budget_min !== null && budget < discount.budget_min) {
    return false;
  }
  if (discount.budget_max !== null && budget > discount.budget_max) {
    return false;
  }
  return true;
};
```

### 4. Owner Admin Controls

**Add to Discount Management screen:**

1. **Toggle:** "Enable Promo Banner"
2. **Inputs:** Banner text (EN/KU/AR)
3. **Preview:** Shows sample banner with calculated prices

**Settings Structure:**
```json
{
  "promo": {
    "enabled": true,
    "banner": {
      "enabled": true,
      "text_en": "🔥 Special Offer!",
      "text_ckb": "🔥 ئۆفەری تایبەت!",
      "text_ar": "🔥 عرض خاص!"
    }
  }
}
```

## 📋 Price Calculation

```typescript
const sampleBudget = discount.budget_min || 10;
const discountAmount = discount.discount_type === 'percentage'
  ? sampleBudget * (discount.discount_value / 100)
  : discount.discount_value;
const finalPrice = sampleBudget - discountAmount;
const discountedIQD = Math.floor(finalPrice * exchangeRate);
const originalIQD = Math.floor(sampleBudget * exchangeRate);
```

## 🎯 Navigation Flow

When user taps promo banner:
```typescript
navigation.navigate('Main', {
  screen: 'CreateAd',
  params: {
    prefill: {
      daily_budget: sampleBudget
    }
  }
});
```

## ✅ Checklist

### Frontend
- [x] PromoBanner component created
- [x] Dashboard integration
- [x] RTL support
- [x] Translations added
- [x] Price calculation logic
- [x] Navigation with prefill

### Backend
- [ ] Add `budget_min` and `budget_max` to `discount_codes` table
- [ ] Create `getActivePromo` Edge Function
- [ ] Update discount validation to check budget ranges
- [ ] Add promo banner settings to `app_settings`
- [ ] Create owner admin UI for banner configuration

## 🚀 Next Steps

1. **Backend:** Create the `getActivePromo` Edge Function
2. **Database:** Add `budget_min` and `budget_max` columns
3. **Owner UI:** Add banner configuration to admin panel
4. **Testing:** Test with various budget ranges and discounts

---

**Note:** The frontend is ready and will automatically work once the backend endpoint is created!
