/**
 * Supabase Edge Function: send-onesignal-push
 *
 * Sends push to users by external_user_id (Supabase user.id).
 * Uses OneSignal include_aliases.external_id — app must set setExternalUserId(userId) after login.
 *
 * Set in Supabase Dashboard → Edge Functions → Secrets:
 *   ONESIGNAL_REST_API_KEY
 *   ONESIGNAL_APP_ID
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ONESIGNAL_URL = 'https://api.onesignal.com/notifications';

interface ReqBody {
  external_user_ids?: string[];
  user_id?: string;
  title: string;
  body: string;
  type?: string;
  data?: Record<string, unknown>;
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

    // Send to users by external_user_id (Supabase user.id) — no player_id lookup needed
    const payload = {
      app_id: appId,
      include_aliases: { external_id: userIds },
      target_channel: 'push',
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
        sent: userIds.length,
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
