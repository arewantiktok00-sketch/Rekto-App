/**
 * Supabase Edge Function: send-onesignal-push
 *
 * Reusable backend: send_push_notification(user_id(s), title, message, data).
 * - Fetches OneSignal player_id from notification_preferences.
 * - Calls OneSignal REST API to deliver push.
 *
 * Set in Supabase Dashboard → Edge Functions → Secrets:
 *   ONESIGNAL_REST_API_KEY
 *   ONESIGNAL_APP_ID
 *
 * Invoke from client or other functions after creating in-app notification.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ONESIGNAL_URL = 'https://api.onesignal.com/notifications';

interface ReqBody {
  external_user_ids?: string[];
  user_id?: string;
  title: string;
  body: string;
  type?: string;
  data?: Record<string, unknown>;
}

interface PushSub {
  player_id?: string;
  token?: string;
  type?: string;
  platform?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() });
  }

  try {
    const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
    const appId = Deno.env.get('ONESIGNAL_APP_ID');

    if (!apiKey || !appId) {
      console.error('Missing ONESIGNAL_REST_API_KEY or ONESIGNAL_APP_ID');
      return json({ error: 'Push not configured' }, 500, cors());
    }

    const body = (await req.json()) as ReqBody;
    const { title, body: message, type = 'notification', data = {} } = body;

    let userIds: string[] = [];
    if (Array.isArray(body.external_user_ids) && body.external_user_ids.length > 0) {
      userIds = body.external_user_ids;
    } else if (typeof body.user_id === 'string') {
      userIds = [body.user_id];
    }

    if (userIds.length === 0 || !title) {
      return json({ error: 'external_user_ids or user_id and title required' }, 400, cors());
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: rows, error: fetchError } = await supabase
      .from('notification_preferences')
      .select('user_id, push_subscription')
      .in('user_id', userIds)
      .eq('push_enabled', true);

    if (fetchError) {
      console.error('DB error fetching player_ids:', fetchError);
      return json({ error: 'Failed to resolve recipients' }, 500, cors());
    }

    const playerIds: string[] = [];
    (rows || []).forEach((row: { push_subscription?: PushSub | null }) => {
      const sub = row.push_subscription as PushSub | null | undefined;
      if (sub && typeof sub === 'object' && sub.player_id) {
        playerIds.push(sub.player_id);
      }
    });

    if (playerIds.length === 0) {
      return json({ sent: 0, message: 'No push subscriptions found for users' }, 200, cors());
    }

    const payload = {
      app_id: appId,
      include_player_ids: playerIds,
      headings: { en: title },
      contents: { en: message },
      data: {
        ...data,
        type: type,
      },
    };

    const res = await fetch(ONESIGNAL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('OneSignal API error:', res.status, result);
      return json(
        { error: result?.errors?.[0] || 'OneSignal delivery failed', sent: 0 },
        res.status,
        cors()
      );
    }

    return json(
      {
        success: true,
        sent: playerIds.length,
        id: result.id,
      },
      200,
      cors()
    );
  } catch (err) {
    console.error('send-onesignal-push error:', err);
    return json({ error: 'Internal error' }, 500, cors());
  }
});

function json(data: object, status: number, headers: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...(headers as Record<string, string>) },
  });
}

function cors(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}
