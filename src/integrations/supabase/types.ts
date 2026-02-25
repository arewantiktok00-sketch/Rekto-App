// This file will be auto-generated from your Supabase project
// For now, we'll use a basic type structure
// You should generate this using: npx supabase gen types typescript --project-id <your-project-id>

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          email: string | null;
          phone_number: string | null;
          phone_verified: boolean;
          email_verified: boolean;
          auth_provider: 'email' | 'phone' | 'google';
          wallet_balance: number;
          avatar_url: string | null;
          can_extend_ads: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      campaigns: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          video_url: string;
          objective: 'views' | 'conversions';
          status: string;
          daily_budget: number;
          duration_days: number;
          total_budget: number;
          target_age_min: number | null;
          target_age_max: number | null;
          target_gender: 'all' | 'male' | 'female';
          target_audience: 'all' | 'arab' | 'kurdish';
          target_countries: string[];
          target_languages: string[] | null;
          interactive_addon_id: string | null;
          destination_url: string | null;
          caption: string | null;
          call_to_action: string | null;
          spend: number;
          views: number;
          clicks: number;
          leads: number;
          tiktok_campaign_id: string | null;
          tiktok_adgroup_id: string | null;
          tiktok_ad_id: string | null;
          tiktok_campaign_status: string | null;
          tiktok_adgroup_status: string | null;
          tiktok_ad_status: string | null;
          tiktok_rejection_reason: string | null;
          tiktok_public_url: string | null;
          tiktok_video_id: string | null;
          api_error: string | null;
          started_at: string | null;
          completed_at: string | null;
          last_synced_at: string | null;
          real_budget: number | null;
          real_end_date: string | null;
          target_spend: number | null;
          daily_target_spend: number | null;
          uses_extended_schedule: boolean;
          double_time_applied: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['campaigns']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['campaigns']['Insert']>;
      };
      // Add other tables as needed
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
