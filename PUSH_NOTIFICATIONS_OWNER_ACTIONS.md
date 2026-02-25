# Push Notifications for Owner Actions

The iOS app does not contain `supabase/functions` in the repo. When you deploy or edit the **admin-review** Edge Function on Supabase, add the following push notification calls so users get notified when their ads are approved, rejected, or submitted.

Use the existing **send-push-notification** function. Ensure these edge functions are deployed:

- `owner-advertisers-core`
- `owner-advertisers-buttons`
- `send-push-notification`
- `notify-owners-new-ad`

---

## 1. Content approved (accept-content, ~line 136)

After creating the in-app notification:

```ts
// Create notification for user
if (campaign) {
  await supabase.from('notifications').insert({
    user_id: campaign.user_id,
    title: 'Content Approved! 🎉',
    message: `Your content for "${campaign.title}" is approved! Please send the payment and upload your receipt to start the ad.`,
    type: 'success',
    campaign_id: campaignId,
  });
  // Send push notification to user
  try {
    await supabase.functions.invoke('send-push-notification', {
      body: {
        user_ids: [campaign.user_id],
        title: 'Content Approved! 🎉',
        body: `Your content for "${campaign.title}" is approved! Please send the payment and upload your receipt to start the ad.`,
        data: { campaign_id: campaignId, type: 'content-approved' },
        tag: 'content-approved',
      }
    });
    console.log('[Push] Sent push notification to user for content approval');
  } catch (pushError) {
    console.error('[Push] Failed to send push notification:', pushError);
  }
}
```

---

## 2. Ad submitted (verify-and-run, ~line 614)

After creating the in-app notification:

```ts
// Create notification for user
await supabase.from('notifications').insert({
  user_id: campaign.user_id,
  title: 'Ad Submitted! 🚀',
  message: `Your ad "${campaign.title}" has been submitted to TikTok and is awaiting review.`,
  type: 'success',
  campaign_id: campaignId,
});

// Send push notification to user
try {
  await supabase.functions.invoke('send-push-notification', {
    body: {
      user_ids: [campaign.user_id],
      title: 'Ad Submitted! 🚀',
      body: `Your ad "${campaign.title}" has been submitted to TikTok and is awaiting review.`,
      data: { campaign_id: campaignId, type: 'ad-submitted' },
      tag: 'ad-submitted',
    }
  });
  console.log('[Push] Sent push notification to user for ad submission');
} catch (pushError) {
  console.error('[Push] Failed to send push notification:', pushError);
}
```

---

## 3. Ad rejected (reject action, ~line 727)

After creating the in-app notification:

```ts
if (campaign) {
  await supabase.from('notifications').insert({
    user_id: campaign.user_id,
    title: 'Ad Rejected',
    message: `Your ad "${campaign.title}" was rejected. Reason: ${reason}`,
    type: 'error',
    campaign_id: campaignId,
  });
  // Send push notification to user
  try {
    await supabase.functions.invoke('send-push-notification', {
      body: {
        user_ids: [campaign.user_id],
        title: 'Ad Rejected',
        body: `Your ad "${campaign.title}" was rejected. Reason: ${reason}`,
        data: { campaign_id: campaignId, type: 'ad-rejected' },
        tag: 'ad-rejected',
      }
    });
    console.log('[Push] Sent push notification to user for ad rejection');
  } catch (pushError) {
    console.error('[Push] Failed to send push notification:', pushError);
  }
}
```

---

Once these are added to `supabase/functions/admin-review/index.ts` and deployed, push notifications for owner actions will work automatically.
