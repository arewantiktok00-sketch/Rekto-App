import { Text } from '@/components/common/Text';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { usePricingConfig } from '@/hooks/usePricingConfig';
import { getOwnerColors } from '@/theme/colors';
import { useOwnerAuth } from '@/hooks/useOwnerAuth';
import { formatIQD } from '@/utils/currency';
import { getErrorMessageForUser } from '@/utils/errorHandling';
import { borderRadius, spacing } from '@/theme/spacing';
import { inputStyleRTL } from '@/utils/rtl';
import { Wallet, Search, Plus, Check, X, User } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { toast } from '@/utils/toast';

const labels = {
  balanceRequests: { ckb: 'داواکاریەکانی باڵانس', ar: 'طلبات الرصيد' },
  search: { ckb: 'گەڕان...', ar: 'بحث...' },
  pending: { ckb: 'چاوەڕوان', ar: 'قيد الانتظار' },
  approved: { ckb: 'پەسەندکرا', ar: 'تمت الموافقة' },
  rejected: { ckb: 'ڕەتکرایەوە', ar: 'مرفوض' },
  all: { ckb: 'هەموو', ar: 'الكل' },
  approve: { ckb: 'پەسەندکردن', ar: 'موافقة' },
  reject: { ckb: 'ڕەتکردنەوە', ar: 'رفض' },
  directCredit: { ckb: 'زیادکردنی ڕاستەوخۆی باڵانس', ar: 'إضافة رصيد مباشر' },
  searchUser: { ckb: 'گەڕان بۆ بەکارهێنەر', ar: 'البحث عن مستخدم' },
  addBalanceToUser: { ckb: 'زیادکردنی باڵانس', ar: 'إضافة رصيد' },
  removeBalanceFromUser: { ckb: 'کەمکردنەوەی باڵانس', ar: 'خصم الرصيد' },
  currentBalance: { ckb: 'باڵانسی ئێستا', ar: 'الرصيد الحالي' },
  amountIqd: { ckb: 'بڕ (IQD)', ar: 'المبلغ (IQD)' },
  noteOptional: { ckb: 'تێبینی (لەبەرچووەمەندانە)', ar: 'ملاحظة (اختياري)' },
  credit: { ckb: 'زیادکردن', ar: 'إضافة' },
  debit: { ckb: 'کەمکردنەوە', ar: 'خصم' },
  searchBtn: { ckb: 'گەڕان', ar: 'بحث' },
  saveRefresh: { ckb: 'نوێکردنەوە', ar: 'تحديث' },
  confirmApprove: { ckb: 'دڵنیاکردنەوەی پەسەندکردن', ar: 'تأكيد الموافقة' },
  approvedAmountIqd: { ckb: 'بڕی IQD', ar: 'المبلغ (IQD)' },
  rejectionReason: { ckb: 'هۆکاری ڕەتکردنەوە', ar: 'سبب الرفض' },
  insufficientBalance: { ckb: 'باڵانس بەس نییە بۆ کەمکردنەوە', ar: 'الرصيد غير كافٍ للخصم' },
  history: { ckb: 'مێژوو', ar: 'السجل' },
  addShort: { ckb: 'زیادکردن', ar: 'إضافة' },
  removeShort: { ckb: 'کەمکردنەوە', ar: 'خصم' },
};

interface BalanceRequestRow {
  id: string;
  user_id: string;
  amount_iqd: string;
  sender_name: string;
  payment_method: string;
  status: string;
  rejection_reason?: string | null;
  approved_amount_iqd?: string | null;
  created_at: string;
  profiles?: { full_name?: string; email?: string; phone_number?: string } | null;
}

interface SearchUser {
  user_id: string;
  full_name?: string;
  email?: string;
  phone_number?: string;
  wallet_balance?: number;
}

export function BalanceTab() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { hasAdminAccess } = useOwnerAuth();
  const { convertToIQD, convertToUSD } = usePricingConfig();
  const colors = getOwnerColors();
  const styles = createStyles(colors);
  const l = (key: keyof typeof labels) => labels[key]?.[language === 'ar' ? 'ar' : 'ckb'] ?? key;

  const [requests, setRequests] = useState<BalanceRequestRow[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsTab, setRequestsTab] = useState<'pending' | 'history'>('pending');
  const [requestSearch, setRequestSearch] = useState('');

  const [directSearch, setDirectSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showDebitModal, setShowDebitModal] = useState(false);
  const [creditModalMode, setCreditModalMode] = useState<'add' | 'remove'>('add');
  const [selectedRequest, setSelectedRequest] = useState<BalanceRequestRow | null>(null);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [approveIqd, setApproveIqd] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [creditIqd, setCreditIqd] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const { data, error } = await supabase
        .from('balance_requests')
        .select('id, user_id, amount_iqd, sender_name, payment_method, status, rejection_reason, approved_amount_iqd, created_at')
        .order('created_at', { ascending: false });
      if (!error && data) {
        const rows = data as BalanceRequestRow[];
        if (rows.length > 0) {
          const userIds = [...new Set(rows.map((r) => r.user_id))];
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id, full_name, email, phone_number')
            .in('user_id', userIds);
          const profileMap = new Map((profilesData ?? []).map((p: any) => [p.user_id, p]));
          rows.forEach((r) => {
            (r as any).profiles = profileMap.get(r.user_id) ?? null;
          });
        }
        setRequests(rows);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const searchUsers = useCallback(async () => {
    const q = directSearch.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('balance-request', {
        body: { action: 'search-users', search: q },
      });
      if (!error && data?.users) setSearchResults(data.users);
      else setSearchResults([]);
    } catch (e) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [directSearch]);

  useEffect(() => {
    const t = setTimeout(searchUsers, 400);
    return () => clearTimeout(t);
  }, [directSearch, searchUsers]);

  const filteredRequests = requests.filter((r) => {
    if (requestsTab === 'pending') {
      if (r.status !== 'pending') return false;
    } else {
      if (r.status !== 'approved' && r.status !== 'rejected') return false;
    }
    if (requestSearch.trim()) {
      const search = requestSearch.toLowerCase();
      const name = (r.profiles as any)?.full_name ?? '';
      const email = (r.profiles as any)?.email ?? '';
      const phone = (r.profiles as any)?.phone_number ?? '';
      return (
        name.toLowerCase().includes(search) ||
        email.toLowerCase().includes(search) ||
        (phone && phone.includes(search))
      );
    }
    return true;
  });

  const handleApprove = async () => {
    if (!selectedRequest || !user?.email) return;
    const iqd = approveIqd.trim().replace(/,/g, '');
    if (!iqd || isNaN(Number(iqd)) || Number(iqd) <= 0) {
      toast.warning(l('approvedAmountIqd'), language === 'ar' ? 'أدخل المبلغ' : 'بڕ بنووسە');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('balance-request', {
        body: {
          action: 'approve',
          request_id: selectedRequest.id,
          approved_amount_iqd: iqd,
          reviewer_email: user.email,
        },
      });
      if (error) {
        toast.error(hasAdminAccess ? 'Error' : (language === 'ckb' ? 'هەڵە' : 'خطأ'), getErrorMessageForUser(error, data ?? null, hasAdminAccess, language === 'ar' ? 'ar' : 'ckb'));
        return;
      }
      if (data?.success === false) {
        toast.error(hasAdminAccess ? 'Error' : (language === 'ckb' ? 'هەڵە' : 'خطأ'), getErrorMessageForUser(null, data, hasAdminAccess, language === 'ar' ? 'ar' : 'ckb'));
        return;
      }
      toast.success(language === 'ckb' ? 'سەرکەوتوو' : 'تم', language === 'ckb' ? 'پەسەندکرا' : 'تمت الموافقة');
      setShowApproveModal(false);
      setSelectedRequest(null);
      setApproveIqd('');
      fetchRequests();
    } catch (e: any) {
      toast.error(hasAdminAccess ? 'Error' : (language === 'ckb' ? 'هەڵە' : 'خطأ'), getErrorMessageForUser(e, null, hasAdminAccess, language === 'ar' ? 'ar' : 'ckb'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !user?.email) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.warning(l('rejectionReason'), language === 'ar' ? 'أدخل السبب' : 'هۆکار بنووسە');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('balance-request', {
        body: {
          action: 'reject',
          request_id: selectedRequest.id,
          rejection_reason: reason,
          reviewer_email: user.email,
        },
      });
      if (error) {
        toast.error(hasAdminAccess ? 'Error' : (language === 'ckb' ? 'هەڵە' : 'خطأ'), getErrorMessageForUser(error, data ?? null, hasAdminAccess, language === 'ar' ? 'ar' : 'ckb'));
        return;
      }
      if (data?.success === false) {
        toast.error(hasAdminAccess ? 'Error' : (language === 'ckb' ? 'هەڵە' : 'خطأ'), getErrorMessageForUser(null, data, hasAdminAccess, language === 'ar' ? 'ar' : 'ckb'));
        return;
      }
      toast.success(language === 'ckb' ? 'سەرکەوتوو' : 'تم', language === 'ckb' ? 'ڕەتکرایەوە' : 'مرفوض');
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectReason('');
      fetchRequests();
    } catch (e: any) {
      toast.error(hasAdminAccess ? 'Error' : (language === 'ckb' ? 'هەڵە' : 'خطأ'), getErrorMessageForUser(e, null, hasAdminAccess, language === 'ar' ? 'ar' : 'ckb'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectCredit = async () => {
    if (!selectedUser || !user?.email) return;
    const iqd = creditIqd.trim().replace(/,/g, '');
    const numIqd = Number(iqd);
    if (!iqd || isNaN(numIqd) || numIqd <= 0) {
      toast.warning(l('amountIqd'), language === 'ar' ? 'أدخل المبلغ' : 'بڕ بنووسە');
      return;
    }
    if (creditModalMode === 'remove') {
      const currentUsd = selectedUser.wallet_balance ?? 0;
      const debitUsd = convertToUSD(numIqd);
      if (debitUsd > currentUsd) {
        toast.error(language === 'ckb' ? 'هەڵە' : 'خطأ', l('insufficientBalance'));
        return;
      }
    }
    setSubmitting(true);
    try {
      const action = creditModalMode === 'add' ? 'direct-credit' : 'direct-debit';
      const { data, error } = await supabase.functions.invoke('balance-request', {
        body: {
          action,
          user_id: selectedUser.user_id,
          amount_iqd: iqd,
          note: creditNote.trim() || undefined,
        },
      });
      if (error) {
        const msg = getErrorMessageForUser(error, data ?? null, hasAdminAccess, language === 'ar' ? 'ar' : 'ckb');
        toast.error(hasAdminAccess ? 'Error' : (language === 'ckb' ? 'هەڵە' : 'خطأ'), msg);
        return;
      }
      if (data?.success === false) {
        const msg = getErrorMessageForUser(null, data, hasAdminAccess, language === 'ar' ? 'ar' : 'ckb');
        toast.error(hasAdminAccess ? 'Error' : (language === 'ckb' ? 'هەڵە' : 'خطأ'), msg);
        return;
      }
      toast.success(language === 'ckb' ? 'سەرکەوتوو' : 'تم', (data?.user_name ?? '') + ' — ' + formatIQD(numIqd));
      setShowCreditModal(false);
      setShowDebitModal(false);
      setSelectedUser(null);
      setCreditIqd('');
      setCreditNote('');
      fetchRequests();
    } catch (e: any) {
      const msg = getErrorMessageForUser(e, null, hasAdminAccess, language === 'ar' ? 'ar' : 'ckb');
      toast.error(hasAdminAccess ? 'Error' : (language === 'ckb' ? 'هەڵە' : 'خطأ'), msg);
    } finally {
      setSubmitting(false);
    }
  };

  const openApprove = (req: BalanceRequestRow) => {
    setSelectedRequest(req);
    setApproveIqd(req.amount_iqd || '');
    setShowApproveModal(true);
  };

  const openReject = (req: BalanceRequestRow) => {
    setSelectedRequest(req);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const openCredit = (u: SearchUser, mode: 'add' | 'remove') => {
    setSelectedUser(u);
    setCreditIqd('');
    setCreditNote('');
    setCreditModalMode(mode);
    setShowCreditModal(true);
    if (mode === 'remove') setShowDebitModal(true);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Section A: Balance Requests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{l('balanceRequests')}</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.searchInput, styles.searchInputFlex, inputStyleRTL()]}
            placeholder={l('search')}
            placeholderTextColor={colors.foreground.muted}
            value={requestSearch}
            onChangeText={setRequestSearch}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={() => fetchRequests()}>
            <Search size={18} color="#fff" />
            <Text style={styles.searchBtnText}>{l('searchBtn')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={() => fetchRequests()}>
            <Text style={styles.saveBtnText}>{l('saveRefresh')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, requestsTab === 'pending' && styles.filterChipActive]}
            onPress={() => setRequestsTab('pending')}
          >
            <Text style={[styles.filterChipText, requestsTab === 'pending' && styles.filterChipTextActive]}>{l('pending')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, requestsTab === 'history' && styles.filterChipActive]}
            onPress={() => setRequestsTab('history')}
          >
            <Text style={[styles.filterChipText, requestsTab === 'history' && styles.filterChipTextActive]}>{l('history')}</Text>
          </TouchableOpacity>
        </View>
        {requestsLoading ? (
          <ActivityIndicator size="small" color={colors.primary.DEFAULT} style={{ marginVertical: 16 }} />
        ) : (
          filteredRequests.slice(0, 30).map((req) => (
            <View key={req.id} style={styles.requestCard}>
              <Text style={styles.requestAmount}>{formatIQD(Number(String(req.amount_iqd).replace(/,/g, '')))}</Text>
              <Text style={styles.requestMeta}>
                {(req.profiles as any)?.full_name ?? '—'} • {(req.profiles as any)?.email ?? '—'} • {new Date(req.created_at).toLocaleDateString(language === 'ar' ? 'ar-IQ' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
              <Text style={styles.requestMeta}>{req.sender_name} • {req.payment_method}</Text>
              <View style={styles.requestRow}>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        req.status === 'pending' ? '#F59E0B22' : req.status === 'approved' ? '#22C55E22' : '#EF444422',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color:
                          req.status === 'pending' ? '#F59E0B' : req.status === 'approved' ? '#22C55E' : '#EF4444',
                      },
                    ]}
                  >
                    {l(req.status as 'pending' | 'approved' | 'rejected')}
                  </Text>
                </View>
                {req.status === 'pending' && (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => openApprove(req)}>
                      <Check size={16} color="#fff" />
                      <Text style={styles.approveBtnText}>{l('approve')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => openReject(req)}>
                      <X size={16} color="#fff" />
                      <Text style={styles.rejectBtnText}>{l('reject')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              {req.rejection_reason && <Text style={styles.rejectionText}>{req.rejection_reason}</Text>}
            </View>
          ))
        )}
      </View>

      {/* Section B: Direct Credit */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{l('directCredit')}</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.searchInput, styles.searchInputFlex, inputStyleRTL()]}
            placeholder={l('searchUser')}
            placeholderTextColor={colors.foreground.muted}
            value={directSearch}
            onChangeText={setDirectSearch}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={searchUsers} disabled={directSearch.trim().length < 2}>
            <Search size={18} color="#fff" />
            <Text style={styles.searchBtnText}>{l('searchBtn')}</Text>
          </TouchableOpacity>
        </View>
        {searching && <ActivityIndicator size="small" color={colors.primary.DEFAULT} style={{ marginVertical: 8 }} />}
        {searchResults.map((u) => (
          <View key={u.user_id} style={styles.userCard}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{u.full_name ?? u.email ?? '—'}</Text>
              <Text style={styles.userMeta}>{u.email} {u.phone_number ? `• ${u.phone_number}` : ''}</Text>
              <Text style={styles.userBalance}>{l('currentBalance')}: {formatIQD(convertToIQD(u.wallet_balance ?? 0))}</Text>
            </View>
            <View style={styles.userActionsRow}>
              <TouchableOpacity style={styles.addBalanceBtn} onPress={() => openCredit(u, 'add')}>
                <Plus size={16} color="#fff" />
                <Text style={styles.addBalanceBtnText}>+ {l('addShort')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeBalanceBtn} onPress={() => openCredit(u, 'remove')}>
                <Text style={styles.removeBalanceBtnText}>- {l('removeShort')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{l('confirmApprove')}</Text>
            <Text style={styles.inputLabel}>{l('approvedAmountIqd')}</Text>
            <TextInput
              style={[styles.input, inputStyleRTL()]}
              value={approveIqd}
              onChangeText={(t) => setApproveIqd(t.replace(/[^0-9,]/g, ''))}
              keyboardType="numeric"
              placeholderTextColor={colors.foreground.muted}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowApproveModal(false); setSelectedRequest(null); }}>
                <Text style={styles.cancelBtnText}>{language === 'ckb' ? 'پاشگەز' : 'إلغاء'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleApprove} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmBtnText}>{l('approve')} ({formatIQD(Number(approveIqd.replace(/,/g, '')) || 0)})</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{l('reject')}</Text>
            <Text style={styles.inputLabel}>{l('rejectionReason')}</Text>
            <TextInput
              style={[styles.input, styles.textArea, inputStyleRTL()]}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholderTextColor={colors.foreground.muted}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowRejectModal(false); setSelectedRequest(null); }}>
                <Text style={styles.cancelBtnText}>{language === 'ckb' ? 'پاشگەز' : 'إلغاء'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={handleReject} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.rejectBtnText}>{l('reject')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Add / Remove Balance Modal */}
      {showCreditModal && selectedUser && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {creditModalMode === 'add' ? l('addBalanceToUser') : l('removeBalanceFromUser')} — {selectedUser.full_name ?? selectedUser.email}
            </Text>
            <Text style={styles.inputLabel}>{l('amountIqd')}</Text>
            <TextInput
              style={[styles.input, inputStyleRTL()]}
              value={creditIqd}
              onChangeText={(t) => setCreditIqd(t.replace(/[^0-9,]/g, ''))}
              keyboardType="numeric"
              placeholderTextColor={colors.foreground.muted}
            />
            {creditModalMode === 'add' && creditIqd.replace(/,/g, '') && (
              <Text style={[styles.inputLabel, { marginTop: 4, fontWeight: '400', opacity: 0.8 }]}>
                ≈ ${convertToUSD(Number(creditIqd.replace(/,/g, ''))).toFixed(2)} USD
              </Text>
            )}
            <Text style={styles.inputLabel}>{l('noteOptional')}</Text>
            <TextInput
              style={[styles.input, styles.textArea, inputStyleRTL()]}
              value={creditNote}
              onChangeText={setCreditNote}
              placeholderTextColor={colors.foreground.muted}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowCreditModal(false); setShowDebitModal(false); setSelectedUser(null); }}>
                <Text style={styles.cancelBtnText}>{language === 'ckb' ? 'پاشگەز' : 'إلغاء'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={creditModalMode === 'add' ? styles.confirmBtn : styles.debitConfirmBtn}
                onPress={handleDirectCredit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>
                    {creditModalMode === 'add' ? l('credit') : l('debit')} {formatIQD(Number(creditIqd.replace(/,/g, '')) || 0)}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    content: { padding: spacing.md, paddingBottom: 40 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground.DEFAULT, marginBottom: 12 },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    searchInput: {
      backgroundColor: colors.background.secondary ?? colors.card.background,
      borderRadius: borderRadius.input,
      padding: spacing.sm,
      color: colors.foreground.DEFAULT,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    searchInputFlex: { flex: 1, minWidth: 0 },
    searchBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary.DEFAULT,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: borderRadius.input,
    },
    searchBtnText: { color: colors.primary.foreground ?? '#fff', fontSize: 13, fontWeight: '600' },
    saveBtn: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: borderRadius.input,
      backgroundColor: '#22C55E',
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.border.DEFAULT },
    filterChipActive: { backgroundColor: colors.primary.DEFAULT },
    filterChipText: { fontSize: 12, color: colors.foreground.DEFAULT },
    filterChipTextActive: { color: colors.primary.foreground, fontWeight: '600' },
    requestCard: {
      backgroundColor: colors.card.background,
      borderRadius: borderRadius.card,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    requestAmount: { fontSize: 20, fontWeight: '700', color: colors.foreground.DEFAULT, marginBottom: 4 },
    requestMeta: { fontSize: 12, color: colors.foreground.muted, marginBottom: 2 },
    requestRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 12, fontWeight: '600' },
    actionsRow: { flexDirection: 'row', gap: 8 },
    approveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#22C55E', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    approveBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    rejectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    rejectBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    creditedText: { fontSize: 12, color: '#22C55E', marginTop: 4 },
    rejectionText: { fontSize: 12, color: colors.error, marginTop: 4 },
    userCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card.background,
      borderRadius: borderRadius.card,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    userInfo: { flex: 1 },
    userName: { fontSize: 16, fontWeight: '600', color: colors.foreground.DEFAULT },
    userMeta: { fontSize: 12, color: colors.foreground.muted },
    userBalance: { fontSize: 12, color: colors.foreground.muted, marginTop: 4 },
    userActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    addBalanceBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary.DEFAULT ?? '#7C3AED', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    addBalanceBtnText: { color: colors.primary.foreground ?? '#fff', fontSize: 12, fontWeight: '600' },
    removeBalanceBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#EF4444' },
    removeBalanceBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    debitConfirmBtn: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 8, backgroundColor: '#EF4444' },
    modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16, zIndex: 10 },
    modalCard: { backgroundColor: colors.card.background, borderRadius: 16, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground.DEFAULT, marginBottom: 16 },
    inputLabel: { fontSize: 12, color: colors.foreground.muted, marginBottom: 4 },
    input: { backgroundColor: colors.background.secondary ?? colors.card.background, borderRadius: 8, padding: 12, color: colors.foreground.DEFAULT, marginBottom: 12, borderWidth: 1, borderColor: colors.border.DEFAULT },
    textArea: { minHeight: 60 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 8, backgroundColor: colors.border.DEFAULT },
    cancelBtnText: { color: colors.foreground.DEFAULT, fontWeight: '600' },
    confirmBtn: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 8, backgroundColor: colors.primary.DEFAULT },
    confirmBtnText: { color: colors.primary.foreground, fontWeight: '600' },
  });
