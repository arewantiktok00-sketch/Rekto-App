/**
 * Notify all owners when a user has paid (e.g. "User paid – approve his content").
 * Resolves owner user_ids then calls send-onesignal-push.
 *
 * Requires owner_accounts to have a user_id column (Supabase auth user id for each owner).
 * If you don't have it, add the column and set it when owners log in (e.g. from app).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ReqBody {
  campaignId?: string;
  title: string;
  body: string;
}

function cors(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() });
  }

  try {
    const body = (await req.json()) as ReqBody;
    const { campaignId, title, body: message } = body;
    if (!title) {
      return new Response(JSON.stringify({ error: 'title required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...cors() },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get owner user_ids. owner_accounts should have user_id (auth id) for each owner.
    const { data: owners, error: ownerError } = await supabase
      .from('owner_accounts')
      .select('user_id')
      .not('user_id', 'is', null);

    if (ownerError) {
      console.error('notify-owners-user-paid: owner_accounts error', ownerError);
      return new Response(
        JSON.stringify({ error: 'Failed to get owners', sent: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...cors() } }
      );
    }

    const ownerIds = (owners || [])
      .map((o: { user_id?: string }) => o.user_id)
      .filter(Boolean) as string[];

    if (ownerIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No owner user_ids' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...cors() } }
      );
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/send-onesignal-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        external_user_ids: ownerIds,
        title,
        body: message,
        type: 'owner-notification',
        data: campaignId ? { campaign_id: campaignId } : {},
      }),
    });

    const result = await res.json().catch(() => ({}));
    const status = res.ok ? 200 : res.status;
    return new Response(JSON.stringify(result), {
      status,
      headers: { 'Content-Type': 'application/json', ...cors() },
    });
  } catch (err) {
    console.error('notify-owners-user-paid error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...cors() } }
    );
  }
});
