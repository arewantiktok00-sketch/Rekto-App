import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useOwnerAuth() {
  const { user } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [isReviewer, setIsReviewer] = useState(false);
  const [isReviewerOnly, setIsReviewerOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkOwnerStatus();
    } else {
      setIsOwner(false);
      setIsReviewer(false);
      setIsReviewerOnly(false);
      setLoading(false);
    }
  }, [user?.email]);

  const checkOwnerStatus = async () => {
    if (!user?.email) {
      setIsOwner(false);
      setIsReviewer(false);
      setIsReviewerOnly(false);
      setLoading(false);
      return;
    }

    try {
      const emailLower = user.email.toLowerCase();
      
      // Special case: Owner@rekto.net is always a full owner
      if (emailLower === 'owner@rekto.net') {
        setIsOwner(true);
        setIsReviewer(false);
        setIsReviewerOnly(false);
        setLoading(false);
        return;
      }

      // Use owner-check edge function via Supabase SDK
      const { data, error } = await supabase.functions.invoke('owner-check', {
        body: { email: user.email },
      });
      if (error) throw error;
      if (data) {
        const ownerStatus = data.isOwner === true;
        const reviewerStatus = data.isReviewer === true;
        
        setIsOwner(ownerStatus);
        setIsReviewer(reviewerStatus);
        setIsReviewerOnly(reviewerStatus && !ownerStatus);
        setLoading(false);
        return;
      }

      // No data returned, try fallback
      await checkOwnerStatusFallback();
    } catch (error) {
      console.error('Error checking owner status:', error);
      await checkOwnerStatusFallback();
    }
  };

  const checkOwnerStatusFallback = async () => {
    if (!user?.email) {
      setIsOwner(false);
      setIsReviewer(false);
      setIsReviewerOnly(false);
      setLoading(false);
      return;
    }

    try {
      const emailLower = user.email.toLowerCase();

      // First check owner_accounts
      const { data: ownerData } = await supabase
        .from('owner_accounts')
        .select('id')
        .eq('email', emailLower)
        .maybeSingle();

      if (ownerData) {
        setIsOwner(true);
        setIsReviewer(false);
        setIsReviewerOnly(false);
        setLoading(false);
        return;
      }

      // Then check admin_reviewers
      const { data: reviewerData } = await supabase
        .from('admin_reviewers')
        .select('id')
        .eq('email', emailLower)
        .maybeSingle();

      if (reviewerData) {
        setIsOwner(false);
        setIsReviewer(true);
        setIsReviewerOnly(true);
        setLoading(false);
        return;
      }

      // Not owner or reviewer
      setIsOwner(false);
      setIsReviewer(false);
      setIsReviewerOnly(false);
    } catch (error) {
      console.error('Error in fallback check:', error);
      setIsOwner(false);
      setIsReviewer(false);
      setIsReviewerOnly(false);
    } finally {
      setLoading(false);
    }
  };

  const hasAdminAccess = isOwner || isReviewer;

  return { 
    isOwner, 
    isReviewer, 
    isReviewerOnly, 
    hasAdminAccess,
    loading 
  };
}
