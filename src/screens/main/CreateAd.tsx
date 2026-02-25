import { BudgetSlider } from '@/components/common/BudgetSlider';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase, supabaseRead } from '@/integrations/supabase/client';
import { borderRadius, spacing } from '@/theme/spacing';
import { getFontFamily, getSemiBoldStyle, getTypographyStyles } from '@/theme/typography';
import { getFontFamilyWithWeight } from '@/utils/fonts';
import { toast } from '@/utils/toast';
import Slider from '@react-native-community/slider';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, Calendar, Check, CheckCircle2, ChevronDown, ChevronUp, Clock, Eye, Info, Link2, MessageCircle, PhoneCall, Rocket, Tag, Target, X, Zap } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// @ts-ignore - DateTimePicker types may not be perfect
import { Text } from '@/components/common/Text';
import { useAppSettingsRealtime } from '@/hooks/useAppSettingsRealtime';
import { getCached } from '@/services/globalCache';
import { AppliedDiscount, PricingBreakdown, PricingSettings } from '@/types/pricing';
import { formatIQD, formatUSDEnglish } from '@/utils/currency';
import { isRTL, ltrNumber, rtlIcon, rtlInput, rtlText } from '@/utils/rtl';
import DateTimePicker from '@react-native-community/datetimepicker';

const ageRanges = [
  { label: '13-17', min: 13, max: 17 },
  { label: '18-24', min: 18, max: 24 },
  { label: '25-34', min: 25, max: 34 },
  { label: '35-44', min: 35, max: 44 },
  { label: '45-54', min: 45, max: 54 },
  { label: '55+', min: 55, max: 65 },
  { label: 'All', min: 13, max: 65 },
];

const campaignObjectives = [
  { 
    id: 'conversions', 
    title: 'Contacts & Messages', 
    titleKu: 'پەیوەندی و نامە',
    icon: MessageCircle,
    description: 'Get more contacts and messages from potential customers'
  },
  { 
    id: 'views', 
    title: 'View',
    titleKu: 'بینەر',
    icon: Eye,
    description: 'Maximize video plays and engagement'
  },
  {
    id: 'lead_generation',
    title: 'Contacts & Messages',  // SAME title as conversions - don't mention "lead generation" to users!
    titleKu: 'پەیوەندی و نامە',
    icon: PhoneCall, // Use PhoneCall icon from lucide - this differentiates it from conversions
    description: 'Collect leads for your business through your website'
  },
];

const interactiveAddons = {
  kurdish: '7595385565516778503',
  arab: '7595384921008557064',
  all: '7596080758583593992',
};

export function CreateAd() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { settings: config, refetch: refetchConfig } = useRemoteConfig();
  const { t, language } = useLanguage();
  const rtl = isRTL(language);
  const { colors } = useTheme();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const fontFamily = getFontFamily(language as 'ckb' | 'ar');
  const semiBoldStyle = getSemiBoldStyle(language as 'ckb' | 'ar');
  const styles = createStyles(colors, insets, typography, fontFamily, semiBoldStyle, rtl, language as 'ckb' | 'ar');
  
  // Get route params for prefill (using snake_case to match database fields)
  // Boost Again prefill interface - includes video_url and destination_url for pre-filling
  interface BoostAgainPrefill {
    objective?: string;
    target_age_min?: number;
    target_age_max?: number;
    target_gender?: 'all' | 'male' | 'female';
    target_audience?: 'all' | 'arab' | 'kurdish';
    daily_budget?: number;
    duration_days?: number;
    call_to_action?: string;
    video_url?: string; // Video code for pre-filling
    destination_url?: string | null; // Destination URL for extracting share_code
  }

  type RouteParams = {
    prefill?: BoostAgainPrefill;
    promo?: {
      target_budget: number;
      display_price_iqd: number;
      active: boolean;
    };
    campaignId?: string; // Legacy support
    duplicate?: boolean; // Legacy support
  };
  const routeParams = route.params as RouteParams | undefined;
  const prefill = routeParams?.prefill;
  const promo = routeParams?.promo;
  const duplicateCampaignId = routeParams?.campaignId; // Legacy support

  // Show disabled state if ad creation is disabled
  const isDisabled = config && !config.features?.ad_creation_enabled;

  // Get objective settings with defaults
  const objectiveSettings = config?.objectives ?? {
    conversions_enabled: true,
    views_enabled: true,
    lead_generation_enabled: true,
  };

  // Filter objectives based on what owner has enabled
  const availableObjectives = campaignObjectives.filter(obj => {
    if (obj.id === 'conversions') return objectiveSettings.conversions_enabled;
    if (obj.id === 'views') return objectiveSettings.views_enabled;
    if (obj.id === 'lead_generation') return objectiveSettings.lead_generation_enabled;
    return true;
  });

  // Form state - initialize with prefill if available (using snake_case from prefill)
  const [objective, setObjective] = useState(prefill?.objective || '');
  const [targetAudience, setTargetAudience] = useState<'' | 'all' | 'arab' | 'kurdish'>(prefill?.target_audience as '' | 'all' | 'arab' | 'kurdish' || '');
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<string[]>([]);
  const [gender, setGender] = useState<'' | 'all' | 'male' | 'female'>(prefill?.target_gender as '' | 'all' | 'male' | 'female' || '');
  const [tenDollarAdsEnabled, setTenDollarAdsEnabled] = useState(cachedPricing?.ten_dollar_ads_enabled ?? true);
  const [dailyBudget, setDailyBudget] = useState(prefill?.daily_budget || 20); // Default to 20, will be updated when settings load
  const [duration, setDuration] = useState(prefill?.duration_days || 1);
  const [startNow, setStartNow] = useState(true);
  const [campaignName, setCampaignName] = useState('');
  const [tiktokCode, setTiktokCode] = useState((prefill as any)?.video_url || ''); // Prefill from Boost Again if available
  const [loading, setLoading] = useState(false);
  const [showTotalDetails, setShowTotalDetails] = useState(false);
  const cachedUserLinks = getCached<Array<{ id: string; title: string; slug: string; share_code: string | null; url?: string | null }>>('user_links', []);
  const [destinationLinks, setDestinationLinks] = useState<Array<{ id: string; title: string; slug: string; share_code: string | null; url?: string | null }>>(cachedUserLinks);
  const [destinationLoading, setDestinationLoading] = useState(false);
  const [selectedShareCode, setSelectedShareCode] = useState<string>('');
  const [isCheckoutExpanded, setIsCheckoutExpanded] = useState(false);
  const [showLinkDropdown, setShowLinkDropdown] = useState(false);
  
  // Date/Time scheduling state
  const [scheduledDate, setScheduledDate] = useState<Date>(() => {
    const now = new Date();
    // Default to 15 minutes from now
    const defaultTime = new Date(now.getTime() + 15 * 60 * 1000);
    return defaultTime;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Pricing settings and discount code state
  const cachedSettings = getCached<any>('app_settings', null);
  const cachedPricing = cachedSettings?.value?.pricing || cachedSettings?.pricing || null;
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>({
    exchange_rate: cachedPricing?.exchange_rate ?? 1450,
    tax_percentage: 0,
    ten_dollar_ads_enabled: cachedPricing?.ten_dollar_ads_enabled ?? true
  });
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  // Default tax table
  const DEFAULT_TAX_TABLE: Record<number, number> = {
    10: 3.3, 20: 5.4, 30: 8.1, 40: 8.4, 50: 10.5,
    60: 12.6, 70: 14.7, 80: 16.8, 90: 18.9, 100: 21
  };

  const DEFAULT_PRICING = {
    exchange_rate: 1450,
    ten_dollar_ads_enabled: true,
    tax_table: DEFAULT_TAX_TABLE
  };

  // Realtime: refresh app settings + update pricing immediately
  useAppSettingsRealtime({
    enabled: true,
    onUpdate: (payload) => {
      const newSettings = (payload?.new as any)?.value;
      if (newSettings?.pricing) {
        setPricingSettings((prev) => ({
          ...prev,
          exchange_rate: newSettings.pricing.exchange_rate ?? prev.exchange_rate,
          ten_dollar_ads_enabled:
            newSettings.pricing.ten_dollar_ads_enabled ?? prev.ten_dollar_ads_enabled,
          tax_table: newSettings.pricing.tax_table ?? (prev as any).tax_table,
          tax_percentage: newSettings.pricing.tax_percentage ?? prev.tax_percentage,
        }));
      }
      // Refresh remote config so objectives/features update instantly
      refetchConfig();
    },
  });

  // Budget values arrays
  const BUDGET_VALUES = [10, 20, ...Array.from({ length: 80 }, (_, i) => 21 + i)]; // 10, 20, 21...100
  
  // Filter based on toggle - check for explicit false
  const availableBudgets = pricingSettings.ten_dollar_ads_enabled === false
    ? BUDGET_VALUES.filter(v => v !== 10)
    : BUDGET_VALUES;

  // Fetch pricing settings and discount toggle on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Fetch from app-settings edge function
        const { data } = await supabase.functions.invoke('app-settings', {
          body: { action: 'get', key: 'global' }
        });

        if (data?.settings?.value) {
          const savedPricing = data.settings.value.pricing || {};
          
          // Merge with defaults
          const mergedPricing = {
            exchange_rate: savedPricing.exchange_rate ?? DEFAULT_PRICING.exchange_rate,
            ten_dollar_ads_enabled: savedPricing.ten_dollar_ads_enabled ?? DEFAULT_PRICING.ten_dollar_ads_enabled,
            tax_table: savedPricing.tax_table ?? DEFAULT_PRICING.tax_table,
          };
          
          setPricingSettings({
            exchange_rate: mergedPricing.exchange_rate,
            tax_percentage: 0, // Tax is calculated from tax_table, not percentage
            ten_dollar_ads_enabled: mergedPricing.ten_dollar_ads_enabled,
            tax_table: mergedPricing.tax_table
          });
          
          setTenDollarAdsEnabled(mergedPricing.ten_dollar_ads_enabled);
          
          // CRITICAL: Explicit false check for budget adjustment
          if (savedPricing.ten_dollar_ads_enabled === false) {
            setDailyBudget(prev => prev === 10 ? 20 : prev);
          }
          
          // Clear discount if system is disabled
          const discountEnabled = data.settings.value.discount?.discount_enabled ?? false;
          if (!discountEnabled) {
            setAppliedDiscount(null);
            setDiscountCode('');
          }
        }
      } catch (error) {
        console.error('Failed to fetch pricing settings:', error);
        // Use defaults on error
        setPricingSettings({
          exchange_rate: DEFAULT_PRICING.exchange_rate,
          tax_percentage: 0,
          ten_dollar_ads_enabled: DEFAULT_PRICING.ten_dollar_ads_enabled,
          tax_table: DEFAULT_PRICING.tax_table
        });
      }
    };
    fetchSettings();
  }, []);

  // Real-time subscription for app_settings changes (pricing, promo, etc.)
  useAppSettingsRealtime({
    enabled: true,
    settingsKey: 'global',
    onUpdate: async (payload) => {
      console.log('[CreateAd] Real-time app_settings update received:', payload);
      const newValue = (payload.new as any)?.value;
      
      if (newValue) {
        // Update pricing settings if changed
        if (newValue.pricing) {
          const mergedPricing = {
            ...DEFAULT_PRICING,
            ...newValue.pricing
          };
          
          setPricingSettings({
            exchange_rate: mergedPricing.exchange_rate,
            tax_percentage: 0,
            ten_dollar_ads_enabled: mergedPricing.ten_dollar_ads_enabled,
            tax_table: mergedPricing.tax_table
          });
          
          setTenDollarAdsEnabled(mergedPricing.ten_dollar_ads_enabled);
          
          // Adjust budget if $10 ads disabled
          if (mergedPricing.ten_dollar_ads_enabled === false && dailyBudget === 10) {
            setDailyBudget(20);
          }
        }
        
        // Clear discount if system disabled
        if (newValue.discount?.discount_enabled === false) {
          setAppliedDiscount(null);
          setDiscountCode('');
        }
      }
    },
  });

  // Watch for discount system changes in real-time and clear discount if disabled
  useEffect(() => {
    if (config?.discount?.discount_enabled === false) {
      setAppliedDiscount(null);
      setDiscountCode('');
    }
  }, [config?.discount?.discount_enabled]);

  // Discount code validation function
  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    
    setIsValidatingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('owner-content', {
        body: { 
          action: 'validateDiscountCode', 
          code: discountCode.trim().toUpperCase(),
          budget: dailyBudget * duration  // Send current budget for range validation
        }
      });
      
      if (error) {
        console.error('Discount validation error:', error);
        toast.error(t('error'), t('couldNotValidateCode'));
        setIsValidatingCode(false);
        return;
      }
      
      console.log('Discount response:', JSON.stringify({ data, error }));
      
      setIsValidatingCode(false);
      
      if (data?.valid) {
        setAppliedDiscount({
          code: discountCode.trim().toUpperCase(),
          type: data.discount_type, // 'percentage' | 'fixed'
          value: data.discount_value
        });
        toast.success(t('discountApplied'), data.discount_type === 'percentage' ? t('discountPercentOff', { value: data.discount_value }) : t('discountAmountOff', { amount: formatUSDEnglish(data.discount_value) }));
      } else {
        // Show the EXACT error from backend
        toast.error(t('invalidCode'), data?.error || t('invalidDiscountCode'));
        setAppliedDiscount(null);
      }
    } catch (err: any) {
      setIsValidatingCode(false);
      console.error('Discount validation exception:', err);
      toast.error(t('error'), t('checkConnectionAndTryAgain'));
    }
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
  };

  // Calculate tax dynamically using pricingSettings.tax_table
  const calculateDynamicTax = (budget: number, taxTable: Record<number, number>): number => {
    // 1. Check fixed table first
    if (taxTable[budget] !== undefined) {
      return taxTable[budget];
    }
    
    // 2. For $10 or below: 33%
    if (budget <= 10) {
      return Number((budget * 0.33).toFixed(1));
    }
    
    // 3. Between $11-$20: 27%
    if (budget < 20) {
      return Number((budget * 0.27).toFixed(1));
    }
    
    // 4. Above $20: Linear ($5.4 base + $0.30 per dollar above $20)
    return Number((5.4 + (budget - 20) * 0.3).toFixed(1));
  };

  // Check if promo applies to selected budget
  const isPromoActive = promo?.active && promo.target_budget === dailyBudget;

  // Updated pricing calculation with PROMO support and DYNAMIC TAX TABLE
  const calculatePricing = (): PricingBreakdown => {
    // PROMO: Direct IQD × duration (multi-day support)
    if (isPromoActive && promo) {
      const totalIQD = promo.display_price_iqd * duration;
      return {
        baseTotal: dailyBudget * duration,
        discountAmount: 0,
        taxAmount: 0,
        totalUSD: dailyBudget * duration, // Base budget for database
        totalIQD, // Promo price
      };
    }

    // STANDARD: (budget × duration × exchangeRate) + tax
    const totalBudget = dailyBudget * duration;
    const taxTable = pricingSettings.tax_table || DEFAULT_TAX_TABLE;
    
    // Apply discount FIRST (before tax)
    let discountAmount = 0;
    if (appliedDiscount) {
      discountAmount = appliedDiscount.type === 'percentage'
        ? totalBudget * (appliedDiscount.value / 100)
        : Math.min(appliedDiscount.value, totalBudget); // Cap at budget
    }
    
    const finalBudget = totalBudget - discountAmount;
    
    // CRITICAL: Calculate tax on the discounted budget
    const taxAmount = calculateDynamicTax(finalBudget, taxTable);
    const totalUSD = finalBudget + taxAmount;
    const totalIQD = Math.floor(totalUSD * pricingSettings.exchange_rate);
    
    return { baseTotal: totalBudget, discountAmount, taxAmount, totalUSD, totalIQD };
  };

  // Pricing calculations using new function
  const pricing = calculatePricing();

  // Clear all form fields so when user comes back they see a fresh form
  const resetCreateAdForm = React.useCallback(() => {
    setObjective('');
    setTargetAudience('');
    setSelectedAgeRanges([]);
    setGender('');
    setDailyBudget(20);
    setDuration(1);
    setStartNow(true);
    setCampaignName('');
    setTiktokCode('');
    setSelectedShareCode('');
    setShowTotalDetails(false);
    setIsCheckoutExpanded(false);
    setShowLinkDropdown(false);
    setDiscountCode('');
    setAppliedDiscount(null);
    const now = new Date();
    setScheduledDate(new Date(now.getTime() + 15 * 60 * 1000));
    setShowDatePicker(false);
    setShowTimePicker(false);
  }, []);

  // Hide tab bar when this screen is focused
  useFocusEffect(
    React.useCallback(() => {
      // Hide tab bar
      const parent = navigation.getParent();
      if (parent) {
        parent.setOptions({
          tabBarStyle: { display: 'none', height: 0 },
        });
      }

      // Show tab bar when screen loses focus
      return () => {
        if (parent) {
          parent.setOptions({
            tabBarStyle: undefined, // Reset to default
          });
        }
      };
    }, [navigation])
  );

  // When user leaves Create Ad (back to main, another tab, or any screen): clear form and params
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        resetCreateAdForm();
        navigation.setParams({
          prefill: undefined,
          promo: undefined,
          campaignId: undefined,
          duplicate: undefined,
        } as Partial<RouteParams>);
      };
    }, [navigation, resetCreateAdForm])
  );

  // Load campaign data for duplication (legacy support)
  useEffect(() => {
    const loadCampaignForDuplication = async () => {
      if (!duplicateCampaignId || !user) return;

      try {
        const { data: campaignData, error } = await supabaseRead
          .from('campaigns')
          .select('*')
          .eq('id', duplicateCampaignId)
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        if (!campaignData) return;

        // Pre-fill all form fields (including video code)
        setObjective(campaignData.objective || '');
        setCampaignName(campaignData.title || '');
        setTiktokCode((campaignData as any).video_url || ''); // ✅ Autofill video code
        setDailyBudget(campaignData.daily_budget || 20);
        setDuration(campaignData.duration_days || 1);
        setTargetAudience((campaignData.target_audience as 'all' | 'arab' | 'kurdish') || 'all');
        setGender((campaignData.target_gender as 'all' | 'male' | 'female') || 'all');

        // Pre-fill age ranges
        if (campaignData.target_age_min && campaignData.target_age_max) {
          // If all ages (13-65), select "All"
          if (campaignData.target_age_min === 13 && campaignData.target_age_max === 65) {
            setSelectedAgeRanges(['All']);
          } else {
            // Find matching age ranges that overlap with the target range
            const ageRangesToSelect: string[] = [];
            ageRanges.forEach(range => {
              // Check if range overlaps with target range
              if (range.label !== 'All' && 
                  range.min <= campaignData.target_age_max! && 
                  range.max >= campaignData.target_age_min!) {
                ageRangesToSelect.push(range.label);
              }
            });
            setSelectedAgeRanges(ageRangesToSelect.length > 0 ? ageRangesToSelect : ['All']);
          }
        } else {
          setSelectedAgeRanges(['All']); // Default to all ages
        }

        // Pre-fill destination link if conversions objective
        if (campaignData.objective === 'conversions' && campaignData.destination_url) {
          // Extract share_code from destination_url (format: https://link.rekto.net/c/{share_code})
          const shareCodeMatch = campaignData.destination_url.match(/\/c\/([^\/]+)/);
          if (shareCodeMatch && shareCodeMatch[1]) {
            setSelectedShareCode(shareCodeMatch[1]);
          }
        }
      } catch (err: any) {
        console.error('Failed to load campaign for duplication:', err);
        toast.error(t('error'), t('failedToLoadCampaign'));
      }
    };

    loadCampaignForDuplication();
  }, [duplicateCampaignId, user]);

  // Handle prefill params (new method)
  // Apply prefill on mount (Boost Again feature)
  useEffect(() => {
    if (!prefill) return;

    console.log('[CreateAd] Applying prefill from Boost Again:', prefill);

    // Apply prefill to form state
    if (prefill.objective) setObjective(prefill.objective);
    if (prefill.daily_budget) setDailyBudget(prefill.daily_budget);
    if (prefill.duration_days) setDuration(prefill.duration_days);
    if (prefill.target_audience) setTargetAudience(prefill.target_audience);
    if (prefill.target_gender) setGender(prefill.target_gender);
    if (prefill.call_to_action) {
      // Note: call_to_action is handled in the form, but we can set it if needed
    }

    // Map database age ranges to UI multi-select format
    if (prefill.target_age_min !== undefined && prefill.target_age_max !== undefined) {
      const minAge = prefill.target_age_min;
      const maxAge = prefill.target_age_max;

      // Check if "All" ages (13-65)
      if (minAge <= 13 && maxAge >= 65) {
        setSelectedAgeRanges(['All']);
      } else {
        // Find matching age range labels that fit within the min/max range
        const matchingRanges = ageRanges
          .filter(r => r.label !== 'All' && r.min >= minAge && r.max <= maxAge)
          .map(r => r.label);
        setSelectedAgeRanges(matchingRanges.length > 0 ? matchingRanges : ['All']);
      }
    } else {
      setSelectedAgeRanges(['All']); // Default to all ages
    }

    // Prefill video code (video_url) from Boost Again
    if (prefill.video_url) {
      setTiktokCode(prefill.video_url);
    }

    // Prefill destination link (extract share_code from destination_url)
    if (prefill.destination_url) {
      const match = prefill.destination_url.match(/\/c\/([^\/]+)/);
      if (match && match[1]) {
        setSelectedShareCode(match[1]);
      }
    }
  }, [prefill]);

  const loadDestinationLinks = React.useCallback(async () => {
    if (!user) return;
    try {
      setDestinationLoading(true);
      const { data, error } = await supabaseRead
        .from('user_links')
        .select('id, title, slug, share_code, url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDestinationLinks(data || []);
    } catch (err: any) {
      console.error('Failed to load destination links:', err);
      toast.error(t('error'), t('failedToLoadDestinationLinks'));
    } finally {
      setDestinationLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    loadDestinationLinks();
  }, [loadDestinationLinks]);

  // Refresh data from backend every time user enters Create Ad (e.g. after creating a link)
  useFocusEffect(
    React.useCallback(() => {
      loadDestinationLinks();
    }, [loadDestinationLinks])
  );


  const formatReach = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const isDestinationRequired = objective === 'conversions' || objective === 'lead_generation';
  const shouldShowDestination = objective === 'conversions' || objective === 'lead_generation';

  useEffect(() => {
    if (objective && !isDestinationRequired && selectedShareCode) {
      setSelectedShareCode('');
    }
  }, [objective, isDestinationRequired, selectedShareCode]);

  // Estimated reach calculation based on objective, budget, and duration
  // Uses EXACT ranges from web implementation
  const calculateEstimatedReach = () => {
    const budget = dailyBudget; // Use daily budget for lookup
    const days = duration;
    
    if (objective === 'views') {
      // VIDEO VIEWS - Exact lookup table
      const viewsTable: Record<string, { min: number; max: number }> = {
        '10-1': { min: 33600, max: 80000 },
        '10-2': { min: 67200, max: 160000 },
        '20-1': { min: 67200, max: 160000 },
        '20-2': { min: 120960, max: 320000 },
        '30-1': { min: 100800, max: 240000 },
        '30-2': { min: 181440, max: 480000 },
        '40-1': { min: 134400, max: 320000 },
        '40-2': { min: 241920, max: 640000 },
        '50-1': { min: 168000, max: 400000 },
        '50-2': { min: 302400, max: 800000 },
        '60-1': { min: 201600, max: 480000 },
        '60-2': { min: 362880, max: 960000 },
        '70-1': { min: 235200, max: 560000 },
        '70-2': { min: 423360, max: 1120000 },
        '80-1': { min: 268800, max: 640000 },
        '80-2': { min: 483840, max: 1280000 },
        '90-1': { min: 302400, max: 720000 },
        '90-2': { min: 544320, max: 1440000 },
        '100-1': { min: 268000, max: 800000 },
        '100-2': { min: 483000, max: 1600000 },
      };
      
      const key = `${budget}-${days}`;
      if (viewsTable[key]) {
        return { type: 'views' as const, ...viewsTable[key] };
      }
      
      // Proportional scale for other combinations
      const baseMin = 33600;
      const baseMax = 80000;
      const budgetMultiplier = budget / 10;
      const minViews = Math.round(baseMin * budgetMultiplier * days);
      const maxViews = Math.round(baseMax * budgetMultiplier * days);
      
      return { type: 'views' as const, min: minViews, max: maxViews };
    } else if (objective === 'conversions' || objective === 'lead_generation') {
      // WEBSITE CONVERSIONS - Exact lookup table
      const conversionsTable: Record<string, { min: number; max: number }> = {
        '10-1': { min: 24628, max: 72000 },
        '10-2': { min: 49000, max: 144000 },
        '10-3': { min: 73920, max: 210010 },
        '10-4': { min: 88702, max: 288009 },
        '10-5': { min: 110000, max: 360000 },
        '10-6': { min: 132000, max: 432000 },
        '10-7': { min: 154000, max: 504000 },
        '20-1': { min: 49000, max: 144000 },
        '20-2': { min: 88000, max: 288000 },
        '20-3': { min: 118270, max: 432010 },
        '20-4': { min: 157690, max: 576000 },
        '20-5': { min: 197000, max: 720000 },
        '20-6': { min: 236000, max: 864000 },
        '20-7': { min: 275000, max: 1008000 },
        '30-1': { min: 73500, max: 216000 },
        '30-2': { min: 132000, max: 432000 },
        '30-3': { min: 177405, max: 648015 },
        '30-4': { min: 236535, max: 864000 },
        '40-1': { min: 98000, max: 288000 },
        '40-2': { min: 176000, max: 576000 },
        '50-1': { min: 122500, max: 360000 },
        '50-2': { min: 220000, max: 720000 },
        '100-1': { min: 246280, max: 720000 },
        '100-2': { min: 490000, max: 1440000 },
        '100-3': { min: 739200, max: 2100100 },
        '100-4': { min: 887020, max: 2880090 },
      };
      
      const key = `${budget}-${days}`;
      if (conversionsTable[key]) {
        return { type: 'conversions' as const, ...conversionsTable[key] };
      }
      
      // Proportional scale for other combinations
      const baseMin = 24628;
      const baseMax = 72000;
      const budgetMultiplier = budget / 10;
      const dayMultiplier = days;
      const minClicks = Math.round(baseMin * budgetMultiplier * dayMultiplier);
      const maxClicks = Math.round(baseMax * budgetMultiplier * dayMultiplier);
      
      return { type: 'conversions' as const, min: minClicks, max: maxClicks };
    }
    
    return null;
  };

  const estimatedReach = objective ? calculateEstimatedReach() : null;

  const isValidTikTokCode = (code: string): boolean => {
    const trimmed = code.trim();
    if (!trimmed || !trimmed.startsWith('#') || trimmed.length < 20) return false;
    return /^#[a-zA-Z0-9+/=]+$/.test(trimmed);
  };

  // Calculate minimum allowed date/time (15 minutes from now)
  const getMinDateTime = (): Date => {
    const now = new Date();
    return new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes ahead
  };

  // Calculate maximum allowed date (7 days from today)
  const getMaxDate = (): Date => {
    const now = new Date();
    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + 7);
    maxDate.setHours(23, 59, 59, 999); // End of day
    return maxDate;
  };

  // Validate scheduled date/time
  const validateScheduledTime = (): boolean => {
    if (startNow) return true; // No validation needed for "start now"
    
    const now = new Date();
    const minTime = getMinDateTime();
    const maxDate = getMaxDate();
    
    // Check if selected time is at least 15 minutes ahead
    if (scheduledDate < minTime) {
      toast.warning(t('invalidTime'), t('selectAtLeast15MinutesFromNow'));
      return false;
    }
    
    // Check if selected date is within 7 days
    if (scheduledDate > maxDate) {
      toast.warning(t('invalidDate'), t('dateMustBeWithin7Days'));
      return false;
    }
    
    return true;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    // On Android, always close the picker after selection
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    // Handle the selection
    if (event.type === 'set' && selectedDate) {
      // Preserve the time when changing date
      const newDate = new Date(selectedDate);
      newDate.setHours(scheduledDate.getHours(), scheduledDate.getMinutes(), 0, 0);
      
      // If date is today, ensure time is at least 15 minutes ahead
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const selectedDay = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
      
      if (selectedDay.getTime() === today.getTime()) {
        const minTime = getMinDateTime();
        if (newDate < minTime) {
          // If selected time is too early, set to minimum time
          setScheduledDate(minTime);
          toast.info(t('timeAdjusted'), t('minimumStartTimeApplied'));
        } else {
          setScheduledDate(newDate);
        }
      } else {
        // Future date, time can be any time
        setScheduledDate(newDate);
      }
    } else if (event.type === 'dismissed') {
      // User cancelled
      setShowDatePicker(false);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    // On Android, always close the picker after selection
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    // Handle the selection
    if (event.type === 'set' && selectedTime) {
      const newDate = new Date(scheduledDate);
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      
      // Validate: must be at least 15 minutes ahead if today
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const selectedDay = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
      
      if (selectedDay.getTime() === today.getTime()) {
        // Selected date is today - must be at least 15 minutes ahead
        const minTime = getMinDateTime();
        if (newDate < minTime) {
          toast.warning(t('invalidTime'), t('selectAtLeast15MinutesFromNow'));
          setScheduledDate(minTime);
        } else {
          setScheduledDate(newDate);
        }
      } else {
        // Future date, any time is fine
        setScheduledDate(newDate);
      }
    } else if (event.type === 'dismissed') {
      // User cancelled
      setShowTimePicker(false);
    }
  };

  const formatDateTime = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const validateForm = (): boolean => {
    if (!objective) {
      toast.warning(t('required'), t('pleaseSelectObjective'));
      return false;
    }
    if (!targetAudience) {
      toast.warning(t('required'), t('pleaseSelectAudience'));
      return false;
    }
    if (selectedAgeRanges.length === 0) {
      toast.warning(t('required'), t('pleaseSelectAgeRange'));
      return false;
    }
    if (!gender) {
      toast.warning(t('required'), t('pleaseSelectGender'));
      return false;
    }
    // Handle both conversions and lead_generation - both need destination URL
    const needsDestinationUrl = (objective === 'conversions' || objective === 'lead_generation');
    if (needsDestinationUrl && !selectedShareCode) {
      toast.warning(t('required'), t('pleaseSelectDestinationLink'));
      return false;
    }
    if (!campaignName.trim()) {
      toast.warning(t('required'), t('pleaseEnterCampaignName'));
      return false;
    }
    if (!isValidTikTokCode(tiktokCode)) {
      toast.warning(t('required'), t('pleaseEnterValidTikTokCode'));
      return false;
    }
    if (!validateScheduledTime()) {
      return false;
    }
    return true;
  };

  // Form validation check (no balance check!)
  const isFormValid = 
    objective !== '' && 
    campaignName.trim() !== '' && 
    tiktokCode.trim() !== '' && 
    targetAudience !== '' && 
    gender !== '' && 
    selectedAgeRanges.length > 0 &&
    ((objective !== 'conversions' && objective !== 'lead_generation') || selectedShareCode !== '') &&
    isValidTikTokCode(tiktokCode);

  const handleSubmit = async () => {
    if (!user) return;
    if (!validateForm()) return;

    setLoading(true);
    try {
      // CRITICAL: When "All" is selected, send 13-65 (includes 13-17)
      // The backend now includes AGE_13_17 in TikTok API
      let minAge = 13;
      let maxAge = 65;
      
      if (selectedAgeRanges.includes('All')) {
        // "All" means 13-65 (includes 13-17)
        minAge = 13;
        maxAge = 65;
      } else {
        // Calculate from selected ranges
        const selectedRanges = ageRanges.filter(r => selectedAgeRanges.includes(r.label));
        if (selectedRanges.length > 0) {
          minAge = Math.min(...selectedRanges.map(r => r.min));
          maxAge = Math.max(...selectedRanges.map(r => r.max));
        }
      }

      // CRITICAL: Map target audience to TikTok-compatible language codes
      // TikTok does NOT support 'ckb' - must use 'en' + 'tr' for Kurdish
      const getTargetLanguagesForAudience = (
        audience: '' | 'all' | 'arab' | 'kurdish'
      ): string[] | null => {
        if (audience === 'all') {
          // ALL audience: Arabic + Turkish + English
          return ['ar', 'tr', 'en'];
        }
        if (audience === 'kurdish') {
          // Kurdish audience: English + Turkish (TikTok has no Kurdish option)
          return ['en', 'tr'];
        }
        // Arab audience or empty: no language restriction (null = all)
        return null;
      };

      const targetLanguages = getTargetLanguagesForAudience(targetAudience);

      // Handle both conversions and lead_generation - both need interactive addons and destination URL
      const needsAddons = (objective === 'conversions' || objective === 'lead_generation');
      const interactiveAddonId = needsAddons && targetAudience ? interactiveAddons[targetAudience] : null;
      const scheduledStartTime = startNow ? null : scheduledDate.toISOString();

      // Use share_code to build destination URL (required for conversions/lead_generation, optional for views)
      const needsDestinationUrl = (objective === 'conversions' || objective === 'lead_generation');
      const destinationUrl = needsDestinationUrl && selectedShareCode
        ? `https://link.rekto.net/c/${selectedShareCode}`
        : null;

      // Calculate pricing with discount (for UI display only)
      const pricing = calculatePricing();
      
      // CRITICAL: Base budget is what user selected - this is what goes to database
      // Tax is platform revenue, NOT ad spend - only for UI display
      const baseBudget = dailyBudget * duration; // User's selection (no tax)

      // CRITICAL: For lead_generation objective, send exactly "lead_generation" to database
      // This objective requires: destination_url (mandatory), call_to_action (mandatory), interactive_addon_id (optional)
      // Treat it exactly like 'conversions' in terms of UI behavior and validation
      const { data: campaignData, error } = await supabase.from('campaigns').insert({
        user_id: user.id,
        title: campaignName.trim(),
        video_url: tiktokCode.trim(),
        objective, // Will be 'lead_generation' when user selects "Contacts & Messages" (lead_generation)
        target_age_min: minAge,
        target_age_max: maxAge,
        target_gender: gender,
        target_countries: ['IQ'],
        target_audience: targetAudience,
        target_languages: targetLanguages,
        interactive_addon_id: interactiveAddonId, // Optional: included if targetAudience is set
        daily_budget: dailyBudget, // ✅ Base daily budget
        duration_days: duration,
        total_budget: baseBudget, // ✅ BASE ONLY (dailyBudget × duration) - no tax
        target_spend: baseBudget, // ✅ BASE ONLY - no tax
        daily_target_spend: dailyBudget, // ✅ BASE ONLY
        destination_url: destinationUrl, // Mandatory for lead_generation (validated above)
        call_to_action: (objective === 'conversions' || objective === 'lead_generation') ? 'CONTACT_US' : null, // Mandatory for lead_generation
        caption: '',
        status: 'waiting_for_admin',
        sandbox_mode: true,
        started_at: scheduledStartTime,
        discount_code: appliedDiscount?.code || null,
        discount_amount: pricing.discountAmount,
        payment_amount_iqd: pricing.totalIQD.toString(), // IQD amount for payment (includes tax for payment processing)
      }).select().single();

      if (error) throw error;

      if (campaignData?.id && destinationUrl) {
        const separator = destinationUrl.includes('?') ? '&' : '?';
        const urlWithRef = `${destinationUrl}${separator}ref=${campaignData.id}`;
        await supabase
          .from('campaigns')
          .update({ destination_url: urlWithRef })
          .eq('id', campaignData.id);
      }

      // Transaction - BASE BUDGET ONLY (tax is platform revenue, not ad spend)
      await supabase.from('transactions').insert({
        user_id: user.id,
        campaign_id: campaignData.id,
        type: 'payment',
        amount: baseBudget, // ✅ BASE ONLY - no tax
        status: 'pending',
        payment_method: 'FIB',
        description: `${campaignName} campaign (pending approval)`,
      });

      // Notify owners about the new ad submission (in-app + push with user display name)
      try {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle();
        const userDisplayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const supabaseUrl = supabase.supabaseUrl;
          const supabaseKey = supabase.supabaseKey;

          await fetch(`${supabaseUrl}/functions/v1/notify-owners-new-ad`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              campaign_id: campaignData.id,
              campaign_title: campaignName.trim(),
              user_id: user.id,
              user_display_name: userDisplayName,
            }),
          });
        }
      } catch (e) {
        console.warn('Notify owners failed:', e);
        // Don't fail the submission if notification fails
      }

      toast.success(t('submitted'), t('yourCampaignSubmitted'));

      navigation.navigate('Main', { screen: 'Campaigns' });
    } catch (error: any) {
      const message = error?.message ?? error?.error ?? error?.data?.message ?? t('failedToSubmitCampaign');
      toast.error(t('error'), typeof message === 'string' ? message : t('failedToSubmitCampaign'));
    } finally {
      setLoading(false);
    }
  };

  const toggleAgeRange = (label: string) => {
    if (label === 'All') {
      setSelectedAgeRanges(['All']);
    } else {
      setSelectedAgeRanges(prev => {
        const filtered = prev.filter(r => r !== 'All');
        if (filtered.includes(label)) {
          return filtered.filter(r => r !== label);
        }
        return [...filtered, label];
      });
    }
  };

  const RequiredWarning = () => (
    <View style={[styles.requiredWarning, rtl && styles.requiredWarningRTL]}>
      <AlertTriangle size={14} color="#EF4444" />
      <Text style={[styles.requiredText, rtlText()]}>{t('required')}</Text>
    </View>
  );

  // Show disabled state if feature is disabled
  if (isDisabled) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('createAd') || 'Create Ad'} onBack={() => navigation.goBack()} style={{ paddingTop: insets.top + 16 }} />
        <View style={styles.disabledContainer}>
          <View style={styles.disabledIconContainer}>
            <AlertTriangle size={48} color={colors.foreground.muted} />
          </View>
          <Text style={[styles.disabledTitle, rtlText()]}>{t('createAdFeatureUnavailable')}</Text>
          <Text style={[styles.disabledMessage, rtlText()]}>
            {t('createAdDisabledMessage')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
    <View style={styles.container}>
      <ScreenHeader title={t('createAd') || 'Create Ad'} onBack={() => navigation.goBack()} style={{ paddingTop: insets.top + 16 }} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 200 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.scrollContentWrap, rtl && styles.scrollContentWrapRTL]}>
        {/* Prefill Banner - Show when settings are copied from previous campaign */}
        {prefill && (
          <View style={styles.prefillBanner}>
            <Rocket size={20} color="#7C3AED" />
            <Text style={[styles.prefillBannerText, rtlText()]}>
              {t('settingsCopiedFromPrevious') || 'Settings copied from previous campaign'}
            </Text>
          </View>
        )}

        {/* Choose Your Objective Section */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, rtl && styles.sectionHeaderRowReverse]}>
            <View style={[styles.titleWithRequiredRow, rtl && styles.titleWithRequiredRowRTL]}>
              <Text style={[styles.sectionTitle, styles.sectionTitleRTL, rtlText()]}>{t('createAdChooseObjective')}</Text>
              <Text style={styles.asterisk}>*</Text>
            </View>
            {!objective && <RequiredWarning />}
          </View>
          {availableObjectives.map((obj) => {
            const Icon = obj.icon;
            const isSelected = objective === obj.id;
            return (
              <TouchableOpacity
                key={obj.id}
                style={[styles.objectiveCard, isSelected && styles.objectiveCardSelected, rtl && styles.objectiveCardRowReverse]}
                onPress={() => setObjective(obj.id)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.objectiveIconContainer,
                    isSelected && styles.objectiveIconContainerSelected,
                  ]}
                >
                  <Icon
                    size={20}
                    color={isSelected ? colors.primary.foreground : colors.primary.DEFAULT}
                  />
                </View>
                <View style={styles.objectiveContent}>
                  <Text
                    style={[styles.objectiveTitle, isSelected && styles.objectiveTitleSelected, rtlText()]}
                  >
                    {obj.id === 'conversions' ? t('contactsMessages') : obj.id === 'views' ? t('view') : t('contactsMessages')}
                  </Text>
                  <Text style={[styles.objectiveDescription, rtlText()]}>
                    {obj.id === 'conversions' ? t('objectiveDescConversions') : obj.id === 'views' ? t('objectiveDescViews') : t('objectiveDescLeadGen')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.objectiveCheckContainer,
                    isSelected && styles.objectiveCheckContainerSelected,
                  ]}
                >
                  {isSelected && <Check size={16} color={colors.primary.foreground} />}
                </View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={styles.tutorialLink}
            onPress={() => navigation.navigate('Main', { screen: 'Tutorial' })}
          >
            <Text style={[styles.tutorialLinkText, rtlText()]}>{t('createAdClickHereTutorial')}</Text>
          </TouchableOpacity>
        </View>

        {/* Target Audience Section */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, rtl && styles.sectionHeaderRowReverse]}>
            <View style={[styles.titleWithRequiredRow, rtl && styles.titleWithRequiredRowRTL]}>
              <Text style={[styles.sectionTitle, styles.sectionTitleRTL, rtlText()]}>{t('targetAudience')}</Text>
              <Text style={styles.asterisk}>*</Text>
            </View>
            {!targetAudience && <RequiredWarning />}
          </View>

          {/* Region Selection */}
          <Text style={[styles.subsectionLabel, rtlText()]}>{t('createAdSelectTargetAudience')}</Text>
          <View style={[styles.buttonRow, rtl && styles.buttonRowReverse]}>
            {['all', 'arab', 'kurdish'].map((aud) => (
              <TouchableOpacity
                key={aud}
                style={[styles.regionButton, targetAudience === aud && styles.regionButtonSelected]}
                onPress={() => setTargetAudience(aud as any)}
              >
                <Text style={[styles.regionButtonText, targetAudience === aud && styles.regionButtonTextSelected, rtlText()]}>
                  {aud === 'all' ? t('createAdAllCaps') : aud === 'arab' ? t('arab') : t('kurdish')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {!targetAudience && <RequiredWarning />}

          {/* Age Range Selection */}
          <View style={[styles.titleWithRequiredRow, rtl && styles.titleWithRequiredRowRTL, { marginTop: spacing.lg }]}>
            <Text style={[styles.subsectionLabelInRow, rtlText()]}>{t('createAdAgeRange')}</Text>
            <Text style={styles.asterisk}>*</Text>
          </View>
          <Text style={[styles.hintText, rtlText()]}>
            {t('createAdAgeRangeHint')}
          </Text>
          <View style={[styles.ageGrid, rtl && styles.ageGridRTL]}>
            {ageRanges.map((range) => (
              <TouchableOpacity
                key={range.label}
                style={[
                  styles.ageButton,
                  selectedAgeRanges.includes(range.label) && styles.ageButtonSelected,
                ]}
                onPress={() => toggleAgeRange(range.label)}
              >
                <Text
                  style={[
                    styles.ageText,
                    selectedAgeRanges.includes(range.label) && styles.ageTextSelected,
                    rtlText(),
                  ]}
                >
                  {range.label === 'All' ? t('createAdAgeAll') : range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {selectedAgeRanges.length === 0 && <RequiredWarning />}

          {/* Gender Selection */}
          <View style={[styles.titleWithRequiredRow, rtl && styles.titleWithRequiredRowRTL, { marginTop: spacing.lg }]}>
            <Text style={[styles.subsectionLabelInRow, rtlText()]}>{t('gender')}</Text>
            <Text style={styles.asterisk}>*</Text>
          </View>
          <Text style={[styles.hintText, rtlText()]}>{t('createAdSelectGender')}</Text>
          <View style={[styles.buttonRow, rtl && styles.buttonRowReverse]}>
            {['all', 'male', 'female'].map((gen) => (
              <TouchableOpacity
                key={gen}
                style={[styles.regionButton, gender === gen && styles.regionButtonSelected]}
                onPress={() => setGender(gen as any)}
              >
                <Text style={[styles.regionButtonText, gender === gen && styles.regionButtonTextSelected, rtlText()]}>
                  {gen === 'all' ? t('all') : gen === 'male' ? t('male') : t('female')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {!gender && <RequiredWarning />}
        </View>

        {/* Daily Budget Section — LTR: Label left, amount right. RTL: amount right, label left (position mirror). */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            {rtl ? (
              <>
                <View style={styles.sectionHeaderValueWrap}>
                  <Text style={[styles.valueText, ltrNumber]} numberOfLines={1}>{formatUSDEnglish(dailyBudget)}/{t('day')}</Text>
                </View>
                <View style={[styles.titleWithRequiredRow, styles.sectionHeaderTitleWrap]}>
                  <Text style={[styles.sectionTitle, styles.sectionTitleRTL, rtlText()]} numberOfLines={1}>{t('createAdDailyBudget')}</Text>
                  <Text style={styles.asterisk}>*</Text>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.titleWithRequiredRow, styles.sectionHeaderTitleWrap]}>
                  <Text style={[styles.sectionTitle, styles.sectionTitleRTL, rtlText()]} numberOfLines={1}>{t('createAdDailyBudget')}</Text>
                  <Text style={styles.asterisk}>*</Text>
                </View>
                <View style={styles.sectionHeaderValueWrap}>
                  <Text style={[styles.valueText, ltrNumber]} numberOfLines={1}>{formatUSDEnglish(dailyBudget)}/{t('day')}</Text>
                </View>
              </>
            )}
          </View>
          <BudgetSlider
            value={dailyBudget}
            onChange={setDailyBudget}
            budgetValues={availableBudgets}
            tenDollarEnabled={pricingSettings.ten_dollar_ads_enabled !== false}
            isRTL={rtl}
            language={language}
          />
          <Text style={[styles.hintText, rtlText()]}>{t('createAdHowMuchPerDay')}</Text>
        </View>

        {/* Discount Code Section - After Budget Slider - Only show when enabled */}
        {config?.discount?.discount_enabled === true && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Tag size={18} color={colors.primary.DEFAULT} />
                <Text style={[styles.sectionTitle, styles.sectionTitleRTL, rtlText()]}>{t('createAdDiscountCode')}</Text>
              </View>
            </View>
            {appliedDiscount ? (
              <View style={[styles.discountBadge, { backgroundColor: '#10B98120', borderColor: '#10B981' }]}>
                <CheckCircle2 size={18} color="#10B981" />
                <Text style={[styles.discountBadgeText, ltrNumber]}>{appliedDiscount.code}</Text>
                <Text style={[styles.discountBadgeText, rtlText()]}>
                  {appliedDiscount.type === 'percentage' 
                    ? t('discountPercentOff', { value: appliedDiscount.value }) 
                    : t('discountAmountOff', { amount: formatUSDEnglish(appliedDiscount.value) })}
                </Text>
                <TouchableOpacity onPress={removeDiscount} style={styles.removeButton}>
                  <Text style={[styles.removeText, rtlText()]}>{t('createAdRemove')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.discountInputRow}>
                <TextInput
                  style={[styles.discountInput, rtlInput()]}
                  placeholder={t('createAdEnterCode')}
                  placeholderTextColor={colors.input.placeholder}
                  value={discountCode}
                  onChangeText={(val) => setDiscountCode(val.toUpperCase())}
                  autoCapitalize="characters"
                />
                <TouchableOpacity 
                  style={[styles.applyButton, (!discountCode.trim() || isValidatingCode) && styles.applyButtonDisabled]}
                  onPress={handleApplyDiscount}
                  disabled={isValidatingCode || !discountCode.trim()}
                >
                  {isValidatingCode ? (
                    <ActivityIndicator size="small" color={colors.primary.foreground} />
                  ) : (
                    <Text style={[styles.applyButtonText, rtlText()]}>{t('createAdApply')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Duration Section — LTR: Label left, amount right. RTL: amount right, label left (position mirror). */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            {rtl ? (
              <>
                <View style={styles.sectionHeaderValueWrap}>
                  <Text style={[styles.valueText, ltrNumber]} numberOfLines={1}>{duration} {t('days')}</Text>
                </View>
                <View style={[styles.titleWithRequiredRow, styles.sectionHeaderTitleWrap]}>
                  <Text style={[styles.sectionTitle, styles.sectionTitleRTL, rtlText()]} numberOfLines={1}>{t('createAdDuration')}</Text>
                  <Text style={styles.asterisk}>*</Text>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.titleWithRequiredRow, styles.sectionHeaderTitleWrap]}>
                  <Text style={[styles.sectionTitle, styles.sectionTitleRTL, rtlText()]} numberOfLines={1}>{t('createAdDuration')}</Text>
                  <Text style={styles.asterisk}>*</Text>
                </View>
                <View style={styles.sectionHeaderValueWrap}>
                  <Text style={[styles.valueText, ltrNumber]} numberOfLines={1}>{duration} {t('days')}</Text>
                </View>
              </>
            )}
          </View>
          <View style={[styles.sliderWrap, rtl && styles.sliderWrapRTL]}>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={7}
              step={1}
              value={duration}
              onValueChange={(v) => setDuration(Math.round(v))}
              minimumTrackTintColor={colors.primary.DEFAULT}
              maximumTrackTintColor={colors.border.DEFAULT}
              thumbTintColor={colors.primary.DEFAULT}
            />
          </View>
          <Text style={[styles.hintText, rtlText()]}>{t('createAdChooseDuration')}</Text>
        </View>

        {/* Schedule Start Time Section */}
        <View style={styles.scheduleCard}>
          <View style={[styles.scheduleHeader, rtl && styles.scheduleHeaderRTL]}>
            <Calendar size={20} color={colors.foreground.DEFAULT} />
            <Text style={[styles.scheduleTitle, rtlText()]}>{t('createAdScheduleStart')}</Text>
          </View>
          <Text style={[styles.hintText, rtlText()]}>{t('createAdChooseWhenStarts')}</Text>
          <View style={[styles.scheduleButtonRow, rtl && styles.scheduleButtonRowRTL]}>
            <TouchableOpacity
              style={[styles.scheduleButton, startNow && styles.scheduleButtonSelected]}
              onPress={() => setStartNow(true)}
            >
              <Zap size={20} color={startNow ? '#fff' : colors.foreground.muted} />
              <Text style={[styles.scheduleButtonText, startNow && styles.scheduleButtonTextSelected, rtlText()]}>
                {t('createAdStartNow')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scheduleButton, !startNow && styles.scheduleButtonSelected]}
              onPress={() => {
                setStartNow(false);
                // Initialize to 15 minutes from now if not already set
                const minTime = getMinDateTime();
                if (scheduledDate < minTime) {
                  setScheduledDate(minTime);
                }
              }}
            >
              <Calendar size={20} color={!startNow ? '#fff' : colors.foreground.muted} />
              <Text style={[styles.scheduleButtonText, !startNow && styles.scheduleButtonTextSelected, rtlText()]}>
                {t('createAdSchedule')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date/Time Picker (shown when schedule is selected) */}
          {!startNow && (
            <View style={styles.dateTimeContainer}>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => {
                    setShowDatePicker(true);
                    setShowTimePicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Calendar size={18} color={colors.primary.DEFAULT} />
                  <Text style={[styles.dateTimeButtonText, ltrNumber]}>
                    {scheduledDate.toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </Text>
                  <ChevronDown size={16} color={colors.foreground.muted} style={rtlIcon()} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => {
                    setShowTimePicker(true);
                    setShowDatePicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Clock size={18} color={colors.primary.DEFAULT} />
                  <Text style={[styles.dateTimeButtonText, ltrNumber]}>
                    {scheduledDate.toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </Text>
                  <ChevronDown size={16} color={colors.foreground.muted} style={rtlIcon()} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.dateTimeHint, rtlText()]}>
                ⏰ {t('createAdDateTimeHint')}
              </Text>
              
              {/* Date Picker - Shows as modal on Android, inline on iOS */}
              {showDatePicker && (
                <DateTimePicker
                  value={scheduledDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  maximumDate={getMaxDate()}
                />
              )}
              
              {/* Time Picker - Shows as modal on Android, inline on iOS */}
              {showTimePicker && (
                <DateTimePicker
                  value={scheduledDate}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                  is24Hour={true}
                  minimumDate={Platform.OS === 'android' ? getMinDateTime() : undefined}
                />
              )}
            </View>
          )}

          {startNow && (
            <View style={styles.startNowHint}>
              <Zap size={14} color={colors.foreground.muted} />
              <Text style={[styles.startNowHintText, rtlText()]}>
                {t('createAdStartNowHint')}
              </Text>
            </View>
          )}
        </View>

        {/* Campaign Summary (shown once objective selected) */}
        {objective && estimatedReach && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Target size={16} color={colors.primary.DEFAULT} />
              <Text style={[styles.summaryTitle, rtlText()]}>{t('createAdCampaignSummary')}</Text>
            </View>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <View style={styles.summaryItemHeader}>
                  <Eye size={14} color={colors.primary.DEFAULT} />
                  <Text style={[styles.summaryItemLabel, rtlText()]}>
                    {objective === 'views' ? t('createAdEstViews') : t('createAdEstReach')}
                  </Text>
                </View>
                <Text style={[styles.summaryItemValue, ltrNumber]}>
                  {formatReach(estimatedReach.min)} - {formatReach(estimatedReach.max)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <View style={styles.summaryItemHeader}>
                  <Zap size={14} color={colors.primary.DEFAULT} />
                  <Text style={[styles.summaryItemLabel, rtlText()]}>{t('createAdEstImpressions')}</Text>
                </View>
                <Text style={[styles.summaryItemValue, ltrNumber]}>
                  {formatReach(Math.round(estimatedReach.min * 1.5))} - {formatReach(Math.round(estimatedReach.max * 1.5))}
                </Text>
              </View>
              <View style={styles.summaryItemSmall}>
                <Text style={[styles.summaryItemLabelSmall, rtlText()]}>{t('objective')}</Text>
                <Text style={[styles.summaryItemValueSmall, rtlText()]}>
                  {objective === 'views' ? t('createAdSummaryViews') : t('createAdSummaryContacts')}
                </Text>
              </View>
              <View style={styles.summaryItemSmall}>
                <Text style={[styles.summaryItemLabelSmall, rtlText()]}>{t('createAdDuration')}</Text>
                <Text style={[styles.summaryItemValueSmall, rtlText()]}>
                  📅 {duration} {duration > 1 ? t('days') : t('day')}
                </Text>
              </View>
            </View>
            <View style={styles.summaryDisclaimer}>
              <Text style={[styles.disclaimerText, rtlText()]}>
                {t('createAdDisclaimer1')}
              </Text>
              <Text style={[styles.disclaimerText, rtlText()]}>
                {t('createAdDisclaimer2')}
              </Text>
              <Text style={[styles.disclaimerText, { fontWeight: '600', marginTop: 4 }, rtlText()]}>
                {t('createAdDisclaimer3')}
              </Text>
            </View>
          </View>
        )}

        {/* Destination Link Section */}
        {shouldShowDestination && (
          <View style={styles.section}>
            <View style={[styles.titleWithRequiredRow, rtl && styles.titleWithRequiredRowRTL]}>
              <Text style={[styles.sectionTitle, styles.sectionTitleRTL, rtlText()]}>{t('createAdSelectYourLink')}</Text>
              {isDestinationRequired && <Text style={styles.asterisk}>*</Text>}
            </View>
            
            {destinationLoading ? (
              <ActivityIndicator color={colors.primary.DEFAULT} style={{ marginVertical: spacing.md }} />
            ) : destinationLinks.filter(l => l.share_code).length === 0 ? (
              <View style={styles.noLinksContainer}>
                <Text style={[styles.noLinksText, rtlText()]}>
                  {t('createAdNoLinksCreateFirst')}
                </Text>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('Main', { screen: 'Links' })}
                  style={styles.goToLinksButton}
                >
                  <Text style={[styles.goToLinksText, rtlText()]}>{t('createAdGoToLinks')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => setShowLinkDropdown(true)}
                  style={styles.dropdownButton}
                  activeOpacity={0.7}
                >
                  <Link2 
                    color={selectedShareCode ? colors.primary.DEFAULT : colors.foreground.muted} 
                    size={20} 
                  />
                  <Text style={[
                    styles.dropdownText,
                    !selectedShareCode && styles.dropdownTextPlaceholder,
                    rtlText(),
                  ]}>
                    {selectedShareCode
                      ? destinationLinks.find(l => l.share_code === selectedShareCode)?.title || destinationLinks.find(l => l.share_code === selectedShareCode)?.slug || t('createAdSelected')
                      : t('createAdSelectYourLinkPlaceholder')
                    }
                  </Text>
                  <ChevronDown 
                    color={colors.foreground.muted} 
                    size={20} 
                    style={rtlIcon()}
                  />
                </TouchableOpacity>

                {/* Dropdown Modal */}
                <Modal
                  visible={showLinkDropdown}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setShowLinkDropdown(false)}
                >
                  <TouchableOpacity
                    style={styles.dropdownOverlay}
                    activeOpacity={1}
                    onPress={() => setShowLinkDropdown(false)}
                  >
                    <View style={styles.dropdownMenu}>
                      <View style={styles.dropdownHeader}>
                        <Text style={[styles.dropdownTitle, rtlText()]}>{t('createAdSelectYourLink')}</Text>
                        <TouchableOpacity
                          onPress={() => setShowLinkDropdown(false)}
                          style={styles.dropdownCloseButton}
                        >
                          <X size={20} color={colors.foreground.DEFAULT} />
                        </TouchableOpacity>
                      </View>
                      <ScrollView 
                        style={styles.dropdownScroll}
                        showsVerticalScrollIndicator={false}
                      >
                        {destinationLinks.filter(l => l.share_code).map((link) => (
                          <TouchableOpacity
                            key={link.id}
                            onPress={() => {
                              setSelectedShareCode(link.share_code!);
                              setShowLinkDropdown(false);
                            }}
                            style={[
                              styles.dropdownItem,
                              selectedShareCode === link.share_code && styles.dropdownItemSelected,
                            ]}
                            activeOpacity={0.7}
                          >
                            <Link2 
                              color={selectedShareCode === link.share_code ? colors.primary.DEFAULT : colors.foreground.muted} 
                              size={18} 
                            />
                            <View style={styles.dropdownItemInfo}>
                              <Text style={[
                                styles.dropdownItemTitle,
                                selectedShareCode === link.share_code && styles.dropdownItemTitleSelected,
                                rtlText(),
                              ]}>
                                {link.title || link.slug}
                              </Text>
                            </View>
                            {selectedShareCode === link.share_code && (
                              <Check color={colors.primary.DEFAULT} size={18} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </TouchableOpacity>
                </Modal>
              </>
            )}
            
            {isDestinationRequired && !selectedShareCode && (
              <Text style={[styles.errorText, rtlText(), rtl && { fontFamily: 'Rabar_021' }]}>⚠️ {t('createAdRequiredSelectDestination')}</Text>
            )}
          </View>
        )}

        {/* Campaign Name Section */}
        <View style={[styles.section, rtl && styles.sectionRTLAlign]}>
          <View style={[styles.titleWithAsteriskRow, rtl && styles.titleWithAsteriskRowRTL]}>
            <Text style={[styles.sectionTitleCompact, rtlText(), rtl && styles.forceRightLabel]}>{t('createAdCampaignName')}</Text>
            <Text style={styles.asterisk}>*</Text>
          </View>
          <TextInput
            style={[styles.input, rtlInput(), rtl && styles.forceRightInput]}
            value={campaignName}
            onChangeText={setCampaignName}
            placeholder={t('createAdCampaignNamePlaceholder')}
            placeholderTextColor={colors.input.placeholder}
          />
          <Text style={[styles.hintText, rtlText(), rtl && styles.forceRightHint]}>{t('createAdCampaignNameHint')}</Text>
          {!campaignName.trim() && <RequiredWarning />}
        </View>

        {/* TikTok Authorization Code Section */}
        <View style={[styles.section, rtl && styles.sectionRTLAlign]}>
          <View style={[styles.titleWithAsteriskRow, rtl && styles.titleWithAsteriskRowRTL]}>
            <Text style={[styles.sectionTitleCompact, rtlText(), rtl && styles.forceRightLabel]}>{t('createAdTikTokCode')}</Text>
            <Text style={styles.asterisk}>*</Text>
          </View>
          <TextInput
            style={[styles.input, styles.codeInput, rtlInput(), rtl && styles.forceRightInput]}
            value={tiktokCode}
            onChangeText={setTiktokCode}
            placeholder={t('createAdTikTokCodePlaceholder')}
            placeholderTextColor={colors.input.placeholder}
            multiline
          />
          <View style={[styles.infoBox, rtl && styles.infoBoxForceRTL]}>
            <AlertTriangle size={16} color={colors.warning} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoText, rtlText(), rtl && styles.forceRightHint]}>
                {t('createAdSponsorCodeNote')}
              </Text>
              <Text style={[styles.infoText, rtlText(), rtl && styles.forceRightHint]}>
                {t('createAdGetSponsorCodeTutorial')}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.tutorialButton, rtl && styles.tutorialButtonRTL]}
            onPress={() => navigation.navigate('Main', { screen: 'Tutorial' })}
          >
            <Info size={16} color={colors.primary.DEFAULT} />
            <Text style={[styles.tutorialButtonText, rtlText()]}>{t('createAdTutorialClickHere')}</Text>
          </TouchableOpacity>
          {!isValidTikTokCode(tiktokCode) && <RequiredWarning />}
        </View>
        </View>
      </ScrollView>


      {/* STICKY CHECKOUT SECTION */}
      <View style={[styles.checkoutContainer, { paddingBottom: insets.bottom + spacing.md }]}>
        {/* Expand/Collapse Toggle */}
        <TouchableOpacity
          onPress={() => setIsCheckoutExpanded(!isCheckoutExpanded)}
          style={styles.toggleButton}
          activeOpacity={0.7}
        >
          {isCheckoutExpanded ? (
            <ChevronDown size={24} color={colors.foreground.muted} style={rtlIcon()} />
          ) : (
            <ChevronUp size={24} color={colors.foreground.muted} style={rtlIcon()} />
          )}
        </TouchableOpacity>

        {/* Expandable Breakdown */}
        {isCheckoutExpanded && (
          <View style={styles.breakdownContainer}>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, rtlText()]}>{t('subtotal')}</Text>
              <Text style={[styles.breakdownValue, ltrNumber]}>{formatUSDEnglish(pricing.baseTotal)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, rtlText()]}>{t('tax')}</Text>
              <Text style={[styles.breakdownValue, ltrNumber]}>{formatUSDEnglish(pricing.taxAmount)}</Text>
            </View>
            {appliedDiscount && pricing.discountAmount > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: '#10B981' }, rtlText()]}>
                  {t('discount')} ({appliedDiscount.code})
                </Text>
                <Text style={[styles.breakdownValue, { color: '#10B981' }, ltrNumber]}>
                  -{formatUSDEnglish(pricing.discountAmount)}
                </Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.breakdownTotalRow}>
              <Text style={[styles.breakdownTotalLabel, rtlText()]}>{t('createAdTotalUSD')}</Text>
              <Text style={[styles.breakdownTotalValue, { fontWeight: '700' }, ltrNumber]}>
                {formatUSDEnglish(pricing.totalUSD)}
              </Text>
            </View>
            <View style={styles.breakdownTotalRow}>
              <Text style={[styles.breakdownTotalLabel, rtlText()]}>{t('createAdTotalIQD')}</Text>
              <Text style={[styles.breakdownTotalValue, { color: '#7C3AED', fontWeight: '700' }, ltrNumber]}>
                {formatIQD(pricing.totalIQD, rtl)}
              </Text>
            </View>
          </View>
        )}

        {/* Promo Row - Show when promo is active */}
        {isPromoActive && promo && (
          <View style={styles.promoRow}>
            <Text style={[styles.promoLabel, rtlText()]}>✨ {t('promoPricePerDay') || 'Promo price per day'}</Text>
            <Text style={[styles.promoValue, ltrNumber]}>{formatIQD(promo.display_price_iqd, rtl)}</Text>
          </View>
        )}

        {/* Always Visible: Total + Button */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <View>
              <Text style={[styles.totalLabel, rtlText()]}>
                {t('total') || 'Total'} ({duration} {duration === 1 ? t('day') || 'day' : t('days')})
              </Text>
              {!isPromoActive && (
                <Text style={[styles.totalUsd, rtlText()]}>{t('totalUsdDisplay', { amount: formatUSDEnglish(pricing.totalUSD) })}</Text>
              )}
            </View>
            <Text style={[styles.totalIqd, ltrNumber]}>
              {formatIQD(pricing.totalIQD, rtl)} ({t('currencyDinar')})
            </Text>
          </View>

          {/* Promo Badge */}
          {isPromoActive && (
            <View style={styles.promoBadge}>
              <Text style={[styles.promoBadgeText, rtlText()]}>✨ {t('specialOfferApplied') || 'Special Offer Applied'}</Text>
            </View>
          )}

          {/* Launch Button - NO BALANCE CHECK */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || !isFormValid}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#7C3AED', '#6D28D9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.launchButton,
                (loading || !isFormValid) && styles.buttonDisabled,
              ]}
            >
              {loading ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text style={[styles.buttonText, rtlText()]}>{t('createAdSubmitting')}</Text>
                </View>
              ) : (
                <Text style={[styles.buttonText, rtlText()]}>
                  {t('payAndLaunch')} {formatIQD(pricing.totalIQD, rtl)} ({t('currencyDinar')})
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any, insets: any, typography: any, fontFamily: string, semiBoldStyle: any, rtl?: boolean, language?: 'ckb' | 'ar') => {
  const rowDir = 'row';
  const lang = language ?? 'ckb';
  const fontMedium = getFontFamilyWithWeight(lang, 'medium');
  const fontBold = getFontFamilyWithWeight(lang, 'bold');
  const fontSemibold = getFontFamilyWithWeight(lang, 'semiBold');
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  header: {
    paddingTop: insets.top + spacing.md,
    flexDirection: rowDir,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.card.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  backButtonWrap: {
    flexDirection: rowDir,
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
    padding: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  backButtonLabel: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  rowReverse: {
    flexDirection: 'row',
  },
  headerSpacer: {
    width: 40,
    minWidth: 40,
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  prefillBanner: {
    flexDirection: rowDir,
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    borderRadius: 12,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  prefillBannerText: {
    fontFamily: fontMedium,
    fontSize: 14,
    color: '#7C3AED',
  },
  headerTitle: {
    ...typography.h3,
    ...semiBoldStyle,
    color: colors.foreground.DEFAULT,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContentWrap: {
    paddingStart: (insets?.left ?? 0) + spacing.md,
    paddingEnd: (insets?.right ?? 0) + spacing.md,
    width: '100%',
    paddingTop: 8,
  },
  scrollContentWrapRTL: {},
  section: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    marginBottom: 24,
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'stretch',
  },
  sectionRTLAlign: {
    alignItems: 'flex-end',
  },
  sectionHeader: {
    flexDirection: rowDir,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionHeaderRowReverse: {
    flexDirection: 'row',
  },
  sectionHeaderRow: {
    flexDirection: rowDir,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.md,
    width: '100%',
  },
  /** Wraps the amount/value (e.g. $20/day) to add clear gap from RTL label so text doesn't blend. */
  sectionHeaderValueWrap: {
    flexShrink: 0,
    marginStart: rtl ? spacing.md : 0,
    marginEnd: rtl ? 0 : spacing.md,
  },
  /** Wraps title+asterisk; allow shrink so long CKB/AR text wraps inside safe area. */
  sectionHeaderTitleWrap: {
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '85%',
  },
  sectionTitle: {
    ...typography.h3,
    ...semiBoldStyle,
    fontSize: 16,
    color: colors.foreground.DEFAULT,
  },
  sectionTitleRTL: {},
  /** Position only. Title + asterisk stay close (no width:100% on title); row aligns start/end per RTL. */
  titleWithRequiredRow: {
    flexDirection: rowDir,
    alignItems: 'center',
    gap: 6,
    width: '100%',
    justifyContent: 'flex-start',
  },
  titleWithRequiredRowRTL: {},
  asterisk: {
    color: '#EF4444',
  },
  valueText: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
    includeFontPadding: false,
  },
  /** Label — RTL; full width so text sits on right when used alone (e.g. "Select target audience region"). */
  subsectionLabel: {
    ...typography.label,
    fontFamily,
    color: colors.foreground.DEFAULT,
    marginBottom: 8,
    width: '100%',
    maxWidth: '100%',
  },
  /** Label in row with asterisk (Age, Gender) — no width so asterisk stays close. */
  subsectionLabelInRow: {
    ...typography.label,
    fontFamily,
    color: colors.foreground.DEFAULT,
    marginBottom: 8,
  },
  /** Section title when alone on line (Campaign Name, TikTok Code) — full width so title sits on right in CKB/AR. */
  sectionTitleStandalone: {
    ...typography.h3,
    ...semiBoldStyle,
    fontSize: 16,
    color: colors.foreground.DEFAULT,
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    textAlign: 'left',
    writingDirection: 'rtl',
    marginBottom: spacing.sm,
  },
  sectionTitleCompact: {
    ...typography.h3,
    ...semiBoldStyle,
    fontSize: 16,
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.sm,
  },
  titleWithAsteriskRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
  },
  titleWithAsteriskRowRTL: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  forceRightLabel: {
    maxWidth: '92%',
    flexShrink: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  hintText: {
    ...typography.caption,
    fontFamily,
    color: colors.foreground.muted,
    marginTop: 6,
    marginBottom: 4,
    width: '100%',
    maxWidth: '100%',
  },
  forceRightHint: {
    width: '100%',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  objectiveCard: {
    flexDirection: rowDir,
    alignItems: 'center',
    backgroundColor: colors.card.background,
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.sm,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  objectiveCardSelected: {
    borderColor: colors.primary.DEFAULT,
    borderWidth: 2,
    backgroundColor: colors.background.secondary,
  },
  objectiveCardRowReverse: {
    flexDirection: 'row',
  },
  objectiveIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
  },
  objectiveIconContainerSelected: {
    backgroundColor: colors.primary.DEFAULT,
  },
  objectiveContent: {
    flex: 1,
  },
  objectiveTitle: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.xs,
    includeFontPadding: false,
  },
  objectiveTitleSelected: {
    color: colors.primary.DEFAULT,
  },
  objectiveDescription: {
    ...typography.bodySmall,
    fontFamily,
    color: colors.foreground.muted,
  },
  objectiveCheckContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  objectiveCheckContainerSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.DEFAULT,
  },
  tutorialLink: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  tutorialLinkText: {
    fontSize: 14,
    color: colors.primary.DEFAULT,
    textDecorationLine: 'underline',
  },
  buttonRow: {
    flexDirection: rowDir,
    justifyContent: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  buttonRowReverse: {
    flexDirection: 'row',
  },
  regionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.button,
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regionButtonSelected: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  regionButtonText: {
    ...typography.label,
    fontFamily,
    color: colors.foreground.DEFAULT,
  },
  regionButtonTextSelected: {
    ...semiBoldStyle,
    color: '#fff',
  },
  ageGrid: {
    flexDirection: rowDir,
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  ageGridRTL: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  ageButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.button,
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  ageButtonSelected: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  ageText: {
    ...typography.label,
    fontFamily,
    color: colors.foreground.DEFAULT,
  },
  ageTextSelected: {
    ...semiBoldStyle,
    color: '#fff',
  },
  sliderWrap: {
    width: '100%',
  },
  sliderWrapRTL: {
    transform: [{ scaleX: rtl ? -1 : 1 }],
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: spacing.xs,
  },
  sliderLabels: {
    flexDirection: rowDir,
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: spacing.sm,
  },
  sliderLabel: {
    fontSize: 12,
    fontFamily,
    color: colors.foreground.muted,
  },
  scheduleCard: {
    backgroundColor: colors.background.secondary,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  scheduleHeader: {
    flexDirection: rowDir,
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  scheduleHeaderRTL: {
    flexDirection: 'row',
  },
  scheduleTitle: {
    ...typography.h3,
    ...semiBoldStyle,
    fontSize: 16,
    color: colors.foreground.DEFAULT,
  },
  scheduleButtonRow: {
    flexDirection: rowDir,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  scheduleButtonRowRTL: {
    flexDirection: 'row',
  },
  scheduleButton: {
    flex: 1,
    flexDirection: rowDir,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  scheduleButtonSelected: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  scheduleButtonText: {
    ...typography.label,
    fontFamily,
    color: colors.foreground.muted,
  },
  scheduleButtonTextSelected: {
    ...semiBoldStyle,
    color: '#fff',
  },
  startNowHint: {
    flexDirection: rowDir,
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  startNowHintText: {
    ...typography.caption,
    fontFamily,
    color: colors.foreground.muted,
  },
  dateTimeContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  dateTimeRow: {
    flexDirection: rowDir,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: rowDir,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    minHeight: 48,
  },
  dateTimeButtonText: {
    ...typography.label,
    ...semiBoldStyle,
    fontFamily,
    color: colors.foreground.DEFAULT,
  },
  dateTimeHint: {
    ...typography.caption,
    fontFamily,
    fontSize: 11,
    color: colors.foreground.muted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  summaryCard: {
    backgroundColor: colors.card.background,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  summaryHeader: {
    flexDirection: rowDir,
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryTitle: {
    ...typography.h3,
    ...semiBoldStyle,
    fontSize: 14,
    color: colors.foreground.DEFAULT,
  },
  summaryGrid: {
    flexDirection: rowDir,
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
    padding: spacing.md,
    borderRadius: borderRadius.card,
  },
  summaryItemHeader: {
    flexDirection: rowDir,
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  summaryItemLabel: {
    ...typography.caption,
    fontFamily,
    fontSize: 11,
    color: colors.foreground.muted,
  },
  summaryItemValue: {
    fontFamily,
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    includeFontPadding: false,
  },
  summaryItemSmall: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.card,
  },
  summaryItemLabelSmall: {
    ...typography.caption,
    fontFamily,
    fontSize: 11,
    color: colors.foreground.muted,
  },
  summaryItemValueSmall: {
    ...typography.h3,
    ...semiBoldStyle,
    fontFamily,
    fontSize: 14,
    color: colors.foreground.DEFAULT,
    marginTop: spacing.xs,
  },
  summaryDisclaimer: {
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  disclaimerText: {
    ...typography.caption,
    fontFamily,
    fontSize: 11,
    color: 'rgba(124, 58, 237, 0.8)',
  },
  input: {
    width: '100%',
    minHeight: 48,
    backgroundColor: colors.input.background ?? '#F5F5F5',
    borderWidth: 1,
    borderColor: colors.input.border ?? '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily,
    color: colors.foreground.DEFAULT,
    marginTop: 0,
    includeFontPadding: false,
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  forceRightInput: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  inputRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  codeInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  infoBox: {
    flexDirection: rowDir,
    backgroundColor: colors.status.scheduled.bg,
    padding: spacing.md,
    borderRadius: borderRadius.card,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  infoBoxRTL: {
    flexDirection: 'row',
  },
  infoBoxForceRTL: {
    flexDirection: 'row-reverse',
  },
  infoContent: {
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    color: colors.foreground.DEFAULT,
    lineHeight: 20,
    width: '100%',
    maxWidth: '100%',
  },
  tutorialButton: {
    flexDirection: rowDir,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  tutorialButtonRTL: {
    flexDirection: 'row',
  },
  tutorialButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
  },
  requiredWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    flexShrink: 1,
    minWidth: 0,
    width: '100%',
  },
  requiredWarningRTL: {
    flexDirection: 'row-reverse',
  },
  requiredText: {
    ...typography.caption,
    ...semiBoldStyle,
    fontSize: 12,
    color: '#EF4444',
    flexShrink: 1,
  },
  // Checkout Styles
  checkoutContainer: {
    position: 'absolute',
    bottom: 0,
    start: 0,
    end: 0,
    backgroundColor: colors.background.DEFAULT,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    paddingStart: (insets?.left ?? 0) + spacing.md,
    paddingEnd: (insets?.right ?? 0) + spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: -spacing.xs,
  },
  breakdownContainer: {
    paddingBottom: spacing.md,
  },
  breakdownRow: {
    flexDirection: rowDir,
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  breakdownLabel: {
    ...typography.bodySmall,
    fontFamily,
    color: '#A1A1AA', // Muted text color
    fontSize: 14,
  },
  breakdownValue: {
    ...typography.label,
    fontFamily,
    color: colors.foreground.DEFAULT,
    fontSize: 14,
  },
  breakdownTotalRow: {
    flexDirection: rowDir,
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  breakdownTotalLabel: {
    ...typography.label,
    fontFamily,
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
  },
  breakdownTotalValue: {
    ...typography.h3,
    fontFamily,
    fontSize: 18,
    fontWeight: '700',
    color: '#7C3AED', // Purple primary color
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.DEFAULT,
    marginVertical: spacing.sm,
  },
  totalSection: {
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  totalRow: {
    flexDirection: rowDir,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRowRTL: {
    flexDirection: 'row',
  },
  totalLabel: {
    ...typography.h3,
    ...semiBoldStyle,
    fontSize: 16,
    color: colors.foreground.DEFAULT,
  },
  totalUsd: {
    ...typography.caption,
    fontFamily,
    color: colors.foreground.muted,
    marginTop: spacing.xs / 2,
  },
  promoRow: {
    flexDirection: rowDir,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: borderRadius.card,
    marginBottom: spacing.sm,
  },
  promoLabel: {
    fontFamily: fontMedium,
    fontSize: 14,
    color: '#7C3AED',
  },
  promoValue: {
    fontFamily: fontBold,
    fontSize: 16,
    color: '#7C3AED',
  },
  promoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#10B981',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    marginTop: spacing.sm,
  },
  promoBadgeText: {
    fontFamily: fontSemibold,
    fontSize: 12,
    color: colors.primary.foreground,
  },
  totalIqd: {
    fontFamily,
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
    includeFontPadding: false,
  },
  launchButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary.foreground,
    includeFontPadding: false,
  },
  buttonContent: {
    flexDirection: rowDir,
    alignItems: 'center',
    gap: spacing.sm,
  },
  dropdownButton: {
    flexDirection: rowDir,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    padding: spacing.md,
    marginTop: spacing.sm,
    minHeight: 56,
  },
  dropdownText: {
    flex: 1,
    ...typography.label,
    fontFamily,
    color: colors.foreground.DEFAULT,
  },
  dropdownTextPlaceholder: {
    color: colors.foreground.muted,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  dropdownMenu: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: rowDir,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  dropdownTitle: {
    ...typography.h3,
    ...semiBoldStyle,
    fontSize: 16,
    color: colors.foreground.DEFAULT,
  },
  dropdownCloseButton: {
    padding: spacing.xs,
  },
  dropdownScroll: {
    maxHeight: 400,
  },
  dropdownItem: {
    flexDirection: rowDir,
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  dropdownItemSelected: {
    backgroundColor: colors.primary.DEFAULT,
  },
  dropdownItemInfo: {
    flex: 1,
  },
  dropdownItemTitle: {
    ...typography.label,
    fontFamily,
    color: colors.foreground.DEFAULT,
  },
  dropdownItemTitleSelected: {
    ...semiBoldStyle,
    color: colors.primary.foreground,
  },
  dropdownItemUrl: {
    ...typography.caption,
    fontFamily,
    color: colors.foreground.muted,
    marginTop: spacing.xs / 2,
  },
  noLinksContainer: {
    padding: spacing.md,
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    alignItems: 'center',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  noLinksText: {
    ...typography.bodySmall,
    fontFamily,
    color: colors.foreground.muted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  goToLinksButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.button,
  },
  goToLinksText: {
    ...typography.label,
    ...semiBoldStyle,
    fontFamily,
    color: colors.primary.foreground,
  },
  errorText: {
    ...typography.caption,
    ...semiBoldStyle,
    fontFamily,
    color: colors.error,
    marginTop: spacing.sm,
  },
  disabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  disabledIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  disabledTitle: {
    ...typography.h2,
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.md,
    textAlign: 'center',
    fontFamily,
  },
  disabledMessage: {
    ...typography.body,
    fontSize: 16,
    color: colors.foreground.muted,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily,
  },
  // Discount Code Styles
  discountInputRow: {
    flexDirection: rowDir,
    gap: 12,
    marginBottom: spacing.xs,
  },
  discountInput: {
    flex: 1,
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.button,
    padding: spacing.md,
    color: colors.foreground.DEFAULT,
    fontFamily,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    fontSize: 14,
  },
  applyButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: 20,
    borderRadius: borderRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  applyButtonText: {
    color: colors.primary.foreground,
    fontFamily: fontSemibold,
    fontSize: 14,
  },
  sectionTitleRow: {
    flexDirection: rowDir,
    alignItems: 'center',
    gap: 8,
  },
  appliedDiscountRow: {
    flexDirection: rowDir,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  discountBadge: {
    flexDirection: rowDir,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: spacing.sm,
    gap: 8,
  },
  discountBadgeText: {
    color: '#10B981',
    fontFamily: fontSemibold,
    fontSize: 14,
  },
  removeButton: {
    padding: 8,
  },
  removeText: {
    color: '#EF4444',
    fontFamily: fontMedium,
    fontSize: 14,
  },
}); 
};

