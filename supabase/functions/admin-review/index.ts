/**
 * Admin Review Edge Function
 *
 * Actions:
 * - list: campaigns for review (waiting_for_admin, verifying_payment, or active with extension pending)
 * - accept-content, verify-and-run, invalid-id, reject: existing ad review flow
 * - verify-extension: approve extension request (extend campaign, clear extension_status)
 * - reject-extension: reject extension request
 *
 * Response for list: { campaigns: [...] } with extension_status, extension_days,
 * extension_daily_budget, extension_payment_method when applicable.
 *
 * Requires campaigns table to have (add migration if missing):
 *   extension_status text, extension_days int, extension_daily_budget numeric,
 *   extension_payment_method text
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function cors(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors() },
  });
}

type Body = {
  action: string;
  campaignId?: string;
  rejectionReason?: string;
  advertiserId?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Optional: verify caller is owner (use Authorization header and check owner_accounts)
  const authHeader = req.headers.get('Authorization');
  let isOwner = false;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user?.id) {
      const { data: owner } = await supabase
        .from('owner_accounts')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      isOwner = !!owner;
    }
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const { action, campaignId, rejectionReason, advertiserId } = body;

    if (!action) {
      return json({ error: 'action required' }, 400);
    }

    // List: return campaigns for review (include extension fields in select)
    if (action === 'list') {
      if (!isOwner) {
        return json({ error: 'Unauthorized' }, 403);
      }

      // Select all columns so extension_* are included if they exist
      const { data: allCampaigns, error: listError } = await supabase
        .from('campaigns')
        .select('*')
        .in('status', ['waiting_for_admin', 'verifying_payment', 'active']);

      if (listError) {
        console.error('admin-review list error', listError);
        return json({ error: 'Failed to fetch campaigns', campaigns: [] }, 200);
      }

      const campaigns = (allCampaigns || []).filter((c: Record<string, unknown>) => {
        const status = c.status as string;
        if (status === 'waiting_for_admin' || status === 'verifying_payment') return true;
        if (status === 'active') {
          const ext = c.extension_status as string | undefined;
          return ext === 'verifying_payment' || ext === 'awaiting_payment';
        }
        return false;
      });

      const userIds = [...new Set((campaigns as Record<string, unknown>[]).map((c) => c.user_id as string).filter(Boolean))];
      let profiles: Record<string, { email?: string; full_name?: string }> = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, email, full_name')
          .in('user_id', userIds);
        if (profs) {
          profs.forEach((p: { user_id: string; email?: string; full_name?: string }) => {
            profiles[p.user_id] = { email: p.email ?? undefined, full_name: p.full_name ?? undefined };
          });
        }
      }

      const list = (campaigns as Record<string, unknown>[]).map((c) => ({
        ...c,
        user_email: profiles[(c.user_id as string)]?.email ?? null,
        user_name: profiles[(c.user_id as string)]?.full_name ?? null,
        extension_status: c.extension_status ?? null,
        extension_days: c.extension_days ?? null,
        extension_daily_budget: c.extension_daily_budget ?? null,
        extension_payment_method: c.extension_payment_method ?? null,
      }));

      return json({ campaigns: list });
    }

    if (!campaignId) {
      return json({ error: 'campaignId required' }, 400);
    }

    if (!isOwner) {
      return json({ error: 'Unauthorized' }, 403);
    }

    if (action === 'verify-extension') {
      const { data: campaign, error: fetchErr } = await supabase
        .from('campaigns')
        .select('id, status, extension_status, extension_days, extension_daily_budget, real_end_date, completed_at, daily_budget')
        .eq('id', campaignId)
        .single();

      if (fetchErr || !campaign) {
        return json({ error: 'Campaign not found', success: false }, 404);
      }

      const extStatus = (campaign as Record<string, unknown>).extension_status as string | undefined;
      if (extStatus !== 'verifying_payment' && extStatus !== 'awaiting_payment') {
        return json({ error: 'No extension request to verify', success: false }, 400);
      }

      const extDays = Number((campaign as Record<string, unknown>).extension_days) || 0;
      const extDailyBudget = Number((campaign as Record<string, unknown>).extension_daily_budget) ?? (campaign as Record<string, unknown>).daily_budget;
      const now = new Date();
      let newEndDate: string | null = null;
      if (extDays > 0) {
        const baseEnd = (campaign as Record<string, unknown>).real_end_date
          ? new Date((campaign as Record<string, unknown>).real_end_date as string)
          : now;
        const end = new Date(baseEnd);
        end.setDate(end.getDate() + extDays);
        newEndDate = end.toISOString().slice(0, 10);
      }

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        extension_status: null,
      };
      if (newEndDate) updates.real_end_date = newEndDate;
      if (extDailyBudget != null && !Number.isNaN(extDailyBudget)) updates.daily_budget = extDailyBudget;

      const { error: updateErr } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', campaignId);

      if (updateErr) {
        console.error('verify-extension update error', updateErr);
        return json({ error: 'Update failed', success: false }, 500);
      }
      return json({ success: true });
    }

    if (action === 'reject-extension') {
      const { data: campaign, error: fetchErr } = await supabase
        .from('campaigns')
        .select('id, extension_status')
        .eq('id', campaignId)
        .single();

      if (fetchErr || !campaign) {
        return json({ error: 'Campaign not found', success: false }, 404);
      }

      const extStatus = (campaign as Record<string, unknown>).extension_status as string | undefined;
      if (extStatus !== 'verifying_payment' && extStatus !== 'awaiting_payment') {
        return json({ error: 'No extension request to reject', success: false }, 400);
      }

      const { error: updateErr } = await supabase
        .from('campaigns')
        .update({
          extension_status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      if (updateErr) {
        console.error('reject-extension update error', updateErr);
        return json({ error: 'Update failed', success: false }, 500);
      }
      return json({ success: true });
    }

    // Stubs for other actions (implement or keep in your existing backend)
    if (action === 'accept-content') {
      const { error: updateErr } = await supabase
        .from('campaigns')
        .update({ status: 'verifying_payment', updated_at: new Date().toISOString() })
        .eq('id', campaignId);
      if (updateErr) return json({ error: updateErr.message, success: false }, 500);
      return json({ success: true });
    }

    if (action === 'reject') {
      const { error: updateErr } = await supabase
        .from('campaigns')
        .update({
          status: 'rejected',
          tiktok_rejection_reason: rejectionReason || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId);
      if (updateErr) return json({ error: updateErr.message, success: false }, 500);
      return json({ success: true });
    }

    if (action === 'invalid-id') {
      const { error: updateErr } = await supabase
        .from('campaigns')
        .update({ status: 'waiting_for_admin', updated_at: new Date().toISOString() })
        .eq('id', campaignId);
      if (updateErr) return json({ error: updateErr.message, success: false }, 500);
      return json({ success: true });
    }

    if (action === 'verify-and-run') {
      // Placeholder: set status to active and optionally sync to TikTok
      const { error: updateErr } = await supabase
        .from('campaigns')
        .update({
          status: 'active',
          tiktok_campaign_id: advertiserId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId);
      if (updateErr) return json({ error: updateErr.message, success: false }, 500);
      return json({ success: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (err) {
    console.error('admin-review error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});
