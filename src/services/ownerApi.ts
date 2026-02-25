import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = 'https://uivgyexyakfincwgghgh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpdmd5ZXh5YWtmaW5jd2dnaGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MTY4MDYsImV4cCI6MjA4MzI5MjgwNn0.Crz4L5Sbev3Jft6ou1SFz7htpWSWRxVaTaYgDE2DGso';

type OwnerEndpoint =
  | 'owner-advertisers-core'
  | 'owner-advertisers-tiktok'
  | 'owner-advertisers-buttons'
  | 'owner-advertisers-config'
  | 'owner-advertisers-bc';

const ACTION_TO_ENDPOINT: Record<string, OwnerEndpoint> = {
  list: 'owner-advertisers-core',
  listWithHealth: 'owner-advertisers-core',
  add: 'owner-advertisers-core',
  remove: 'owner-advertisers-core',
  updateStatus: 'owner-advertisers-core',
  updateName: 'owner-advertisers-core',
  updateMaxAds: 'owner-advertisers-core',
  fetchFromTikTok: 'owner-advertisers-tiktok',
  saveAdvertisers: 'owner-advertisers-tiktok',
  testToken: 'owner-advertisers-tiktok',
  syncFromConfig: 'owner-advertisers-tiktok',
  listConfigs: 'owner-advertisers-config',
  addConfig: 'owner-advertisers-config',
  updateConfig: 'owner-advertisers-config',
  removeConfig: 'owner-advertisers-config',
  refreshToken: 'owner-advertisers-config',
  updateInteractiveButtons: 'owner-advertisers-buttons',
  getInteractiveButtonId: 'owner-advertisers-buttons',
  listBusinessCenters: 'owner-advertisers-bc',
  addBusinessCenter: 'owner-advertisers-bc',
  getLogs: 'owner-advertisers-bc',
};

export async function callOwnerAdvertisers(action: string, params: Record<string, any> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const endpoint = ACTION_TO_ENDPOINT[action] || 'owner-advertisers-core';

  // Remove undefined values from params to avoid JSON.stringify issues
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== undefined)
  );

  const requestBody = { action, ...cleanParams };
  
  console.log('[ownerApi] Calling edge function:', { 
    action, 
    actionType: typeof action,
    params: cleanParams,
    requestBody: JSON.stringify(requestBody).substring(0, 200)
  });

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  
  console.log('[ownerApi] Response status:', response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    let errorDetails: any = null;
    
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorMessage;
      errorDetails = errorJson;
      console.error('[ownerApi] Error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorJson,
      });
    } catch {
      errorMessage = errorText || errorMessage;
      console.error('[ownerApi] Error text:', {
        status: response.status,
        statusText: response.statusText,
        text: errorText.substring(0, 500),
      });
    }
    
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).details = errorDetails;
    throw error;
  }

  const result = await response.json();
  console.log('[ownerApi] Success response:', { action, hasError: !!result.error });
  return result;
}

// API Actions
export const ownerApi = {
  // Core advertisers
  listAdvertisers: () => callOwnerAdvertisers('list'),
  listWithHealth: () => callOwnerAdvertisers('listWithHealth'),
  addAdvertiser: (params: { advertiser_id: string; business_center?: string }) =>
    callOwnerAdvertisers('add', params),
  removeAdvertiser: (id: string) => callOwnerAdvertisers('remove', { id }),
  updateStatus: (id: string, status: string) =>
    callOwnerAdvertisers('updateStatus', { id, status }),
  updateName: (id: string, name: string) =>
    callOwnerAdvertisers('updateName', { id, name }),
  updateMaxAds: (id: string, maxActiveAds: number) =>
    callOwnerAdvertisers('updateMaxAds', { id, max_active_ads: maxActiveAds }),

  // List all saved configurations
  listConfigs: () => callOwnerAdvertisers('listConfigs'),
  
  // Preview advertisers from TikTok API (before saving config)
  fetchFromTikTok: (params: {
    access_token: string;
    bc_id?: string;
    advertiser_id?: string;
  }) => callOwnerAdvertisers('fetchFromTikTok', params),
  
  // Add new configuration to database
  addConfig: (config: {
    label: string;
    access_token: string;
    business_center_id?: string;
    app_id?: string;
    app_secret?: string;
    refresh_token?: string;
  }) => callOwnerAdvertisers('addConfig', config),
  
  // Sync advertisers from TikTok API using a saved config
  syncFromConfig: async (configId: string) => {
    try {
      return await callOwnerAdvertisers('syncFromConfig', { configId });
    } catch (error: any) {
      // If error has details, return them as part of the result
      if (error.details) {
        return {
          error: error.details.error || error.message,
          suggestion: error.details.suggestion,
          message: error.details.error || error.message,
        };
      }
      throw error;
    }
  },
  
  // Delete configuration
  removeConfig: (configId: string) => callOwnerAdvertisers('removeConfig', { id: configId }),
  
  // Refresh token for a config
  refreshToken: (configId: string) => callOwnerAdvertisers('refreshToken', { configId }),
  
  // Test token validity
  testToken: (accessToken: string) => callOwnerAdvertisers('testToken', { access_token: accessToken }),

  // Business centers and logs
  listBusinessCenters: () => callOwnerAdvertisers('listBusinessCenters'),
  addBusinessCenter: (params: { business_center_id: string }) =>
    callOwnerAdvertisers('addBusinessCenter', params),
  getLogs: (limit = 100) => callOwnerAdvertisers('getLogs', { limit }),
  
  // Helper: Add config and sync in one call
  addAndSyncConfig: async (params: {
    label: string;
    access_token: string;
    business_center_id?: string;
    app_id?: string;
    app_secret?: string;
    refresh_token?: string;
  }) => {
    // Step 1: Optional - Preview first to validate token
    let previewWarning: string | null = null;
    if (params.business_center_id) {
      try {
        const preview = await ownerApi.fetchFromTikTok({
          access_token: params.access_token,
          bc_id: params.business_center_id,
        });
        
        if (preview.code !== 0) {
          // Check for specific BC permission error
          if (preview.message?.includes('Business Center permissions') || 
              preview.message?.includes('does not have access')) {
            previewWarning = preview.suggestion || 
              'Your token may not have Business Center access. The config will be saved, but you may need to use Advertiser ID instead.';
          } else {
            previewWarning = preview.message || 'Token validation failed, but config will still be saved.';
          }
          console.warn('[ownerApi] Preview failed:', preview.message);
        }
      } catch (error: any) {
        // If preview fails, still try to save config (user might want to fix later)
        const errorMessage = error.message || 'Unknown error';
        if (errorMessage.includes('Business Center permissions') || 
            errorMessage.includes('does not have access')) {
          previewWarning = 'Your token may not have Business Center access. The config will be saved, but you may need to use Advertiser ID instead.';
        } else {
          previewWarning = errorMessage;
        }
        console.warn('[ownerApi] Preview failed, continuing with save:', errorMessage);
      }
    }
    
    // Step 2: Save config to database
    const addResult = await ownerApi.addConfig(params);
    
    if (addResult.error || (!addResult.success && !addResult.config)) {
      throw new Error(addResult.error || 'Failed to save configuration');
    }
    
    // Step 3: Get the new config ID
    // addConfig only returns { success: true }, so we need to fetch the list
    // Wait a moment for the database to be updated
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const configsResult = await ownerApi.listConfigs();
    const configs = configsResult.configs || [];
    
    // Find the config we just created (by access_token match, most recent first)
    // Since listConfigs orders by created_at DESC, the first match is our new config
    const newConfig = configs.find((c: any) => c.access_token === params.access_token);
    
    if (!newConfig) {
      throw new Error('Config was saved but could not be found. Please refresh the list.');
    }
    
    // Step 4: Sync advertisers using the saved config
    try {
      console.log('[ownerApi] Syncing from config:', newConfig.id);
      const syncResult = await ownerApi.syncFromConfig(newConfig.id);
      
      // Check if syncResult has an error (even if status was 200)
      if (syncResult.error) {
        const errorMsg = syncResult.error;
        const suggestion = syncResult.suggestion || '';
        
        // Return partial success - config saved but sync failed
        return {
          success: true,
          config: newConfig,
          syncError: errorMsg,
          previewWarning,
          message: `Configuration saved, but sync failed: ${errorMsg}${suggestion ? ` ${suggestion}` : ''}. You can sync manually later.`,
        };
      }
      
      return {
        success: true,
        config: newConfig,
        syncResult,
        previewWarning,
        message: syncResult.message || 'Configuration saved and synced successfully',
      };
    } catch (syncError: any) {
      // Config was saved but sync failed - return partial success
      console.error('[ownerApi] Sync error details:', {
        error: syncError,
        message: syncError.message,
        status: (syncError as any).status,
        details: (syncError as any).details,
      });
      
      let errorMessage = syncError.message || 'Unknown sync error';
      
      // Extract error from details if available
      if ((syncError as any).details?.error) {
        errorMessage = (syncError as any).details.error;
        if ((syncError as any).details.suggestion) {
          errorMessage += ` ${(syncError as any).details.suggestion}`;
        }
      }
      
      // Check if it's a BC permission error
      let userMessage = 'Configuration saved but sync failed. You can sync manually later.';
      if (errorMessage.includes('Business Center permissions') || 
          errorMessage.includes('does not have access') ||
          errorMessage.includes('invalid') ||
          errorMessage.includes('expired')) {
        userMessage = `Configuration saved, but sync failed: ${errorMessage}. You can sync manually later or try using Advertiser ID instead.`;
      }
      
      return {
        success: true,
        config: newConfig,
        syncError: errorMessage,
        previewWarning,
        message: userMessage,
      };
    }
  },
};
