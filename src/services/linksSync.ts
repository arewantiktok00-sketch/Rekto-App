import { supabaseRead } from '@/integrations/supabase/client';

export const syncUserLinks = async (userId: string) => {
  if (!userId) return { links: [], socialMap: {} };

  const { data: links } = await supabaseRead
    .from('user_links')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const linksData = links || [];

  let socialMap: Record<string, any> = {};
  if (linksData.length > 0) {
    const linkIds = linksData.map((link) => link.id);
    const { data: socialData } = await supabaseRead
      .from('link_social_data')
      .select('*')
      .in('link_id', linkIds)
      .eq('user_id', userId);

    if (socialData) {
      socialData.forEach((social) => {
        socialMap[social.link_id] = social;
      });
    }
  }

  return { links: linksData, socialMap };
};
