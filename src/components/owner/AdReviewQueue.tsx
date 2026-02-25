import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { sendPushToCampaignUser } from '@/services/notificationPush';
import { getOwnerColors } from '@/theme/colors';
import { borderRadius, spacing } from '@/theme/spacing';
import { inputStyleRTL } from '@/utils/rtl';
import { toast } from '@/utils/toast';
import { Video } from 'expo-av';
import {
    AlertCircle,
    Calendar,
    Check,
    ChevronDown,
    ChevronUp,
    Copy,
    CreditCard,
    DollarSign,
    Eye,
    FileCheck,
    Play,
    RefreshCw,
    Users,
    X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Clipboard,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { AdvertiserSelector } from './AdvertiserSelector';

interface PendingCampaign {
  id: string;
  user_id?: string;
  title: string;
  video_url: string;
  objective: string;
  caption: string | null;
  daily_budget: number;
  duration_days: number;
  total_budget: number;
  target_age_min: number | null;
  target_age_max: number | null;
  target_gender: string | null;
  target_countries: string[] | null;
  call_to_action: string | null;
  created_at: string;
  user_email: string;
  user_name: string;
  status: string;
  payment_receipt_url: string | null;
  payment_transaction_id: string | null;
  payment_method_used: string | null;
  payment_amount_iqd: string | null;
  extension_status?: 'awaiting_payment' | 'verifying_payment' | null;
  extension_days?: number | null;
  extension_daily_budget?: number | null;
  extension_payment_method?: string | null;
}

interface VideoInfo {
  coverImageUrl?: string | null;
  previewUrl?: string | null;
  tiktokUrl?: string | null;
  username?: string | null;
  videoDescription?: string | null;
}

export const AdReviewQueue: React.FC = () => {
  const { t, language, isRTL } = useLanguage();
  const colors = getOwnerColors();
  const styles = createStyles(colors);

  const [campaigns, setCampaigns] = useState<PendingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedAdvertisers, setSelectedAdvertisers] = useState<Record<string, string>>({});
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingCampaignId, setRejectingCampaignId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [videoInfoById, setVideoInfoById] = useState<Record<string, VideoInfo | null>>({});
  const [videoLoadingById, setVideoLoadingById] = useState<Record<string, boolean>>({});
  const [videoErrorById, setVideoErrorById] = useState<Record<string, string | null>>({});
  const realtimeRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SUPABASE_URL = 'https://uivgyexyakfincwgghgh.supabase.co';

  useEffect(() => {
    fetchPendingCampaigns();
  }, []);

  const fetchVideoInfo = async (campaign: PendingCampaign) => {
    if (!campaign?.id || !campaign.video_url) return;
    if (videoLoadingById[campaign.id] || videoInfoById[campaign.id]) return;

    try {
      setVideoLoadingById((prev) => ({ ...prev, [campaign.id]: true }));
      setVideoErrorById((prev) => ({ ...prev, [campaign.id]: null }));

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/tiktok-video-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          authCode: campaign.video_url,
          campaignId: campaign.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to load video info');
      }

      const data = await response.json();
      const info: VideoInfo | null = data?.videoInfo || null;
      setVideoInfoById((prev) => ({ ...prev, [campaign.id]: info }));
    } catch (err: any) {
      setVideoErrorById((prev) => ({ ...prev, [campaign.id]: err?.message || 'Failed to load video info' }));
    } finally {
      setVideoLoadingById((prev) => ({ ...prev, [campaign.id]: false }));
    }
  };

  useEffect(() => {
    if (!expandedId) return;
    const campaign = campaigns.find((item) => item.id === expandedId);
    if (campaign) {
      fetchVideoInfo(campaign);
    }
  }, [expandedId, campaigns]);

  const fetchPendingCampaigns = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setErrorMessage(null);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-review`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'list' }),
      });

      if (response.status === 404) {
        console.error('[AdReviewQueue] admin-review function not deployed');
        setCampaigns([]);
        setErrorMessage('Backend function not deployed. Contact admin.');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load pending ads');
      }

      const data = await response.json();
      setCampaigns(data?.campaigns || []);
      // Backend (admin-review list) should include for extension approval: extension_status, extension_days, extension_daily_budget, extension_payment_method
    } catch (err: any) {
      console.error('Failed to fetch pending campaigns:', err);
      setErrorMessage(err?.message || 'Network error. Please retry.');
      toast.error('Error', 'Something went wrong');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPendingCampaigns();
  }, [fetchPendingCampaigns]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-review-queue')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaigns' },
        () => {
          if (realtimeRefreshRef.current) {
            clearTimeout(realtimeRefreshRef.current);
          }
          realtimeRefreshRef.current = setTimeout(() => {
            fetchPendingCampaigns();
          }, 300);
        }
      )
      .subscribe();

    return () => {
      if (realtimeRefreshRef.current) {
        clearTimeout(realtimeRefreshRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [fetchPendingCampaigns]);

  const handleAcceptContent = async (campaignId: string) => {
    setProcessingId(campaignId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-review', {
        body: { action: 'accept-content', campaignId },
      });

      if (error) {
        console.error('[admin-review] accept-content SDK error:', error);
        Alert.alert('Error', 'Network error. Please check your connection and try again.');
        return;
      }
      if (!data?.success) {
        const errorMsg = data?.error || 'Unknown error';
        console.error('[admin-review] accept-content business error:', errorMsg);
        Alert.alert('Action Failed', errorMsg);
        return;
      }

      toast.success('Success', data?.message || 'Operation completed');
      await sendPushToCampaignUser(
        campaignId,
        t('pushAwaitingPaymentTitle') || 'Awaiting payment',
        t('pushAwaitingPaymentBody') || 'Your ad was approved. Complete your payment to go live.',
        'ad_accepted',
      );
      fetchPendingCampaigns();
    } catch (err: any) {
      console.error('[admin-review] accept-content unexpected error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleVerifyAndRun = async (campaign: PendingCampaign) => {
    const selectedAdvertiserId = selectedAdvertisers[campaign.id];
    if (!selectedAdvertiserId) {
      toast.error('Error', 'Something went wrong');
      return;
    }

    setProcessingId(campaign.id);
    try {
      if (campaign.objective === 'views') {
        const { error: updateError } = await supabase
          .from('campaigns')
          .update({
            call_to_action: null,
            destination_url: null,
          })
          .eq('id', campaign.id);

        if (updateError) {
          throw updateError;
        }
      }

      const { data, error } = await supabase.functions.invoke('admin-review', {
        body: {
          action: 'verify-and-run',
          campaignId: campaign.id,
          advertiserId: selectedAdvertiserId,
        },
      });

      if (error) {
        console.error('[admin-review] verify-and-run SDK error:', error);
        Alert.alert('Error', 'Network error. Please check your connection and try again.');
        return;
      }
      if (!data?.success) {
        const errorMsg = data?.error || 'Unknown error';
        console.error('[admin-review] verify-and-run business error:', errorMsg);
        Alert.alert('Action Failed', errorMsg);
        return;
      }

      toast.success('Success', data?.message || 'Operation completed');
      await sendPushToCampaignUser(
        campaign.id,
        t('pushAdSubmittedTitle') || 'Ad Submitted! 🚀',
        t('pushAdSubmittedBody') || 'Your ad has been submitted to TikTok and is awaiting review.',
        'ad_submitted',
      );
      const newSelected = { ...selectedAdvertisers };
      delete newSelected[campaign.id];
      setSelectedAdvertisers(newSelected);
      fetchPendingCampaigns();
    } catch (err: any) {
      console.error('[admin-review] verify-and-run unexpected error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleInvalidId = async (campaignId: string) => {
    Alert.alert(
      'Invalid Payment ID',
      'This will revert the campaign to awaiting payment. The user will need to re-enter payment details.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(campaignId);
            try {
              const { data, error } = await supabase.functions.invoke('admin-review', {
                body: { action: 'invalid-id', campaignId },
              });

              if (error) {
                console.error('[admin-review] invalid-id SDK error:', error);
                Alert.alert('Error', 'Network error. Please check your connection and try again.');
                return;
              }
              if (!data?.success) {
                const errorMsg = data?.error || 'Unknown error';
                console.error('[admin-review] invalid-id business error:', errorMsg);
                Alert.alert('Action Failed', errorMsg);
                return;
              }
              toast.success('Success', data?.message || 'Operation completed');
              fetchPendingCampaigns();
            } catch (err: any) {
              console.error('[admin-review] invalid-id unexpected error:', err);
              Alert.alert('Error', 'Something went wrong. Please try again.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleVerifyExtension = async (campaign: PendingCampaign) => {
    setProcessingId(campaign.id);
    try {
      const { data, error } = await supabase.functions.invoke('admin-review', {
        body: { action: 'verify-extension', campaignId: campaign.id },
      });
      if (error) {
        console.error('[admin-review] verify-extension SDK error:', error);
        Alert.alert('Extension Failed', 'Network error. Please check your connection and try again.');
        return;
      }
      if (!data?.success) {
        const errorMsg = (data?.error || data?.message || 'Failed to verify extension').trim();
        console.error('[admin-review] verify-extension business error:', errorMsg);
        const lower = errorMsg.toLowerCase();
        if (lower.includes('deleted')) {
          Alert.alert('Extension Failed', 'This campaign was deleted on TikTok. Extension cannot proceed.');
        } else if (lower.includes('not active') || lower.includes('paused') || lower.includes('inactive')) {
          Alert.alert('Extension Failed', 'This ad is paused or inactive on TikTok. Resume it first.');
        } else {
          Alert.alert('Extension Failed', errorMsg);
        }
        return;
      }
      toast.success('Success', data?.message || 'Extension approved');
      fetchPendingCampaigns();
    } catch (err: any) {
      console.error('[admin-review] verify-extension unexpected error:', err);
      Alert.alert('Extension Failed', 'The campaign may have been deleted or paused on TikTok.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectExtension = async (campaign: PendingCampaign) => {
    Alert.alert(
      'Reject Extension',
      'Reject this extension request? The user will be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(campaign.id);
            try {
              const { data, error } = await supabase.functions.invoke('admin-review', {
                body: { action: 'reject-extension', campaignId: campaign.id },
              });
              if (error) {
                console.error('[admin-review] reject-extension SDK error:', error);
                Alert.alert('Error', 'Network error. Please check your connection and try again.');
                return;
              }
              if (!data?.success) {
                const errorMsg = data?.error || data?.message || 'Failed to reject extension. Please try again.';
                console.error('[admin-review] reject-extension business error:', errorMsg);
                Alert.alert('Error', errorMsg);
                return;
              }
              toast.success('Success', data?.message || 'Extension rejected');
              fetchPendingCampaigns();
            } catch (err: any) {
              console.error('[admin-review] reject-extension unexpected error:', err);
              Alert.alert('Error', 'Failed to reject extension. Please try again.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!rejectingCampaignId) return;
    if (!rejectionReason.trim()) {
      toast.error('Error', 'Something went wrong');
      return;
    }

    setProcessingId(rejectingCampaignId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-review', {
        body: {
          action: 'reject',
          campaignId: rejectingCampaignId,
          rejectionReason: rejectionReason.trim(),
        },
      });

      if (error) {
        console.error('[admin-review] reject SDK error:', error);
        Alert.alert('Error', 'Network error. Please check your connection and try again.');
        return;
      }
      if (!data?.success) {
        const errorMsg = data?.error || 'Unknown error';
        console.error('[admin-review] reject business error:', errorMsg);
        Alert.alert('Action Failed', errorMsg);
        return;
      }

      toast.success('Success', data?.message || 'Operation completed');
      const reason = rejectionReason.trim();
      await sendPushToCampaignUser(
        rejectingCampaignId,
        t('pushAdRejectedTitle') || 'Ad Rejected',
        (t('pushAdRejectedBody') || 'Your ad was rejected. Reason: {reason}').replace('{reason}', reason),
        'ad_rejected',
      );
      setShowRejectDialog(false);
      setRejectingCampaignId(null);
      setRejectionReason('');
      fetchPendingCampaigns();
    } catch (err: any) {
      console.error('[admin-review] reject unexpected error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const copySparkCode = (code: string) => {
    Clipboard.setString(code);
    toast.success('Success', 'Operation completed');
  };

  const getStatusBadge = (status: string) => {
    if (status === 'waiting_for_admin') {
      return { label: 'Pending Content Review', color: '#F59E0B', bg: '#FEF3C7' };
    }
    if (status === 'verifying_payment') {
      return { label: 'Verify Payment', color: '#3B82F6', bg: '#DBEAFE' };
    }
    if (status === 'active') {
      return { label: 'Active (Extension)', color: '#7C3AED', bg: '#EDE9FE' };
    }
    return { label: status, color: '#6B7280', bg: '#F3F4F6' };
  };

  const renderCampaignCard = ({ item }: { item: PendingCampaign }) => {
    const isExpanded = expandedId === item.id;
    const isProcessing = processingId === item.id;
    const statusBadge = getStatusBadge(item.status);
    const selectedAdvertiserId = selectedAdvertisers[item.id];
    const videoInfo = videoInfoById[item.id];
    const isVideoLoading = videoLoadingById[item.id];
    const videoError = videoErrorById[item.id];

    return (
      <View style={styles.card}>
        {/* Collapsed Header */}
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          disabled={isProcessing}
        >
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardUser}>{item.user_name || item.user_email}</Text>
          </View>
          <View style={styles.cardHeaderRight}>
            <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>
                {statusBadge.label}
              </Text>
            </View>
            {isExpanded ? (
              <ChevronUp size={20} color={colors.foreground.muted} />
            ) : (
              <ChevronDown size={20} color={colors.foreground.muted} />
            )}
          </View>
        </TouchableOpacity>

        {/* Expanded Content */}
        {isExpanded && (
          <ScrollView style={styles.cardContent} nestedScrollEnabled>
            {/* Campaign Details */}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Video URL (Spark Code)</Text>
              <View style={styles.sparkCodeContainer}>
                <Text style={styles.sparkCode} numberOfLines={1}>
                  {item.video_url || 'N/A'}
                </Text>
                <TouchableOpacity
                  onPress={() => copySparkCode(item.video_url)}
                  style={styles.copyButton}
                >
                  <Copy size={16} color={colors.primary.DEFAULT} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Video Preview</Text>
              <View style={styles.videoPreviewContainer}>
                {isVideoLoading ? (
                  <View style={styles.videoLoading}>
                    <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
                    <Text style={styles.videoLoadingText}>Loading preview...</Text>
                  </View>
                ) : videoInfo?.previewUrl ? (
                  <Video
                    source={{ uri: videoInfo.previewUrl }}
                    style={styles.videoPreview}
                    resizeMode="contain"
                    useNativeControls
                    isLooping
                  />
                ) : videoInfo?.coverImageUrl ? (
                  <Image source={{ uri: videoInfo.coverImageUrl }} style={styles.videoPreview} resizeMode="cover" />
                ) : (
                  <View style={styles.videoPlaceholder}>
                    <Play size={28} color="#7C3AED" />
                    <Text style={styles.videoPlaceholderText}>
                      {videoError ? 'Preview unavailable' : 'No preview yet'}
                    </Text>
                  </View>
                )}
              </View>
              {(videoInfo?.username || videoInfo?.videoDescription) && (
                <View style={styles.videoMeta}>
                  {videoInfo?.username && (
                    <Text style={styles.videoMetaText}>@{videoInfo.username}</Text>
                  )}
                  {videoInfo?.videoDescription && (
                    <Text style={styles.videoMetaText} numberOfLines={3}>
                      {videoInfo.videoDescription}
                    </Text>
                  )}
                </View>
              )}
              {videoInfo?.tiktokUrl && (
                <TouchableOpacity
                  style={styles.tiktokButton}
                  onPress={() => Linking.openURL(videoInfo.tiktokUrl as string)}
                >
                  <Text style={styles.tiktokButtonText}>View on TikTok</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <DollarSign size={16} color={colors.foreground.muted} />
                <Text style={styles.detailValue}>${item.daily_budget}/day</Text>
              </View>
              <View style={styles.detailItem}>
                <Calendar size={16} color={colors.foreground.muted} />
                <Text style={styles.detailValue}>{item.duration_days} days</Text>
              </View>
              <View style={styles.detailItem}>
                <Eye size={16} color={colors.foreground.muted} />
                <Text style={styles.detailValue}>{item.objective}</Text>
              </View>
              <View style={styles.detailItem}>
                <Users size={16} color={colors.foreground.muted} />
                <Text style={styles.detailValue}>
                  {item.target_age_min}-{item.target_age_max} {item.target_gender || 'all'}
                </Text>
              </View>
            </View>

            {/* Payment Info (if verifying_payment) */}
            {item.status === 'verifying_payment' && (
              <View style={styles.paymentSection}>
                <Text style={styles.sectionTitle}>Payment Information</Text>
                {item.payment_method_used && (
                  <View style={styles.paymentInfo}>
                    <CreditCard size={16} color={colors.foreground.muted} />
                    <Text style={styles.paymentText}>
                      Method: {item.payment_method_used.toUpperCase()}
                    </Text>
                  </View>
                )}
                {item.payment_transaction_id && (
                  <View style={styles.paymentInfo}>
                    <FileCheck size={16} color={colors.foreground.muted} />
                    <Text style={styles.paymentText}>
                      Sender: {item.payment_transaction_id}
                    </Text>
                  </View>
                )}
                {item.payment_amount_iqd && (
                  <View style={styles.paymentInfo}>
                    <DollarSign size={16} color={colors.foreground.muted} />
                    <Text style={styles.paymentText}>
                      Amount: {item.payment_amount_iqd} IQD
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              {item.status === 'waiting_for_admin' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => handleAcceptContent(item.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color={colors.primary.foreground} />
                    ) : (
                      <>
                        <Check size={18} color={colors.primary.foreground} />
                        <Text style={styles.actionButtonText}>Accept Content</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => {
                      setRejectingCampaignId(item.id);
                      setShowRejectDialog(true);
                    }}
                    disabled={isProcessing}
                  >
                    <X size={18} color={colors.primary.foreground} />
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </TouchableOpacity>
                </>
              )}

              {item.status === 'verifying_payment' && (
                <>
                  <View style={styles.advertiserSelectorContainer} pointerEvents="box-none">
                    <AdvertiserSelector
                      selectedAdvertiserId={selectedAdvertiserId || null}
                      onSelect={(advertiserId) => {
                        setSelectedAdvertisers({
                          ...selectedAdvertisers,
                          [item.id]: advertiserId,
                        });
                      }}
                      disabled={isProcessing}
                    />
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.verifyButton,
                      !selectedAdvertiserId && styles.actionButtonDisabled,
                    ]}
                    onPress={() => handleVerifyAndRun(item)}
                    disabled={isProcessing || !selectedAdvertiserId}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color={colors.primary.foreground} />
                    ) : (
                      <>
                        <Play size={18} color={colors.primary.foreground} />
                        <Text style={styles.actionButtonText}>Confirm & Run Ad</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.invalidButton]}
                    onPress={() => handleInvalidId(item.id)}
                    disabled={isProcessing}
                  >
                    <AlertCircle size={18} color={colors.primary.foreground} />
                    <Text style={styles.actionButtonText}>Invalid ID</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => {
                      setRejectingCampaignId(item.id);
                      setShowRejectDialog(true);
                    }}
                    disabled={isProcessing}
                  >
                    <X size={18} color={colors.primary.foreground} />
                    <Text style={styles.actionButtonText}>Reject Ad</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Active campaigns: show extension approval buttons (always for active in review queue) */}
              {item.status === 'active' && (
                <>
                  <View style={styles.paymentSection}>
                    <Text style={styles.sectionTitle}>Extension Request</Text>
                    {item.extension_days != null || item.extension_daily_budget != null ? (
                      <View style={styles.paymentInfo}>
                        <Calendar size={16} color={colors.foreground.muted} />
                        <Text style={styles.paymentText}>
                          {item.extension_days != null ? `${item.extension_days} days` : ''}
                          {item.extension_daily_budget != null ? ` • $${item.extension_daily_budget}/day` : ''}
                          {item.extension_payment_method ? ` • ${item.extension_payment_method}` : ''}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.paymentText}>No extension details available</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.extensionVerifyButton]}
                    onPress={() => handleVerifyExtension(item)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color={colors.primary.foreground} />
                    ) : (
                      <>
                        <Check size={20} color={colors.primary.foreground} />
                        <Text style={styles.extensionButtonText}>Verify Extension</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleRejectExtension(item)}
                    disabled={isProcessing}
                  >
                    <X size={20} color={colors.primary.foreground} />
                    <Text style={styles.extensionButtonText}>Reject Extension</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Loading campaigns...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Review Queue ({campaigns.length})
        </Text>
        <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
          <RefreshCw
            size={20}
            color={colors.primary.DEFAULT}
            style={refreshing && { transform: [{ rotate: '180deg' }] }}
          />
        </TouchableOpacity>
      </View>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {errorMessage || 'No ads waiting for review'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={campaigns}
          renderItem={renderCampaignCard}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Reject Dialog — KeyboardAvoidingView so input and buttons stay above keyboard */}
      <Modal visible={showRejectDialog} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <View style={[styles.dialogOverlay, { flex: 1, justifyContent: 'flex-end' }]}>
            <View style={[styles.dialog, { maxHeight: '80%' }]}>
              <Text style={styles.dialogTitle}>Reject Campaign</Text>
              <Text style={styles.dialogSubtitle}>
                Please provide a reason for rejection:
              </Text>
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 160 }}>
                <TextInput
                  style={[styles.rejectionInput, inputStyleRTL()]}
                  placeholder="Rejection reason..."
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={colors.foreground.muted}
                  textAlignVertical="top"
                />
              </ScrollView>
              <View style={[styles.dialogActions, { marginTop: 16 }]}>
                <TouchableOpacity
                  style={[styles.dialogButton, styles.dialogButtonCancel]}
                  onPress={() => {
                    setShowRejectDialog(false);
                    setRejectingCampaignId(null);
                    setRejectionReason('');
                  }}
                >
                  <Text style={styles.dialogButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dialogButton, styles.dialogButtonConfirm]}
                  onPress={handleReject}
                  disabled={!rejectionReason.trim() || processingId !== null}
                >
                  {processingId !== null ? (
                    <ActivityIndicator size="small" color={colors.primary.foreground} />
                  ) : (
                    <Text style={[styles.dialogButtonText, { color: colors.primary.foreground }]}>
                      Reject
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.DEFAULT,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.sm,
    },
    loadingText: {
      color: colors.foreground.muted,
      fontSize: 14,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.md,
      backgroundColor: colors.card.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.DEFAULT,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
    },
    listContent: {
      padding: spacing.md,
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    card: {
      backgroundColor: colors.card.background,
      borderRadius: borderRadius.card,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      marginBottom: spacing.md,
      overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.md,
    },
    cardHeaderLeft: {
      flex: 1,
      marginEnd: spacing.sm,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
      marginBottom: 4,
    },
    cardUser: {
      fontSize: 12,
      color: colors.foreground.muted,
    },
    cardHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '600',
    },
    cardContent: {
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border.DEFAULT,
      maxHeight: 600,
    },
    detailSection: {
      marginBottom: spacing.md,
    },
    detailLabel: {
      fontSize: 12,
      color: colors.foreground.muted,
      marginBottom: spacing.xs,
    },
    videoPreviewContainer: {
      backgroundColor: colors.background.DEFAULT,
      borderRadius: borderRadius.sm,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    videoPreview: {
      width: '100%',
      height: 200,
      backgroundColor: '#000',
    },
    videoLoading: {
      height: 200,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: colors.background.DEFAULT,
    },
    videoLoadingText: {
      fontSize: 12,
      color: colors.foreground.muted,
    },
    videoPlaceholder: {
      height: 200,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background.DEFAULT,
      gap: spacing.xs,
    },
    videoPlaceholderText: {
      fontSize: 12,
      color: colors.foreground.muted,
    },
    videoMeta: {
      marginTop: spacing.xs,
      gap: 4,
    },
    videoMetaText: {
      fontSize: 12,
      color: colors.foreground.DEFAULT,
    },
    tiktokButton: {
      marginTop: spacing.sm,
      alignSelf: 'flex-start',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.primary.DEFAULT,
    },
    tiktokButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary.foreground,
    },
    sparkCodeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.DEFAULT,
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
      gap: spacing.xs,
    },
    sparkCode: {
      flex: 1,
      fontSize: 12,
      fontFamily: 'monospace',
      color: colors.foreground.DEFAULT,
    },
    copyButton: {
      padding: spacing.xs,
    },
    detailsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.background.DEFAULT,
      padding: spacing.sm,
      borderRadius: borderRadius.sm,
      flex: 1,
      minWidth: '45%',
    },
    detailValue: {
      fontSize: 12,
      color: colors.foreground.DEFAULT,
    },
    paymentSection: {
      backgroundColor: colors.background.DEFAULT,
      padding: spacing.md,
      borderRadius: borderRadius.sm,
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
      marginBottom: spacing.sm,
    },
    paymentInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    paymentText: {
      fontSize: 12,
      color: colors.foreground.DEFAULT,
    },
    actionsContainer: {
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    advertiserSelectorContainer: {
      marginBottom: spacing.sm,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      padding: spacing.md,
      borderRadius: borderRadius.sm,
      minHeight: 44,
    },
    acceptButton: {
      backgroundColor: '#22C55E',
    },
    rejectButton: {
      backgroundColor: '#EF4444',
    },
    verifyButton: {
      backgroundColor: '#7C3AED',
    },
    extensionVerifyButton: {
      backgroundColor: '#7C3AED',
      paddingVertical: spacing.md + 4,
      minHeight: 52,
    },
    invalidButton: {
      backgroundColor: '#F59E0B',
    },
    actionButtonDisabled: {
      opacity: 0.5,
    },
    actionButtonText: {
      color: colors.primary.foreground,
      fontSize: 14,
      fontWeight: '600',
    },
    extensionButtonText: {
      color: colors.primary.foreground,
      fontSize: 16,
      fontWeight: '600',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    emptyText: {
      fontSize: 16,
      color: colors.foreground.muted,
    },
    dialogOverlay: {
      position: 'absolute',
      top: 0,
      start: 0,
      end: 0,
      bottom: 0,
      backgroundColor: colors.overlay.dark,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    dialog: {
      backgroundColor: colors.card.background,
      borderRadius: borderRadius.card,
      padding: spacing.md,
      width: '90%',
      maxWidth: 400,
    },
    dialogTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
      marginBottom: spacing.xs,
    },
    dialogSubtitle: {
      fontSize: 14,
      color: colors.foreground.muted,
      marginBottom: spacing.md,
    },
    rejectionInput: {
      backgroundColor: colors.background.DEFAULT,
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
      minHeight: 100,
      textAlignVertical: 'top',
      color: colors.foreground.DEFAULT,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      marginBottom: spacing.md,
    },
    dialogActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'flex-end',
    },
    dialogButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.sm,
      minWidth: 80,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dialogButtonCancel: {
      backgroundColor: colors.background.DEFAULT,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    dialogButtonConfirm: {
      backgroundColor: '#EF4444',
    },
    dialogButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
    },
  });

