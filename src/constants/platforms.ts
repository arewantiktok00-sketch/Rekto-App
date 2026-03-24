import { BrandSnapchatIcon } from '@/components/icons/BrandSnapchatIcon';
import { SocialTikTokIcon } from '@/components/icons/SocialTikTokIcon';
import { SocialYoutubeIcon } from '@/components/icons/SocialYoutubeIcon';
import {
  Facebook,
  Globe,
  Instagram,
  MessageCircle,
  Phone,
  Send,
  Smartphone,
  Store
} from 'lucide-react-native';

export interface Platform {
  id: string;
  label: string;
  labelKu: string;
  /** Short hint shown on the platform selector button (e.g. "Phone number", "Username"). Edit here to change hints for all buttons. */
  hint: string;
  /** Kurdish hint for the platform button. */
  hintKu: string;
  color: string | ((colors: any) => string);
  placeholder: string;
  icon: any;
}

/**
 * Platform list for Link Editor. To change the hint shown on each platform button:
 * Edit the "hint" (English) and "hintKu" (Kurdish) fields below for each platform.
 */
export const PLATFORMS: Platform[] = [
  { 
    id: 'whatsapp', 
    label: 'WhatsApp', 
    labelKu: 'واتساپ', 
    hint: 'Phone number',
    hintKu: 'سەرەتای ژمارەکەت بەم شێوەیە بێت (750)',
    color: '#25D366', 
    placeholder: '+964 750 XXX XXXX',
    icon: MessageCircle
  },
  { 
    id: 'viber', 
    label: 'Viber', 
    labelKu: 'ڤایبەر', 
    hint: 'Phone number',
    hintKu: 'سەرەتای ژمارەکەت بەم شێوەیە بێت (750)',
    color: '#7360F2', 
    placeholder: '+964 XXX XXX XXXX',
    icon: MessageCircle
  },
  { 
    id: 'instagram', 
    label: 'Instagram', 
    labelKu: 'ئینستاگرام', 
    hint: 'Username or profile link',
    hintKu: 'ناو بەکارهێنەر (یوزەرنەیم)',
    color: '#E4405F', 
    placeholder: '@yourusername',
    icon: Instagram
  },
  { 
    id: 'snapchat', 
    label: 'Snapchat', 
    labelKu: 'سناپچات', 
    hint: 'Username',
    hintKu: 'ناو بەکارهێنەر (یوزەرنەیم)',
    color: '#FFFC00', 
    placeholder: '@yourusername',
    icon: BrandSnapchatIcon
  },
  { 
    id: 'tiktok', 
    label: 'TikTok', 
    labelKu: 'تیکتۆک', 
    hint: 'Username',
    hintKu: 'ناو بەکارهێنەر (یوزەرنەیم)',
    color: '#000000', 
    placeholder: '@yourusername',
    icon: SocialTikTokIcon
  },
  { 
    id: 'youtube', 
    label: 'YouTube', 
    labelKu: 'یوتیوب', 
    hint: 'Channel',
    hintKu: 'کەناڵ',
    color: '#FF0000', 
    placeholder: '@yourchannel',
    icon: SocialYoutubeIcon
  },
  { 
    id: 'facebook', 
    label: 'Facebook', 
    labelKu: 'فەیسبووک', 
    hint: 'Page name or profile link',
    hintKu: 'ناوی پەڕە یان لینکی پڕۆفایل',
    color: '#1877F2', 
    placeholder: 'yourpage',
    icon: Facebook
  },
  { 
    id: 'telegram', 
    label: 'Telegram', 
    labelKu: 'تێلەگرام', 
    hint: 'Username',
    hintKu: 'ناو بەکارهێنەر (یوزەرنەیم) ',
    color: '#26A5E4', 
    placeholder: '@yourusername',
    icon: Send
  },
  { 
    id: 'website', 
    label: 'Website', 
    labelKu: 'وێبسایت', 
    hint: 'Full URL',
    hintKu: 'بەستەری تەواو',
    color: '#334155', 
    placeholder: 'https://yourwebsite.com',
    icon: Globe
  },
  { 
    id: 'app_store', 
    label: 'App Store', 
    labelKu: 'ئەپ ستۆر', 
    hint: 'App Store link',
    hintKu: 'لینکی ئەپ ستۆر',
    color: (colors: any) => colors.foreground.DEFAULT,
    placeholder: 'https://apps.apple.com/...',
    icon: Store
  },
  { 
    id: 'google_play', 
    label: 'Google Play', 
    labelKu: 'گووگڵ پلەی', 
    hint: 'Play Store link',
    hintKu: 'لینکی پلەی ستۆر',
    color: '#00C853', 
    placeholder: 'https://play.google.com/store/apps/...',
    icon: Store
  },
  { 
    id: 'korek_phone', 
    label: 'Korek', 
    labelKu: 'کۆڕەک', 
    hint: 'Phone number',
    hintKu: 'سەرەتای ژمارەکەت بەم شێوەیە بێت (750)',
    color: '#39aaff', 
    placeholder: '075X XXX XXXX',
    icon: Smartphone
  },
  { 
    id: 'asiacell_phone', 
    label: 'Asiacell', 
    labelKu: 'ئاسیاسێڵ', 
    hint: 'Phone number',
    hintKu: 'سەرەتای ژمارەکەت بەم شێوەیە بێت (770)',
    color: '#E31E24', 
    placeholder: '077X XXX XXXX',
    icon: Smartphone
  },
  { 
    id: 'zain_phone', 
    label: 'Zain', 
    labelKu: 'زەین', 
    hint: 'Phone number',
    hintKu: 'سەرەتای ژمارەکەت بەم شێوەیە بێت (780)',
    color: '#ac54ff', 
    placeholder: '078X XXX XXXX',
    icon: Smartphone
  },
];

export const ICON_MAP: Record<string, string> = {
  whatsapp: 'whatsapp',
  viber: 'viber',
  instagram: 'instagram',
  snapchat: 'snapchat',
  tiktok: 'tiktok',
  youtube: 'youtube',
  facebook: 'facebook',
  telegram: 'telegram',
  website: 'website',
  korek_phone: 'korek',
  asiacell_phone: 'asiacell',
  zain_phone: 'zain',
  app_store: 'appstore',
  google_play: 'playstore',
};

/** Reverse: icon name (from API/DB) → platform id. Used when mapping link_social_data to form. */
export const REVERSE_ICON_MAP: Record<string, string> = {
  whatsapp: 'whatsapp',
  viber: 'viber',
  instagram: 'instagram',
  snapchat: 'snapchat',
  tiktok: 'tiktok',
  youtube: 'youtube',
  facebook: 'facebook',
  telegram: 'telegram',
  website: 'website',
  korek: 'korek_phone',
  asiacell: 'asiacell_phone',
  zain: 'zain_phone',
  appstore: 'app_store',
  playstore: 'google_play',
};

/** link_social_data column names for each platform. platform id → db column (same for these). */
export const PLATFORM_FIELDS: Record<string, string> = {
  whatsapp: 'whatsapp',
  viber: 'viber',
  instagram: 'instagram',
  snapchat: 'snapchat',
  tiktok: 'tiktok',
  youtube: 'youtube',
  facebook: 'facebook',
  telegram: 'telegram',
  website: 'website',
  korek_phone: 'korek_phone',
  asiacell_phone: 'asiacell_phone',
  zain_phone: 'zain_phone',
  app_store: 'app_store',
  google_play: 'google_play',
};

export const CTA_OPTIONS = [
  { 
    id: 'contact_us', 
    label: 'Contact Us', 
    labelKu: 'پەیوەندیمان پێوە بکە', 
    tiktokValue: 'CONTACT_US',
    icon: Phone
  },
  { 
    id: 'send_message', 
    label: 'Send Message', 
    labelKu: 'پەیام بنێرە', 
    tiktokValue: 'SEND_MESSAGE',
    icon: MessageCircle
  },
];

export interface Theme {
  id: string;
  name: string;
  label: string;
  labelKu: string;
  category: 'elegant' | 'classic'; // elegant = women, classic = men
  colors: {
    bg: string;
    bgGradient?: string[];
    card: string;
    text: string;
  };
}

export const THEMES: Theme[] = [
  // Elegant (Women's) Themes
  {
    id: 'soft-floral-luxury',
    name: 'Soft Floral Luxury',
    label: 'Soft Floral Luxury',
    labelKu: 'Soft Floral Luxury',
    category: 'elegant',
    colors: {
      bg: '#FFE4EC',
      bgGradient: ['#FFE4EC', '#E9D5FF'],
      card: '#FFFFFF',
      text: '#1A1A2E',
    },
  },
  {
    id: 'warm-elegant-glow',
    name: 'Warm Elegant Glow',
    label: 'Warm Elegant Glow',
    labelKu: 'Warm Elegant Glow',
    category: 'elegant',
    colors: {
      bg: '#FFF8E1',
      bgGradient: ['#FFF8E1', '#FFE0B2'],
      card: '#FFFFFF',
      text: '#1A1A2E',
    },
  },
  {
    id: 'light-legacy',
    name: 'Light (Legacy)',
    label: 'Light (Legacy)',
    labelKu: 'Light (Legacy)',
    category: 'elegant',
    colors: {
      bg: '#FFFFFF',
      card: '#F8FAFC',
      text: '#1A1A2E',
    },
  },
  // Classic (Men's) Themes
  {
    id: 'dark-professional',
    name: 'Dark Professional',
    label: 'Dark Professional',
    labelKu: 'Dark Professional',
    category: 'classic',
    colors: {
      bg: '#0A1628',
      card: 'rgba(255,255,255,0.1)',
      text: '#FFFFFF',
    },
  },
  {
    id: 'minimal-tech',
    name: 'Minimal Tech',
    label: 'Minimal Tech',
    labelKu: 'Minimal Tech',
    category: 'classic',
    colors: {
      bg: '#1E1B4B',
      bgGradient: ['#1E1B4B', '#312E81'],
      card: 'rgba(255,255,255,0.15)',
      text: '#FFFFFF',
    },
  },
  {
    id: 'natural-professional',
    name: 'Natural Professional',
    label: 'Natural Professional',
    labelKu: 'Natural Professional',
    category: 'classic',
    colors: {
      bg: '#F5F5F5',
      card: '#FFFFFF',
      text: '#1A1A2E',
    },
  },
  {
    id: 'outdoor-lifestyle',
    name: 'Outdoor Lifestyle',
    label: 'Outdoor Lifestyle',
    labelKu: 'Outdoor Lifestyle',
    category: 'classic',
    colors: {
      bg: '#1E3A5F',
      bgGradient: ['#1E3A5F', '#2D4A6B'],
      card: 'rgba(255,255,255,0.2)',
      text: '#FFFFFF',
    },
  },
  {
    id: 'dark-legacy',
    name: 'Dark (Legacy)',
    label: 'Dark (Legacy)',
    labelKu: 'Dark (Legacy)',
    category: 'classic',
    colors: {
      bg: '#1A1A2E',
      card: 'rgba(255,255,255,0.1)',
      text: '#FFFFFF',
    },
  },
];
