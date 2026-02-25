import { supabase } from '@/integrations/supabase/client';

// Rekto Links API Configuration
const REKTO_LINKS_API_URL = 'https://uivgyexyakfincwgghgh.supabase.co/functions/v1/links-api';
// Use proxy function that handles API secret securely
const REKTO_LINKS_PROXY_URL = 'https://uivgyexyakfincwgghgh.supabase.co/functions/v1/linkmagic-proxy';
const LINKMAGIC_TIMEOUT_MS = 45000;

// Rekto Links API Response Types
export interface RektoLinksClient {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  theme: string;
  theme_preview_url?: string;
  avatar_url?: string;
  page_url: string;
  share_code: string;
}

export interface RektoLinksLink {
  id: string;
  title: string;
  url: string;
  icon: string;
  display_order: number;
  is_active: boolean;
  short_code: string;
  share_url: string;
}

export interface LinkMagicResponse {
  success: boolean;
  data?: {
    client?: RektoLinksClient;
    links?: RektoLinksLink[];
    allowed_icons?: string[];
    themes?: any[];
  };
  client?: RektoLinksClient; // For backward compatibility
  links?: RektoLinksLink[]; // For backward compatibility
  share_code?: string;
  error?: string;
}

/**
 * Get a valid session, refreshing if needed
 */
const getValidSession = async () => {
  let { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  // If no session or session error, try to refresh
  if (!session || sessionError) {
    if (__DEV__) {
      console.log('⚠️ Session issue, attempting refresh...', sessionError);
    }
    const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshedSession) {
      throw new Error('Not authenticated. Please log in again.');
    }
    session = refreshedSession;
  }
  
  if (!session?.access_token) {
    throw new Error('Not authenticated. Please log in again.');
  }
  
  return session;
};

/**
 * Get user email for Rekto Links API
 */
const getUserEmail = async (): Promise<string> => {
  const session = await getValidSession();
  if (!session?.user?.email) {
    throw new Error('Not authenticated or email not found');
  }
  return session.user.email;
};

/**
 * Get authentication headers - use proxy function that handles API secret
 */
const getAuthHeaders = async () => {
  const session = await getValidSession();
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
};

/**
 * Generate unique email identifier for a link page
 * Format: {slug}@{userId.substring(0,8)}.linkpage.rekto.net
 */
export const generateLinkMagicEmail = async (slug: string, userId: string): Promise<string> => {
  const userIdShort = userId.substring(0, 8).replace(/-/g, '');
  return `${slug}@${userIdShort}.linkpage.rekto.net`;
};

/**
 * Create abort controller with timeout for React Native compatibility
 */
const createTimeoutSignal = (timeoutMs: number = LINKMAGIC_TIMEOUT_MS): AbortSignal => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
};

/**
 * Retry a function with exponential backoff
 * Throws error after all retries fail - NO fallback
 */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isLastAttempt = attempt === maxRetries - 1;
      const isAbortError = error.name === 'AbortError' || error.message === 'Aborted';
      const isNetworkError = isAbortError || 
                            error.message?.includes('Network request failed') || 
                            error.message?.includes('timeout') ||
                            error.message?.includes('Failed to fetch');
      
      if (isLastAttempt) {
        // After all retries, throw the error - NO fallback
        if (isAbortError) {
          const timeoutError = new Error('Request timed out. Please try again.');
          timeoutError.name = 'TimeoutError';
          throw timeoutError;
        }

        throw new Error(
          isNetworkError
            ? 'Network connection failed. Please check your internet connection and try again.'
            : error.message || 'API request failed'
        );
      }
      
      // Wait before retrying (exponential backoff)
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      if (__DEV__) {
        console.log(`Retrying API call (attempt ${attempt + 2}/${maxRetries})...`);
      }
    }
  }
  
  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('API request failed after retries');
};

/**
 * Fetch a link page's data from Rekto Links API
 * Throws error on failure - NO local fallback
 */
export const fetchLinkPage = async (linkmagicEmail: string): Promise<LinkMagicResponse> => {
  return await retryWithBackoff(async () => {
    if (__DEV__) {
      console.log('🔍 Fetching from linkmagic-proxy for:', linkmagicEmail);
    }
    
    try {
      // Get valid session (with auto-refresh if needed)
      const session = await getValidSession();

      // Use direct fetch with query params for React Native compatibility
      const SUPABASE_URL = 'https://uivgyexyakfincwgghgh.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpdmd5ZXh5YWtmaW5jd2dnaGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MTY4MDYsImV4cCI6MjA4MzI5MjgwNn0.Crz4L5Sbev3Jft6ou1SFz7htpWSWRxVaTaYgDE2DGso';
      
      const url = `${SUPABASE_URL}/functions/v1/linkmagic-proxy?linkmagic_email=${encodeURIComponent(linkmagicEmail)}`;
      
      if (__DEV__) {
        console.log('🔍 Fetching from proxy:', url);
      }
      
      const response = await fetch(url, { 
        method: 'GET', 
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        signal: createTimeoutSignal(),
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          const errorText = await response.text();
          errorData = errorText ? JSON.parse(errorText) : {};
        } catch {
          // Ignore JSON parse errors
        }
        
        if (__DEV__) {
          console.error('❌ API error response:', response.status, errorData);
        }
        
        // If 401, try refreshing session once more before giving up
        if (response.status === 401) {
          if (__DEV__) {
            console.log('🔄 401 error, attempting session refresh...');
          }
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !refreshedSession?.access_token) {
            throw new Error('Authentication failed. Please log in again.');
          }
          
          // Retry the request with refreshed token
          const retryResponse = await fetch(url, { 
            method: 'GET', 
            headers: {
              'Authorization': `Bearer ${refreshedSession.access_token}`,
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
            },
            signal: createTimeoutSignal(),
          });
          
          if (!retryResponse.ok) {
            throw new Error('Authentication failed. Please log in again.');
          }
          
          // Use retry response instead - parse and return
          const retryData = await retryResponse.json();
          
          if (__DEV__) {
            console.log('✅ API response (after refresh):', { success: retryData.success, hasData: !!retryData.data });
          }
          
          // Handle not_found as valid response (new user, no link page yet)
          if (retryData.not_found === true) {
            return {
              success: true,
              data: {
                client: undefined,
                links: [],
              },
              not_found: true,
            };
          }
          
          // Continue with normal processing of retryData
          const fetchData = retryData;
          
          if (!fetchData.success) {
            throw new Error(fetchData.error || 'Failed to fetch profile from server');
          }
          
          // Normalize response format for backward compatibility
          if (fetchData.data) {
            return {
              success: true,
              client: fetchData.data.client || fetchData.client,
              links: fetchData.data.links || fetchData.links || [],
              data: fetchData.data,
            };
          }
          
          // Handle direct response structure
          return {
            success: true,
            client: fetchData.client || null,
            links: fetchData.links || [],
            data: {
              client: fetchData.client || null,
              links: fetchData.links || [],
            },
          };
        }
        
        if (response.status === 500 && errorData.error?.includes('API secret not configured')) {
          throw new Error('Server configuration error. Please contact support.');
        }
        
        throw new Error(errorData.error || `Server error (${response.status}). Please try again later.`);
      }

      const fetchData = await response.json();
      
      if (__DEV__) {
        console.log('✅ API response:', { success: fetchData.success, hasData: !!fetchData.data });
      }
      
      // Handle not_found as valid response (new user, no link page yet)
      if (fetchData.not_found === true) {
        return {
          success: true,
          client: null,
          links: [],
          data: {
            client: null,
            links: [],
          },
        };
      }
      
      if (!fetchData.success) {
        throw new Error(fetchData.error || 'Failed to fetch profile from server');
      }
      
      // Normalize response format for backward compatibility
      if (fetchData.data) {
        return {
          success: true,
          client: fetchData.data.client || fetchData.client,
          links: fetchData.data.links || fetchData.links || [],
          data: fetchData.data,
        };
      }
      
      // Handle direct response structure
      return {
        success: true,
        client: fetchData.client || null,
        links: fetchData.links || [],
        data: {
          client: fetchData.client || null,
          links: fetchData.links || [],
        },
      };
    } catch (fetchError: any) {
      const isAbortError = fetchError?.name === 'AbortError' || fetchError?.message === 'Aborted';
      if (__DEV__) {
        if (isAbortError) {
          console.warn('⏱️ Link API request aborted (timeout).');
        } else {
          console.error('❌ Network fetch error:', fetchError);
          console.error('❌ Error name:', fetchError.name);
          console.error('❌ Error message:', fetchError.message);
        }
      }
      
      if (isAbortError) {
        const timeoutError = new Error('Request timed out. Please try again.');
        timeoutError.name = 'TimeoutError';
        throw timeoutError;
      }
      
      if (fetchError.message?.includes('Network request failed') || 
          fetchError.message?.includes('Failed to fetch') ||
          fetchError.message?.includes('NetworkError')) {
        throw new Error('Cannot connect to server. The linkmagic-proxy function may not be deployed. Please check your internet connection and ensure the function is deployed.');
      }
      
      throw new Error(fetchError.message || 'Network connection failed. Please check your internet connection and try again.');
    }
  }, 3, 1000);
};

/**
 * Create a new link page in Rekto Links API
 * Throws error on failure - NO local fallback
 */
export const createLinkPage = async (
  title: string,
  slug: string,
  bio: string,
  linkmagicEmail: string
): Promise<LinkMagicResponse> => {
  return await retryWithBackoff(async () => {
    // Get valid session (with auto-refresh if needed)
    const session = await getValidSession();

    const SUPABASE_URL = 'https://uivgyexyakfincwgghgh.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpdmd5ZXh5YWtmaW5jd2dnaGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MTY4MDYsImV4cCI6MjA4MzI5MjgwNn0.Crz4L5Sbev3Jft6ou1SFz7htpWSWRxVaTaYgDE2DGso';
    
    const url = `${SUPABASE_URL}/functions/v1/linkmagic-proxy`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        title,
        slug,
        bio,
        linkmagic_email: linkmagicEmail,
      }),
      signal: createTimeoutSignal(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API returned ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to create profile');
    }

    return data;
  }, 3, 1000);
};

/**
 * Add a social link to a link page
 * Throws error on failure - NO local fallback
 */
/**
 * Add a social link to a link page
 * CRITICAL: This function should ONLY be called after verifying the link doesn't exist
 * Always check existing links first using fetchLinkPage() before calling this
 * Throws error on failure - NO local fallback
 */
export const addSocialLink = async (
  linkmagicEmail: string,
  icon: string,
  value: string,
  options?: { skipDuplicateCheck?: boolean }
): Promise<LinkMagicResponse> => {
  return await retryWithBackoff(async () => {
    // Get valid session (with auto-refresh if needed)
    const session = await getValidSession();
    
    const SUPABASE_URL = 'https://uivgyexyakfincwgghgh.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpdmd5ZXh5YWtmaW5jd2dnaGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MTY4MDYsImV4cCI6MjA4MzI5MjgwNn0.Crz4L5Sbev3Jft6ou1SFz7htpWSWRxVaTaYgDE2DGso';
    
    if (!options?.skipDuplicateCheck) {
      // CRITICAL: Before adding, verify link doesn't exist to prevent duplicates
      // Fetch current links to check
      const currentData = await fetchLinkPage(linkmagicEmail);
      const existingLinks = currentData.data?.links || currentData.links || [];
      
      // Check if link with same icon already exists
      const linkExists = existingLinks.some((link: any) => {
        return link.icon?.toLowerCase() === icon.toLowerCase();
      });
      
      if (linkExists) {
        if (__DEV__) {
          console.warn(`⚠️ SKIPPING add_link for ${icon} - link already exists in API (preventing duplicate)`);
        }
        // Return success but indicate it was skipped
        return {
          success: true,
          skipped: true,
          message: `Link with icon ${icon} already exists, skipped to prevent duplicate`,
        };
      }
    }
    
    const url = `${SUPABASE_URL}/functions/v1/linkmagic-proxy`;
    
    if (__DEV__) {
      console.log(`📤 Adding NEW link: icon=${icon}, value=${value.substring(0, 20)}...`);
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        action: 'add_link',
        icon,
        value,
        linkmagic_email: linkmagicEmail,
      }),
      signal: createTimeoutSignal(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API returned ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to add link');
    }

    if (__DEV__) {
      console.log(`✅ Link added successfully: ${icon}`);
    }

    return data;
  }, 3, 1000);
};

/**
 * Update a link page (display name, bio, theme, avatar)
 * Throws error on failure - NO local fallback
 */
export const updateLinkPage = async (
  linkmagicEmail: string,
  updates: {
    display_name?: string;
    bio?: string;
    themeId?: string;
    avatar_url?: string;
  },
  slug?: string // Optional slug for creating new pages
): Promise<LinkMagicResponse> => {
  return await retryWithBackoff(async () => {
    // Get valid session (with auto-refresh if needed)
    const session = await getValidSession();

    const SUPABASE_URL = 'https://uivgyexyakfincwgghgh.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpdmd5ZXh5YWtmaW5jd2dnaGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MTY4MDYsImV4cCI6MjA4MzI5MjgwNn0.Crz4L5Sbev3Jft6ou1SFz7htpWSWRxVaTaYgDE2DGso';
    
    // First, check if the page exists
    const checkUrl = `${SUPABASE_URL}/functions/v1/linkmagic-proxy?linkmagic_email=${encodeURIComponent(linkmagicEmail)}`;
    const checkResponse = await fetch(checkUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      signal: createTimeoutSignal(),
    });

    const checkData = await checkResponse.json().catch(() => ({}));
    const pageExists = checkData.success && checkData.client && !checkData.not_found;

    // If page doesn't exist and we have a slug, create it first
    if (!pageExists && slug && updates.display_name) {
      if (__DEV__) {
        console.log('📝 Page does not exist, creating new page with slug:', slug);
      }
      
      const createUrl = `${SUPABASE_URL}/functions/v1/linkmagic-proxy`;
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          title: updates.display_name,
          slug: slug,
          bio: updates.bio || '',
          linkmagic_email: linkmagicEmail,
        }),
        signal: createTimeoutSignal(),
      });

      if (!createResponse.ok) {
        let createErrorData: any = {};
        try {
          const createErrorText = await createResponse.text();
          createErrorData = createErrorText ? JSON.parse(createErrorText) : {};
        } catch {
          // Ignore JSON parse errors
        }
        
        if (__DEV__) {
          console.error('❌ createLinkPage error:', createResponse.status, createErrorData);
        }
        
        throw new Error(createErrorData.error || createErrorData.message || `Failed to create page: ${createResponse.status}`);
      }

      const createData = await createResponse.json();
      
      // If creation was successful, now update with theme and avatar if provided
      if (createData.success && (updates.themeId || updates.avatar_url)) {
        // Continue to PATCH update below
      } else {
        return createData;
      }
    }
    
    // Update existing page (or newly created page with theme/avatar)
    const url = `${SUPABASE_URL}/functions/v1/linkmagic-proxy`;

    if (__DEV__) {
      console.log('📤 PATCH request to linkmagic-proxy:', {
        display_name: updates.display_name,
        bio: updates.bio,
        theme: updates.themeId,
        avatar_url: updates.avatar_url,
        linkmagic_email: linkmagicEmail,
      });
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        display_name: updates.display_name,
        bio: updates.bio,
        theme: updates.themeId,
        avatar_url: updates.avatar_url,
        linkmagic_email: linkmagicEmail,
      }),
      signal: createTimeoutSignal(),
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        const errorText = await response.text();
        errorData = errorText ? JSON.parse(errorText) : {};
      } catch {
        // Ignore JSON parse errors
      }
      
      if (__DEV__) {
        console.error('❌ updateLinkPage error:', response.status, errorData);
        console.error('❌ Request body:', JSON.stringify({
          display_name: updates.display_name,
          bio: updates.bio,
          theme: updates.themeId,
          avatar_url: updates.avatar_url,
          linkmagic_email: linkmagicEmail,
        }, null, 2));
      }
      
      throw new Error(errorData.error || errorData.message || `API returned ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      if (__DEV__) {
        console.error('❌ updateLinkPage response not successful:', data);
      }
      throw new Error(data.error || data.message || 'Failed to update profile');
    }

    return data;
  }, 3, 1000);
};

/**
 * Delete a social link from a link page
 * Throws error on failure - NO local fallback
 */
export const deleteSocialLink = async (
  linkmagicEmail: string,
  icon: string
): Promise<LinkMagicResponse> => {
  return await retryWithBackoff(async () => {
    // Get valid session (with auto-refresh if needed)
    const session = await getValidSession();

    const SUPABASE_URL = 'https://uivgyexyakfincwgghgh.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpdmd5ZXh5YWtmaW5jd2dnaGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MTY4MDYsImV4cCI6MjA4MzI5MjgwNn0.Crz4L5Sbev3Jft6ou1SFz7htpWSWRxVaTaYgDE2DGso';
    
    const url = `${SUPABASE_URL}/functions/v1/linkmagic-proxy`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        action: 'delete_link',
        icon,
        linkmagic_email: linkmagicEmail,
      }),
      signal: createTimeoutSignal(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API returned ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete link');
    }

    return data;
  }, 3, 1000);
};

/**
 * Delete a social link by icon + value (links-api)
 * Uses linkmagic_email as user_email and does NOT require auth headers
 */
export const deleteSocialLinkByIconValue = async (
  linkmagicEmail: string,
  icon: string,
  value: string
): Promise<LinkMagicResponse> => {
  return await retryWithBackoff(async () => {
    const response = await fetch(REKTO_LINKS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'delete_by_icon_value',
        user_email: linkmagicEmail,
        icon,
        value,
      }),
      signal: createTimeoutSignal(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to delete link');
    }

    return data;
  }, 3, 1000);
};

/**
 * Fetch available themes from API
 * Throws error on failure - NO local fallback
 */
export interface ThemeApiResponse {
  success: boolean;
  data?: {
    themes?: Array<{
      id: string;
      name: string;
      category: 'men' | 'women';
      preview_image_url?: string;
      styling?: {
        backgroundGradient?: string[];
        backgroundColor?: string;
        cardBackground?: string;
        textColor?: string;
        buttonStyle?: string;
      };
    }>;
  };
  error?: string;
}

export const fetchThemes = async (): Promise<ThemeApiResponse> => {
  return await retryWithBackoff(async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(
      'https://uivgyexyakfincwgghgh.supabase.co/functions/v1/links-themes',
      {
        method: 'GET',
        headers,
      signal: createTimeoutSignal(),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API returned ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch themes');
    }
    
    return data;
  }, 3, 1000);
};
