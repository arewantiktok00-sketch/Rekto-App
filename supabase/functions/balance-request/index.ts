/**
 * Balance Request Edge Function
 * IQD-only: wallet_balance and all amounts are in IQD.
 *
 * Actions:
 * - submit: user submits balance request (amount_iqd, sender_name, payment_method)
 * - approve: owner approves request (approved_amount_iqd) — credits IQD to wallet
 * - reject: owner rejects with reason
 * - search-users: owner searches by name/email/phone (returns user_id, full_name, email, phone_number, wallet_balance)
 * - direct-credit: owner adds IQD to user wallet (amount_iqd, note)
 * - direct-debit: owner removes IQD from user wallet (amount_iqd, note); validates balance
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

const FALLBACK_RATE = 1450;

async function getExchangeRate(supabaseAdmin: ReturnType<typeof createClient>): Promise<number> {
  try {
    const { data: pc } = await supabaseAdmin.from('app_settings').select('value').eq('key', 'pricing_config').maybeSingle();
    const fromPc = (pc?.value as { pricing?: { exchange_rate?: number } })?.pricing?.exchange_rate;
    if (typeof fromPc === 'number' && fromPc > 0) return fromPc;
    const { data: global } = await supabaseAdmin.from('app_settings').select('value').eq('key', 'global').maybeSingle();
    const fromGlobal = (global?.value as { pricing?: { exchange_rate?: number } })?.pricing?.exchange_rate;
    if (typeof fromGlobal === 'number' && fromGlobal > 0) return fromGlobal;
  } catch (_) {}
  return FALLBACK_RATE;
}

type Body = {
  action: string;
  user_id?: string;
  request_id?: string;
  amount_iqd?: string;
  approved_amount_iqd?: string;
  credited_usd?: number;
  sender_name?: string;
  payment_method?: string;
  rejection_reason?: string;
  note?: string;
  reviewer_email?: string;
  search?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  const authHeader = req.headers.get('Authorization');
  let callerUserId: string | null = null;
  let isOwner = false;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (user?.id) {
      callerUserId = user.id;
      const { data: owner } = await supabaseAdmin
        .from('owner_accounts')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      isOwner = !!owner;
    }
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const {
      action,
      user_id,
      request_id,
      amount_iqd,
      approved_amount_iqd,
      sender_name,
      payment_method,
      rejection_reason,
      note,
      reviewer_email,
      search,
    } = body;

    if (!action) return json({ error: 'action required' }, 400);

    // —— submit: user submits balance request ——
    if (action === 'submit') {
      if (!callerUserId || !amount_iqd || !sender_name || !payment_method) {
        return json({ success: false, error: 'user_id, amount_iqd, sender_name, payment_method required' }, 400);
      }
      const amt = String(amount_iqd).replace(/,/g, '');
      if (!amt || isNaN(Number(amt)) || Number(amt) <= 0) {
        return json({ success: false, error: 'Invalid amount_iqd' }, 400);
      }
      const { error } = await supabaseAdmin.from('balance_requests').insert({
        user_id: callerUserId,
        amount_iqd: amt,
        sender_name: sender_name.trim(),
        payment_method: payment_method.trim(),
        status: 'pending',
      });
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true });
    }

    // —— approve: owner approves request; credit approved_amount_iqd (IQD) to wallet ——
    if (action === 'approve') {
      if (!isOwner || !request_id || !approved_amount_iqd) {
        return json({ success: false, error: 'Unauthorized or missing request_id/approved_amount_iqd' }, 400);
      }
      const iqd = String(approved_amount_iqd).replace(/,/g, '');
      if (!iqd || isNaN(Number(iqd)) || Number(iqd) <= 0) {
        return json({ success: false, error: 'Invalid approved_amount_iqd' }, 400);
      }
      const { data: reqRow, error: reqErr } = await supabaseAdmin
        .from('balance_requests')
        .select('user_id')
        .eq('id', request_id)
        .eq('status', 'pending')
        .single();
      if (reqErr || !reqRow) return json({ success: false, error: 'Request not found or not pending' }, 400);
      const targetUserId = reqRow.user_id;

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', targetUserId)
        .single();
      const currentUsd = (profile?.wallet_balance ?? 0) as number;
      const rate = await getExchangeRate(supabaseAdmin);
      const addUsd = Math.floor((Number(iqd) / rate) * 100) / 100;
      await supabaseAdmin
        .from('profiles')
        .update({ wallet_balance: currentUsd + addUsd })
        .eq('user_id', targetUserId);
      await supabaseAdmin
        .from('balance_requests')
        .update({
          status: 'approved',
          approved_amount_iqd: iqd,
          reviewed_at: new Date().toISOString(),
          reviewer_email: reviewer_email ?? null,
        })
        .eq('id', request_id);
      await supabaseAdmin.from('transactions').insert({
        user_id: targetUserId,
        type: 'credit',
        amount: addUsd,
        status: 'completed',
        payment_method: 'balance_request_approval',
        description: note || 'Balance request approved',
      });
      await supabaseAdmin.from('notifications').insert({
        user_id: targetUserId,
        title: 'Balance Added ✅',
        message: `IQD ${Number(iqd).toLocaleString('en-US')} has been added to your wallet`,
        type: 'balance',
      });
      return json({ success: true });
    }

    // —— reject ——
    if (action === 'reject') {
      if (!isOwner || !request_id || !rejection_reason?.trim()) {
        return json({ success: false, error: 'Unauthorized or missing request_id/rejection_reason' }, 400);
      }
      await supabaseAdmin
        .from('balance_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejection_reason.trim(),
          reviewed_at: new Date().toISOString(),
          reviewer_email: reviewer_email ?? null,
        })
        .eq('id', request_id);
      return json({ success: true });
    }

    // —— search-users: owner searches users ——
    if (action === 'search-users') {
      if (!isOwner || !search?.trim() || search.trim().length < 2) {
        return json({ users: [] });
      }
      const q = search.trim().toLowerCase();
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('user_id, full_name, email, phone_number, wallet_balance')
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone_number.ilike.%${q}%`);
      return json({ users: profiles ?? [] });
    }

    // —— direct-credit: owner adds IQD to user wallet (credited_usd calculated from owner-configured rate) ——
    if (action === 'direct-credit') {
      if (!isOwner || !user_id || !amount_iqd) {
        return json({ success: false, error: 'Unauthorized or missing user_id/amount_iqd' }, 400);
      }
      const iqd = String(amount_iqd).replace(/,/g, '');
      if (!iqd || isNaN(Number(iqd)) || Number(iqd) <= 0) {
        return json({ success: false, error: 'Invalid amount_iqd' }, 400);
      }
      const iqdNum = Number(iqd);
      const rate = await getExchangeRate(supabaseAdmin);
      const addUsd = Math.floor((iqdNum / rate) * 100) / 100;
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('wallet_balance, full_name')
        .eq('user_id', user_id)
        .single();
      if (!profile) return json({ success: false, error: 'User not found' }, 400);
      const currentUsd = (profile.wallet_balance ?? 0) as number;
      await supabaseAdmin
        .from('profiles')
        .update({ wallet_balance: currentUsd + addUsd })
        .eq('user_id', user_id);
      await supabaseAdmin.from('transactions').insert({
        user_id,
        type: 'credit',
        amount: addUsd,
        status: 'completed',
        payment_method: 'admin_credit',
        description: note || 'Admin balance credit',
      });
      await supabaseAdmin.from('audit_logs').insert({
        admin_email: reviewer_email ?? '',
        action: 'direct_credit',
        target_type: 'profile',
        target_id: user_id,
        details: { amount_iqd: iqdNum, note: note ?? null },
      });
      await supabaseAdmin.from('notifications').insert({
        user_id,
        title: 'Balance Added ✅',
        message: `IQD ${iqdNum.toLocaleString('en-US')} has been added to your wallet`,
        type: 'balance',
      });
      return json({ success: true, user_name: profile.full_name ?? '' });
    }

    // —— direct-debit: owner removes IQD from user wallet (wallet_balance stored as USD) ——
    if (action === 'direct-debit') {
      if (!isOwner || !user_id || !amount_iqd) {
        return json({ success: false, error: 'Unauthorized or missing user_id/amount_iqd' }, 400);
      }
      const iqd = String(amount_iqd).replace(/,/g, '');
      if (!iqd || isNaN(Number(iqd)) || Number(iqd) <= 0) {
        return json({ success: false, error: 'Invalid amount_iqd' }, 400);
      }
      const debitIqd = Number(iqd);
      const rate = await getExchangeRate(supabaseAdmin);
      const debitUsd = Math.floor((debitIqd / rate) * 100) / 100;
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('wallet_balance, full_name')
        .eq('user_id', user_id)
        .single();
      if (!profile) return json({ success: false, error: 'User not found' }, 400);
      const currentBalanceUsd = (profile.wallet_balance ?? 0) as number;
      if (debitUsd > currentBalanceUsd) {
        return json({ success: false, error: 'Insufficient balance' }, 400);
      }
      await supabaseAdmin
        .from('profiles')
        .update({ wallet_balance: currentBalanceUsd - debitUsd })
        .eq('user_id', user_id);
      await supabaseAdmin.from('transactions').insert({
        user_id,
        type: 'debit',
        amount: -debitUsd,
        status: 'completed',
        payment_method: 'admin_debit',
        description: note || 'Admin balance deduction',
      });
      await supabaseAdmin.from('audit_logs').insert({
        admin_email: reviewer_email ?? '',
        action: 'direct_debit',
        target_type: 'profile',
        target_id: user_id,
        details: { amount_iqd: debitIqd, note: note ?? null },
      });
      await supabaseAdmin.from('notifications').insert({
        user_id,
        title: 'Balance Deducted',
        message: `IQD ${debitIqd.toLocaleString('en-US')} has been deducted from your wallet`,
        type: 'balance',
      });
      return json({ success: true, user_name: profile.full_name ?? '' });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.error('balance-request error', e);
    return json({ error: String(e) }, 500);
  }
});
