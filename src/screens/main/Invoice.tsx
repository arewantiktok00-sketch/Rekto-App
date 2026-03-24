import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Text } from '@/components/common/Text';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabaseRead } from '@/integrations/supabase/client';
import { usePricingConfig } from '@/hooks/usePricingConfig';
import { calculateTax } from '@/lib/pricing';
import { spacing, borderRadius } from '@/theme/spacing';
import { formatIQDEnglish, formatUSDLatinDigitsOnly } from '@/utils/currency';
import { getDisplayBudget } from '@/utils/campaignBudget';
import { formatUTCDateOnlyLocal } from '@/utils/dateFormat';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Download } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Share from 'react-native-share';
import { toast } from '@/utils/toast';

/** Invoice data for PDF generation (matches web app) */
interface InvoiceData {
  invoiceNumber: string;
  displayName: string;
  campaignId: string;
  adName: string;
  startDate: string;
  endDate: string;
  budgetUSD: number;
  taxUSD: number;
  totalUSD: number;
  totalIQD: number;
  paymentMethod: string;
  isSpecialOffer: boolean;
}

/** Build full HTML for PDF (matches web app; RTL, Kurdish labels) */
function buildInvoiceHTML(invoice: InvoiceData): string {
  const esc = (s: string) => String(s ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `
<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; padding: 30px; direction: rtl; color: #1a1a1a; background: #ffffff; }
    .header { text-align: center; margin-bottom: 24px; }
    .header h1 { color: #7C3AED; font-size: 32px; letter-spacing: 2px; }
    .header p { color: #666; font-size: 13px; margin-top: 6px; }
    .info-grid { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .info-col { width: 48%; }
    .info-col p { font-size: 13px; color: #666; margin-bottom: 4px; }
    .info-col .name { color: #7C3AED; font-weight: 600; }
    .divider { height: 3px; background: #7C3AED; margin: 20px 0; border-radius: 2px; }
    .section-title { color: #7C3AED; font-size: 18px; font-weight: 700; text-align: right; margin-bottom: 12px; }
    .row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
    .row .label { font-size: 13px; color: #666; }
    .row .value { font-size: 15px; font-weight: 600; color: #1a1a1a; }
    .row .value.mono { font-family: 'Courier New', monospace; }
    .row .value.primary { color: #7C3AED; }
    .row .value.green { color: #16A34A; }
    .total-value { font-size: 22px; font-weight: 800; }
    .promo-badge { background: rgba(124, 58, 237, 0.1); border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
    .promo-badge strong { color: #7C3AED; font-size: 14px; }
    .ad-name-section { text-align: center; margin-top: 10px; }
    .ad-name-section h2 { color: #7C3AED; font-size: 20px; margin-top: 6px; }
    .footer { text-align: center; margin-top: 30px; padding: 14px; background: #f8f8f8; border-radius: 8px; font-size: 11px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <h1>REKTO</h1>
    <p>بازرگانەیەکەت بەرەو پێش ببە لەگەڵ ڕێکتۆ</p>
  </div>
  <div class="info-grid">
    <div class="info-col"><p>بۆ: <span class="name">${esc(invoice.displayName)}</span></p><p>✉ info@rekto.net</p></div>
    <div class="info-col" style="text-align: left;"><p>لە لایەن: <span class="name">Rekto</span></p><p>✉ info@rekto.net</p></div>
  </div>
  <div class="divider"></div>
  <div class="row"><span class="label">ئایدی / ID</span><span class="value mono">${esc(invoice.campaignId.slice(0, 12))}...</span></div>
  <div class="row"><span class="label">ڕێکەوت / Date of ads</span><span class="value">${esc(invoice.startDate)} - ${esc(invoice.endDate)}</span></div>
  <div class="divider"></div>
  <h3 class="section-title">پوختە</h3>
  ${invoice.isSpecialOffer ? `<div class="promo-badge"><strong>✨ Special Offer Applied</strong> <span>ئۆفەری تایبەت</span></div>` : ''}
  <div class="row"><span class="label">بودجە / Budget $</span><span class="value">$${invoice.budgetUSD.toFixed(2)}</span></div>
  ${!invoice.isSpecialOffer ? `<div class="row"><span class="label">باج / Tax $</span><span class="value">$${invoice.taxUSD.toFixed(2)}</span></div><div class="row"><span class="label">کۆی گشتی / Total $</span><span class="value">$${invoice.totalUSD.toFixed(2)}</span></div>` : ''}
  <div class="row"><span class="label">${invoice.isSpecialOffer ? 'نرخی تایبەت / Special Price IQD' : 'کۆی پارەی دراو / Total Paid IQD'}</span><span class="value total-value ${invoice.isSpecialOffer ? 'primary' : 'green'}">${invoice.totalIQD.toLocaleString()} IQD</span></div>
  <div class="divider"></div>
  <h3 class="section-title">زانیاری پارەدان</h3>
  <div class="row"><span class="label">ڕێگەی پارەدان / Payment</span><span class="value">${esc(invoice.paymentMethod)}</span></div>
  <div class="row"><span class="label">ژ.م پسوولە / Invoice #</span><span class="value mono">${esc(invoice.invoiceNumber)}</span></div>
  <div class="divider"></div>
  <div class="ad-name-section"><span class="label">ناوی سپۆنسەر / Ad Name</span><h2>${esc(invoice.adName)}</h2></div>
  <div class="footer">© ${new Date().getFullYear()} Rekto - TikTok Advertising Platform</div>
</body>
</html>`;
}

/** CKB/AR only — no English for payment method description */
function getPaymentMethodLabel(
  method: string | undefined | null,
  language: string
): string {
  const m = (method || '').toLowerCase().replace(/_/g, '');
  const isAr = language === 'ar';
  if (m.includes('wallet') || m === 'walletbalance') {
    return isAr ? 'حساب الرصيد (الجزدان)' : 'ژمێرەی باڵانس (جزدان)';
  }
  if (m.includes('fib')) return isAr ? 'FIB' : 'FIB';
  if (m.includes('fastpay')) return isAr ? 'فاست پاي' : 'فاستپەی';
  if (m.includes('superqi') || m.includes('qi')) return isAr ? 'سوبر كي / كي كارد' : 'سوپەرکی / کی کارد';
  if (m.includes('bank')) return isAr ? 'تحويل بنكي' : 'بەرەوەنەی بانکی';
  return isAr ? 'تحويل بنكي' : 'بەرەوەنەی بانکی (FIB / فاستپەی / کی کارد)';
}

export function Invoice() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const { isPaymentsHidden } = useRemoteConfig();
  const { colors } = useTheme();
  const { exchange_rate } = usePricingConfig();
  const styles = createStyles(colors, insets, isRTL);
  const { id } = route.params as { id: string };
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [transaction, setTransaction] = useState<any>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (user && id) {
      fetchInvoice();
    }
  }, [user, id]);

  useEffect(() => {
    if (isPaymentsHidden) {
      navigation.goBack();
    }
  }, [isPaymentsHidden, navigation]);

  if (isPaymentsHidden) {
    return null;
  }

  const fetchInvoice = async () => {
    try {
      // Fetch campaign
      const { data: campaignData, error: campaignError } = await supabaseRead
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (campaignError) throw campaignError;
      if (!campaignData) return;
      
      setCampaign(campaignData);

      // Fetch profile
      const { data: profileData } = await supabaseRead
        .from('profiles')
        .select('full_name')
        .eq('user_id', user!.id)
        .maybeSingle();
      
      if (profileData) setProfile(profileData);

      // Fetch payment transaction
      const { data: transactionData } = await supabaseRead
        .from('transactions')
        .select('*')
        .eq('campaign_id', id)
        .eq('user_id', user!.id)
        .eq('type', 'payment')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (transactionData) setTransaction(transactionData);
    } catch (error) {
      console.error('Error fetching invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!campaign && loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title={language === 'ar' ? 'الفاتورة' : 'پسوولە'}
          onBack={() => navigation.goBack()}
          style={{ paddingTop: insets.top + 16 }}
        />
      </View>
    );
  }

  // Disallow invoices for campaigns that are not yet approved/active/completed/paused
  const status = String(campaign.status || '').toLowerCase();
  const invoiceAllowedStatuses = ['active', 'completed', 'paused'];
  if (!invoiceAllowedStatuses.includes(status)) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title={language === 'ar' ? 'الفاتورة' : 'پسوولە'}
          onBack={() => navigation.goBack()}
          style={{ paddingTop: insets.top + 16 }}
        />
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Text style={[styles.errorTitle, isRTL && styles.textRTL]}>
              {language === 'ar' ? 'لا يمكن إنشاء الفاتورة بعد' : 'هێشتا ناتوانرێ پسوولە دروست بکرێت'}
            </Text>
            <Text style={[styles.errorSubtitle, isRTL && styles.textRTL]}>
              {language === 'ar'
                ? 'يجب أن تكون الحملة فعّالة أو مكتملة قبل إنشاء الفاتورة.'
                : 'پێویستە کامپەین چالاک بێت یان تەواو بێت پێش دروستکردنی پسوولە.'}
            </Text>
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => navigation.navigate('Main' as never, { screen: 'Campaigns' } as never)}
              activeOpacity={0.85}
            >
              <Text style={styles.errorButtonText}>
                {language === 'ar' ? 'العودة إلى الحملات' : 'گەڕانەوە بۆ کامپەینەکان'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (!campaign && !loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title={language === 'ar' ? 'الفاتورة' : 'پسوولە'}
          onBack={() => navigation.goBack()}
          style={{ paddingTop: insets.top + 16 }}
        />
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Text style={[styles.errorTitle, isRTL && styles.textRTL]}>
              {language === 'ar' ? 'الفاتورة غير موجودة' : 'پسوولە نەدۆزرایەوە'}
            </Text>
            <Text style={[styles.errorSubtitle, isRTL && styles.textRTL]}>
              {language === 'ar'
                ? 'تحقق من الحملة أو جرّب مرة أخرى لاحقاً.'
                : 'تکایە دڵنیابەرەوە لە کامپەین یان دواتر هەوڵ بدەوە.'}
            </Text>
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => navigation.navigate('Main' as never, { screen: 'Campaigns' } as never)}
              activeOpacity={0.85}
            >
              <Text style={styles.errorButtonText}>
                {language === 'ar' ? 'العودة إلى الحملات' : 'گەڕانەوە بۆ کامپەینەکان'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Display budget: target_spend ?? real_budget ?? total_budget ?? 0
  const budgetUSD = getDisplayBudget(campaign);
  const extensionAmountUSD = Number(campaign.extension_amount) || 0;

  // Split base vs extension for display: base = total - extension (if extension exists)
  const baseBudgetUSD = extensionAmountUSD > 0 ? Math.max(budgetUSD - extensionAmountUSD, 0) : budgetUSD;

  // Calculate tax per chunk using centralized pricing module
  const baseTaxUSD = calculateTax(baseBudgetUSD);
  const extensionTaxUSD = extensionAmountUSD > 0 ? calculateTax(extensionAmountUSD) : 0;

  // Overall totals (for final IQD + summary)
  const taxUSD = baseTaxUSD + extensionTaxUSD;
  const totalUSD = budgetUSD + taxUSD;
  
  // Convert to IQD with floor (owner exchange rate)
  const totalIQD = Math.floor(totalUSD * exchange_rate);
  
  const amountPaid = transaction ? Math.abs(Number(transaction.amount)) : totalUSD;
  const paymentMethodRaw = campaign.payment_method_used || transaction?.payment_method || '';
  const paymentMethodLabel = getPaymentMethodLabel(paymentMethodRaw, language as string);
  const customerContact = user?.email || user?.phone || profile?.email || '';
  
  // Generate invoice number in format: INV-EXAMPLE-001
  // Use campaign ID first 8 chars + sequential number based on creation date
  const campaignDate = new Date(campaign.created_at);
  const sequentialNum = String(campaignDate.getTime() % 1000).padStart(3, '0');
  const invoiceNumber = `INV-${campaign.id.slice(0, 8).toUpperCase()}-${sequentialNum}`;
  
  // Calculate dates safely
  const startDate = campaign.started_at || campaign.created_at;
  let endDate = campaign.completed_at || campaign.real_end_date || null;
  if (!endDate && Number.isFinite(Number(campaign.duration_days)) && startDate) {
    const ms = Number(campaign.duration_days) * 24 * 60 * 60 * 1000;
    const computed = new Date(new Date(startDate).getTime() + ms);
    if (!Number.isNaN(computed.getTime())) {
      endDate = computed.toISOString();
    }
  }
  if (!endDate) {
    endDate = startDate;
  }

  // Display dates in local timezone (backend stores UTC)
  const formatDate = (dateString: string) => {
    return formatUTCDateOnlyLocal(dateString);
  };

  const handleExportPdf = async () => {
    if (exporting || !campaign) return;
    const allowedStatuses = ['active', 'completed', 'paused'];
    const campaignStatus = String(campaign?.status ?? '').toLowerCase();
    if (!allowedStatuses.includes(campaignStatus)) {
      toast.error(language === 'ar' ? 'خطأ' : 'هەڵە', language === 'ar' ? 'الفاتورة غير متاحة لهذه الحالة' : 'پسوولە بۆ ئەم دۆخە بەردەست نییە');
      return;
    }
    setExporting(true);
    try {
      const invoice: InvoiceData = {
        invoiceNumber,
        displayName: profile?.full_name || (language === 'ar' ? 'العميل' : 'بەکارهێنەر'),
        campaignId: campaign.id,
        adName: campaign.title || '',
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        budgetUSD,
        taxUSD,
        totalUSD,
        totalIQD,
        paymentMethod: paymentMethodLabel,
        isSpecialOffer: !!(campaign as any).payment_amount_iqd,
      };
      const htmlContent = buildInvoiceHTML(invoice);
      const options = {
        html: htmlContent,
        fileName: invoice.invoiceNumber,
        directory: 'Documents',
        base64: false,
        width: 612,
        height: 792,
      };
      if (!(RNHTMLtoPDF as any)?.convert) {
        throw new Error('RNHTMLtoPDF native module is not available in iOS binary');
      }
      const file = await (RNHTMLtoPDF as any).convert(options);
      if (!file?.filePath) throw new Error('PDF generation failed');
      await Share.open({
        url: `file://${file.filePath}`,
        type: 'application/pdf',
        title: invoice.invoiceNumber,
      });
    } catch (err: any) {
      if (err?.message?.includes('User did not share')) return;
      console.error('PDF export error:', err);
      const errMsg = language === 'ar' ? 'فشل إنشاء PDF. حاول مرة أخرى.' : language === 'ckb' ? 'دروستکردنی PDF سەرنەکەوت. دووبارە هەوڵ بدەرەوە.' : 'Failed to generate PDF. Please try again.';
      Alert.alert(language === 'ar' ? 'خطأ' : language === 'ckb' ? 'هەڵە' : 'Error', errMsg);
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={language === 'ar' ? 'الفاتورة' : 'پسوولە'}
        onBack={() => navigation.goBack()}
        style={{ paddingTop: insets.top + 16 }}
        rightElement={
          <TouchableOpacity onPress={handleExportPdf} style={styles.exportButton} disabled={exporting} activeOpacity={0.8}>
            <Download size={18} color={colors.foreground.DEFAULT} />
            <Text style={[styles.exportText, isRTL && styles.textRTL]} numberOfLines={1}>
              {exporting ? (language === 'ar' ? 'جارٍ التحميل' : 'چاوەڕوان بە') : (language === 'ar' ? 'تصدير' : 'دابەزاندن')}
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.invoiceCard}>
          {/* Rekto Logo Header */}
          <View style={styles.logoHeader}>
            <Image
              source={require('../../../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={[styles.logoSubtitle, styles.textRTL]}>
              {language === 'ar' ? 'نمِّ عملك مع ' : 'بازرگانەیەکەت بەرەو پێش ببە لەگەڵ '}
              <Text style={styles.logoSubtitleBold}>Rekto</Text>
            </Text>
          </View>

          {/* Customer & Rekto Info - Two Columns */}
          <View style={styles.infoRow}>
            <View style={styles.infoColumn}>
              <Text style={[styles.infoLabel, styles.textRTL]}>
                {language === 'ar' ? 'إلى: ' : 'بۆ: '}<Text style={styles.infoValue}>{profile?.full_name || (language === 'ar' ? 'العميل' : 'بەکارهێنەر')}</Text>
              </Text>
              {!!customerContact && <Text style={styles.infoEmail}>✉ {customerContact}</Text>}
            </View>
            <View style={[styles.infoColumn, styles.infoColumnRight]}>
              <Text style={[styles.infoLabel, styles.textRTL]}>
                {language === 'ar' ? 'من: ' : 'لە لایەن: '}<Text style={styles.infoValueBold}>Rekto</Text>
              </Text>
              <Text style={styles.infoEmail}>✉ info@rekto.net</Text>
            </View>
          </View>

          {/* ID Section */}
          <View style={styles.sectionRow}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionHeaderTextRTL, { fontWeight: '600' }]}>{language === 'ar' ? 'الرقم' : 'ئایدی'}</Text>
            </View>
            <Text style={styles.sectionValue}>{invoiceNumber}</Text>
          </View>

          {/* Date of Ads Section */}
          <View style={styles.sectionRow}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionHeaderTextRTL, { fontWeight: '700' }]}>
                {language === 'ar' ? 'تواريخ الإعلان' : 'ڕێکەوتی ڕیکلام'}
              </Text>
            </View>
            <Text style={styles.sectionValue}>
              {formatDate(startDate)} - {formatDate(endDate)}
            </Text>
          </View>

          {/* Purple Divider with Arrow */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerArrow} />
          </View>

          {/* Summary Section - پوختە */}
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>پوختە</Text>
            
            <View style={styles.summaryItem}>
              <View style={styles.summaryItemHeader}>
                <Text style={styles.summaryItemLabelRTL}>{language === 'ar' ? 'الميزانية (USD)' : 'بودجە (USD)'}</Text>
              </View>
              <Text style={styles.summaryItemValue}>{formatUSDLatinDigitsOnly(budgetUSD)}</Text>
            </View>

            <View style={styles.summaryItem}>
              <View style={styles.summaryItemHeader}>
                <Text style={styles.summaryItemLabelRTL}>{language === 'ar' ? 'الضريبة (USD)' : 'باج (USD)'}</Text>
              </View>
              <Text style={styles.summaryItemValue}>{formatUSDLatinDigitsOnly(taxUSD)}</Text>
            </View>

            <View style={styles.summaryItem}>
              <View style={styles.summaryItemHeader}>
                <Text style={styles.summaryItemLabelRTL}>{language === 'ar' ? 'الإجمالي (USD)' : 'کۆی گشتی (USD)'}</Text>
              </View>
              <Text style={styles.summaryItemValue}>{formatUSDLatinDigitsOnly(totalUSD)}</Text>
            </View>

            <View style={styles.summaryItem}>
              <View style={styles.summaryItemHeader}>
                <Text style={styles.summaryItemLabelRTL}>{language === 'ar' ? 'الإجمالي (دينار)' : 'کۆی گشتی (دینار)'}</Text>
              </View>
              <Text style={styles.summaryItemValue}>{formatIQDEnglish(totalIQD)}</Text>
            </View>

            <View style={styles.summaryItem}>
              <View style={styles.summaryItemHeader}>
                <Text style={styles.summaryItemLabelRTL}>{language === 'ar' ? 'المبلغ المدفوع' : 'کۆی گشتی دراو'}</Text>
              </View>
              <Text style={[styles.summaryItemValue, styles.summaryItemValuePaid]}>
                {formatIQDEnglish(totalIQD)}
              </Text>
            </View>
          </View>

          {/* Purple Divider with Arrow */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerArrow} />
          </View>

          {/* Payment Info Section - زانیاری پارەدان */}
          <View style={styles.paymentSection}>
            <Text style={styles.paymentTitle}>زانیاری پارەدان</Text>
            
            <View style={styles.paymentItem}>
              <View style={styles.paymentItemHeader}>
                <Text style={styles.paymentItemLabelRTL}>
                  {language === 'ar' ? 'طريقة الدفع: ' : 'ڕێگەی پارەدان: '}
                  {paymentMethodLabel}
                </Text>
              </View>
            </View>

            <View style={styles.paymentItem}>
              <View style={styles.paymentItemHeader}>
                <Text style={styles.paymentItemLabelRTL}>{language === 'ar' ? 'رقم الفاتورة' : 'ژمارەی پسوولە'}</Text>
              </View>
              <Text style={styles.paymentItemValue}>{invoiceNumber}</Text>
            </View>
          </View>

          {/* Purple Divider with Arrow */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerArrow} />
          </View>

          {/* Ad Name Section */}
          <View style={styles.adNameSection}>
            <View style={styles.adNameHeader}>
              <Text style={styles.adNameLabelRTL}>{language === 'ar' ? 'اسم الإعلان' : 'ناوی ڕیکلام'}</Text>
            </View>
            <Text style={styles.adNameValue}>{campaign.title}</Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, styles.textRTL]}>
              © {new Date().getFullYear()} Rekto — {language === 'ar' ? 'إعلانات تيك توك' : 'ڕیکلامی تیکتۆک'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default Invoice;

const createStyles = (colors: any, insets: any, isRTL: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  errorCard: {
    width: '100%',
    borderRadius: 20,
    padding: spacing.lg,
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: colors.foreground.muted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  errorButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary.foreground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingStart: spacing.md,
    paddingEnd: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.card.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  headerRTL: {
    flexDirection: 'row',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  backButtonWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  backButtonLabel: {
    fontSize: 16,
    color: colors.foreground.DEFAULT,
    fontWeight: '500',
  },
  headerSpacer: {
    width: 40,
    minWidth: 40,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.foreground.DEFAULT,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    flex: 1,
    textAlign: 'center',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingStart: 8,
    paddingEnd: 8,
    paddingVertical: 6,
  },
  exportText: {
    fontSize: 12,
    color: colors.foreground.DEFAULT,
  },
  scrollContent: {
    flex: 1,
  },
  invoiceCard: {
    backgroundColor: colors.card.background,
    borderRadius: 20,
    margin: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logoHeader: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  logoImage: {
    height: 36,
    width: 140,
    marginBottom: spacing.sm,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
    marginBottom: spacing.sm,
  },
  logoSubtitle: {
    fontSize: 12,
    color: colors.foreground.muted,
    textAlign: 'center',
  },
  logoSubtitleBold: {
    fontWeight: '600',
    color: colors.primary.DEFAULT,
  },
  infoRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  infoColumn: {
    flex: 1,
  },
  infoColumnRight: {
    alignItems: 'flex-end',
  },
  infoLabel: {
    fontSize: 14,
    color: colors.foreground.muted,
  },
  infoValue: {
    color: colors.primary.DEFAULT,
    fontWeight: '500',
  },
  infoValueBold: {
    color: colors.primary.DEFAULT,
    fontWeight: '700',
  },
  infoEmail: {
    fontSize: 12,
    color: colors.foreground.muted,
    marginTop: spacing.xs,
  },
  sectionRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.foreground.DEFAULT,
  },
  sectionHeaderTextBold: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
  },
  sectionHeaderTextRTL: {
    fontSize: 14,
    color: colors.foreground.muted,
  },
  sectionValue: {
    fontSize: 14,
    color: colors.foreground.DEFAULT,
    fontFamily: 'monospace',
    textAlign: 'right',
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
  },
  dividerContainer: {
    position: 'relative',
    marginVertical: spacing.md,
  },
  dividerLine: {
    height: 4,
    backgroundColor: colors.primary.DEFAULT,
  },
  dividerArrow: {
    position: 'absolute',
    start: '50%',
    top: 4,
    marginStart: -10,
    width: 0,
    height: 0,
    borderStartWidth: 10,
    borderEndWidth: 10,
    borderTopWidth: 10,
    borderStartColor: 'transparent',
    borderEndColor: 'transparent',
    borderTopColor: colors.primary.DEFAULT,
  },
  summarySection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
    textAlign: 'right',
    marginBottom: spacing.md,
  },
  summaryItem: {
    marginBottom: spacing.md,
  },
  summaryItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryItemLabel: {
    fontSize: 14,
    color: colors.foreground.DEFAULT,
  },
  summaryItemLabelRTL: {
    fontSize: 14,
    color: colors.foreground.muted,
  },
  summaryItemValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    textAlign: 'right',
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
  },
  summaryItemValuePaid: {
    color: colors.success,
  },
  paymentSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  paymentTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
    textAlign: 'right',
    marginBottom: spacing.md,
  },
  paymentItem: {
    marginBottom: spacing.md,
  },
  paymentItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  paymentItemLabel: {
    fontSize: 14,
    color: colors.foreground.DEFAULT,
  },
  paymentItemLabelRTL: {
    fontSize: 14,
    color: colors.foreground.muted,
  },
  paymentItemValue: {
    fontSize: 14,
    color: colors.foreground.DEFAULT,
    fontFamily: 'monospace',
    textAlign: 'right',
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
  },
  adNameSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  adNameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.sm,
  },
  adNameLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary.DEFAULT,
  },
  adNameLabelRTL: {
    fontSize: 14,
    color: colors.foreground.muted,
  },
  adNameValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
  },
  footer: {
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: colors.foreground.muted,
  },
});
