import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Download } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabaseRead } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius } from '@/theme/spacing';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { calculateTax, USD_TO_IQD_RATE } from '@/lib/pricing';
import { Text } from '@/components/common/Text';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export function Invoice() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const { colors } = useTheme();
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
        <ScreenHeader title={t('invoiceTitle') || 'Invoice'} onBack={() => navigation.goBack()} style={{ paddingTop: insets.top + 16 }} />
      </View>
    );
  }

  if (!campaign && !loading) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Invoice not found</Text>
      </View>
    );
  }

  // Calculate totals - use real_budget > target_spend > total_budget
  const budgetUSD = Number(campaign.real_budget) || Number(campaign.target_spend) || Number(campaign.total_budget) || 0;
  
  // Calculate tax using centralized pricing module
  const taxUSD = calculateTax(budgetUSD);
  
  // Total = Budget + Tax (tax is ADDED, not included)
  const totalUSD = budgetUSD + taxUSD;
  
  // Convert to IQD with floor (no rounding up)
  const totalIQD = Math.floor(totalUSD * USD_TO_IQD_RATE);
  
  const amountPaid = transaction ? Math.abs(Number(transaction.amount)) : totalUSD;
  const paymentMethod = campaign.payment_method_used || transaction?.payment_method || 'FIB';
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

  const formatDate = (dateString: string) => {
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return '';
    return format(parsed, 'dd/MM/yyyy');
  };

  const handleExportPdf = async () => {
    if (exporting || !campaign) return;
    setExporting(true);
    try {
      const logoSource = Image.resolveAssetSource(require('../../../assets/images/logo.png'));
      const logoUri = logoSource?.uri ? encodeURI(logoSource.uri) : '';
      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: Arial, sans-serif; background: ${colors.background.DEFAULT}; color: ${colors.foreground.DEFAULT}; margin: 0; padding: 20px; }
              .card { border: 1px solid ${colors.border.DEFAULT}; border-radius: 20px; overflow: hidden; }
              .logoHeader { text-align: center; padding: 20px 20px 12px; }
              .logo { height: 36px; width: 140px; object-fit: contain; }
              .logoSubtitle { font-size: 12px; color: ${colors.foreground.muted}; margin-top: 8px; }
              .logoSubtitleBold { color: ${colors.primary.DEFAULT}; font-weight: 600; }
              .infoRow { display: flex; justify-content: space-between; padding: 12px 20px; }
              .infoLabel { font-size: 14px; color: ${colors.foreground.muted}; }
              .infoValue { color: ${colors.primary.DEFAULT}; font-weight: 600; }
              .infoValueBold { color: ${colors.primary.DEFAULT}; font-weight: 700; }
              .infoEmail { font-size: 12px; color: ${colors.foreground.muted}; margin-top: 4px; }
              .sectionRow { padding: 12px 20px; }
              .sectionHeader { display: flex; justify-content: space-between; margin-bottom: 6px; }
              .sectionHeaderText { font-size: 14px; font-weight: 500; }
              .sectionHeaderTextBold { font-size: 14px; font-weight: 700; }
              .sectionHeaderTextRTL { font-size: 12px; color: ${colors.primary.DEFAULT}; }
              .sectionValue { font-size: 14px; color: ${colors.foreground.DEFAULT}; }
              .divider { height: 2px; background: ${colors.primary.DEFAULT}; margin: 8px 20px; position: relative; }
              .divider:after { content: ''; position: absolute; left: 50%; transform: translateX(-50%) rotate(45deg); width: 8px; height: 8px; background: ${colors.primary.DEFAULT}; top: -3px; }
              .summarySection, .paymentSection, .adNameSection { padding: 12px 20px; }
              .summaryTitle, .paymentTitle { font-size: 14px; font-weight: 700; color: ${colors.primary.DEFAULT}; margin-bottom: 8px; text-align: right; }
              .summaryItem { display: flex; justify-content: space-between; margin-bottom: 8px; }
              .summaryItemLabel { font-size: 14px; color: ${colors.foreground.muted}; }
              .summaryItemLabelRTL { font-size: 12px; color: #7C3AED; text-align: right; }
              .summaryItemValue { font-size: 14px; font-weight: 700; color: #0A0A0F; }
              .summaryItemValuePaid { color: #16A34A; }
              .paymentItem { margin-bottom: 8px; }
              .paymentItemLabel { font-size: 14px; color: #71717A; }
              .paymentItemLabelRTL { font-size: 12px; color: #7C3AED; text-align: right; }
              .paymentItemValue { font-size: 14px; font-weight: 700; color: #0A0A0F; }
              .adNameLabel { font-size: 14px; color: #71717A; }
              .adNameLabelRTL { font-size: 12px; color: #7C3AED; }
              .adNameValue { font-size: 14px; font-weight: 700; color: #0A0A0F; margin-top: 6px; }
              .footer { text-align: center; padding: 12px 20px 16px; font-size: 12px; color: #71717A; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="logoHeader">
                ${logoUri ? `<img class="logo" src="${logoUri}" />` : `<div style="font-size:24px;font-weight:700;color:#7C3AED">Rekto</div>`}
                <div class="logoSubtitle">Grow your business with <span class="logoSubtitleBold">Rekto</span></div>
              </div>

              <div class="infoRow">
                <div>
                  <div class="infoLabel">To: <span class="infoValue">${profile?.full_name || 'Customer'}</span></div>
                  ${customerContact ? `<div class="infoEmail">✉ ${customerContact}</div>` : ''}
                </div>
                <div style="text-align:right;">
                  <div class="infoLabel">From: <span class="infoValueBold">Rekto</span></div>
                  <div class="infoEmail">✉ info@rekto.net</div>
                </div>
              </div>

              <div class="sectionRow">
                <div class="sectionHeader">
                  <div class="sectionHeaderText">ID</div>
                  <div class="sectionHeaderTextRTL">ئایدی</div>
                </div>
                <div class="sectionValue">${invoiceNumber}</div>
              </div>

              <div class="sectionRow">
                <div class="sectionHeader">
                  <div class="sectionHeaderTextBold">Date of ads</div>
                  <div class="sectionHeaderTextRTL">ڕێکەوت</div>
                </div>
                <div class="sectionValue">${formatDate(startDate)} - ${formatDate(endDate)}</div>
              </div>

              <div class="divider"></div>

              <div class="summarySection">
                <div class="summaryTitle">پوختە</div>
                <div class="summaryItem">
                  <div>
                    <div class="summaryItemLabel">Budget $</div>
                    <div class="summaryItemLabelRTL">بودجە</div>
                  </div>
                  <div class="summaryItemValue">$${budgetUSD.toFixed(2)}</div>
                </div>
                <div class="summaryItem">
                  <div>
                    <div class="summaryItemLabel">Tax $</div>
                    <div class="summaryItemLabelRTL">باج</div>
                  </div>
                  <div class="summaryItemValue">$${taxUSD.toFixed(2)}</div>
                </div>
                <div class="summaryItem">
                  <div>
                    <div class="summaryItemLabel">Total $</div>
                    <div class="summaryItemLabelRTL">کۆی گشتی</div>
                  </div>
                  <div class="summaryItemValue">$${totalUSD.toFixed(2)}</div>
                </div>
                <div class="summaryItem">
                  <div>
                    <div class="summaryItemLabel">Total IQD</div>
                    <div class="summaryItemLabelRTL">کۆی گشتی (دینار)</div>
                  </div>
                  <div class="summaryItemValue">${totalIQD.toLocaleString()} IQD</div>
                </div>
                <div class="summaryItem">
                  <div>
                    <div class="summaryItemLabel">Total amount paid</div>
                    <div class="summaryItemLabelRTL">کۆی گشتی دراو</div>
                  </div>
                  <div class="summaryItemValue summaryItemValuePaid">${totalIQD.toLocaleString()} IQD</div>
                </div>
              </div>

              <div class="divider"></div>

              <div class="paymentSection">
                <div class="paymentTitle">زانیاری پارەدان</div>
                <div class="paymentItem">
                  <div class="paymentItemLabel">Which paid (${paymentMethod})</div>
                  <div class="paymentItemLabelRTL">ڕێگەی پارەدان</div>
                </div>
                <div class="paymentItem">
                  <div class="paymentItemLabel">Number of invoice</div>
                  <div class="paymentItemLabelRTL">ژ.م پسوولە</div>
                  <div class="paymentItemValue">${invoiceNumber}</div>
                </div>
              </div>

              <div class="divider"></div>

              <div class="adNameSection">
                <div class="adNameLabel">Ad name</div>
                <div class="adNameLabelRTL">ناوی سپۆنسەر</div>
                <div class="adNameValue">${campaign.title}</div>
              </div>

              <div class="footer">© ${new Date().getFullYear()} Rekto - TikTok Advertising Platform</div>
            </div>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      console.error('Failed to export invoice:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('invoiceTitle') || 'Invoice'}
        onBack={() => navigation.goBack()}
        style={{ paddingTop: insets.top + 16 }}
        rightElement={
          <TouchableOpacity onPress={handleExportPdf} style={[styles.exportButton, isRTL && styles.rowReverse]} disabled={exporting} activeOpacity={0.8}>
            <Download size={18} color={colors.foreground.DEFAULT} />
            <Text style={[styles.exportText, isRTL && styles.textRTL]} numberOfLines={1}>{exporting ? (t('loading') || 'Loading') : 'Export'}</Text>
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
            <Text style={styles.logoSubtitle}>
              {isRTL ? 'بازرگانەیەکەت بەرەو پێش ببە لەگەڵ ' : 'Grow your business with '}
              <Text style={styles.logoSubtitleBold}>Rekto</Text>
            </Text>
          </View>

          {/* Customer & Rekto Info - Two Columns */}
          <View style={styles.infoRow}>
            <View style={styles.infoColumn}>
              <Text style={styles.infoLabel}>
                {isRTL ? 'بۆ :' : 'To:'} <Text style={styles.infoValue}>{profile?.full_name || 'Customer'}</Text>
              </Text>
              {!!customerContact && <Text style={styles.infoEmail}>✉ {customerContact}</Text>}
            </View>
            <View style={[styles.infoColumn, styles.infoColumnRight]}>
              <Text style={styles.infoLabel}>
                {isRTL ? 'لە لایەن:' : 'From:'} <Text style={styles.infoValueBold}>Rekto</Text>
              </Text>
              <Text style={styles.infoEmail}>✉ info@rekto.net</Text>
            </View>
          </View>

          {/* ID Section */}
          <View style={styles.sectionRow}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>ID</Text>
              <Text style={styles.sectionHeaderTextRTL}>ئایدی</Text>
            </View>
            <Text style={styles.sectionValue}>{invoiceNumber}</Text>
          </View>

          {/* Date of Ads Section */}
          <View style={styles.sectionRow}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderTextBold}>Date of ads</Text>
              <Text style={styles.sectionHeaderTextRTL}>ڕێکەوت</Text>
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
                <Text style={styles.summaryItemLabel}>Budget $</Text>
                <Text style={styles.summaryItemLabelRTL}>بودجە</Text>
              </View>
              <Text style={styles.summaryItemValue}>${budgetUSD.toFixed(2)}</Text>
            </View>

            <View style={styles.summaryItem}>
              <View style={styles.summaryItemHeader}>
                <Text style={styles.summaryItemLabel}>Tax $</Text>
                <Text style={styles.summaryItemLabelRTL}>باج</Text>
              </View>
              <Text style={styles.summaryItemValue}>${taxUSD.toFixed(2)}</Text>
            </View>

            <View style={styles.summaryItem}>
              <View style={styles.summaryItemHeader}>
                <Text style={styles.summaryItemLabel}>Total $</Text>
                <Text style={styles.summaryItemLabelRTL}>کۆی گشتی</Text>
              </View>
              <Text style={styles.summaryItemValue}>${totalUSD.toFixed(2)}</Text>
            </View>

            <View style={styles.summaryItem}>
              <View style={styles.summaryItemHeader}>
                <Text style={styles.summaryItemLabel}>Total IQD</Text>
                <Text style={styles.summaryItemLabelRTL}>کۆی گشتی (دینار)</Text>
              </View>
              <Text style={styles.summaryItemValue}>{totalIQD.toLocaleString()} IQD</Text>
            </View>

            <View style={styles.summaryItem}>
              <View style={styles.summaryItemHeader}>
                <Text style={styles.summaryItemLabel}>Total amount paid</Text>
                <Text style={styles.summaryItemLabelRTL}>کۆی گشتی دراو</Text>
              </View>
              <Text style={[styles.summaryItemValue, styles.summaryItemValuePaid]}>
                {totalIQD.toLocaleString()} IQD
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
                <Text style={styles.paymentItemLabel}>Which paid ({paymentMethod})</Text>
                <Text style={styles.paymentItemLabelRTL}>ڕێگەی پارەدان</Text>
              </View>
            </View>

            <View style={styles.paymentItem}>
              <View style={styles.paymentItemHeader}>
                <Text style={styles.paymentItemLabel}>Number of invoice</Text>
                <Text style={styles.paymentItemLabelRTL}>ژ.م پسوولە</Text>
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
              <Text style={styles.adNameLabel}>Ad name</Text>
              <Text style={styles.adNameLabelRTL}>ناوی سپۆنسەر</Text>
            </View>
            <Text style={styles.adNameValue}>{campaign.title}</Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © {new Date().getFullYear()} Rekto - TikTok Advertising Platform
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

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
    backgroundColor: colors.card.background,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
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
  rowReverse: {
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
    color: '#0A0A0F',
    fontWeight: '500',
  },
  headerSpacer: {
    width: 40,
    minWidth: 40,
  },
  backButtonText: {
    fontSize: 16,
    color: '#0A0A0F',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A0A0F',
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
    color: '#0A0A0F',
  },
  scrollContent: {
    flex: 1,
  },
  invoiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    margin: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    color: '#7C3AED',
    marginBottom: spacing.sm,
  },
  logoSubtitle: {
    fontSize: 12,
    color: '#71717A',
    textAlign: 'center',
  },
  logoSubtitleBold: {
    fontWeight: '600',
    color: '#7C3AED',
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
    color: '#71717A',
  },
  infoValue: {
    color: '#7C3AED',
    fontWeight: '500',
  },
  infoValueBold: {
    color: '#7C3AED',
    fontWeight: '700',
  },
  infoEmail: {
    fontSize: 12,
    color: '#71717A',
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
    color: '#0A0A0F',
  },
  sectionHeaderTextBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0A0A0F',
  },
  sectionHeaderTextRTL: {
    fontSize: 14,
    color: '#71717A',
  },
  sectionValue: {
    fontSize: 14,
    color: '#0A0A0F',
    fontFamily: 'monospace',
  },
  dividerContainer: {
    position: 'relative',
    marginVertical: spacing.md,
  },
  dividerLine: {
    height: 4,
    backgroundColor: '#7C3AED',
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
    borderTopColor: '#7C3AED',
  },
  summarySection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#7C3AED',
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
    marginBottom: spacing.xs,
  },
  summaryItemLabel: {
    fontSize: 14,
    color: '#0A0A0F',
  },
  summaryItemLabelRTL: {
    fontSize: 14,
    color: '#71717A',
  },
  summaryItemValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A0A0F',
  },
  summaryItemValuePaid: {
    color: '#22C55E',
  },
  paymentSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  paymentTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#7C3AED',
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
    marginBottom: spacing.xs,
  },
  paymentItemLabel: {
    fontSize: 14,
    color: '#0A0A0F',
  },
  paymentItemLabelRTL: {
    fontSize: 14,
    color: '#71717A',
  },
  paymentItemValue: {
    fontSize: 14,
    color: '#0A0A0F',
    fontFamily: 'monospace',
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
    color: '#7C3AED',
  },
  adNameLabelRTL: {
    fontSize: 14,
    color: '#71717A',
  },
  adNameValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7C3AED',
  },
  footer: {
    backgroundColor: '#F9FAFB',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#71717A',
  },
});
