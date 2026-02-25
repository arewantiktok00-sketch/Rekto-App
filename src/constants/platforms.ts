import { 
  MessageCircle, 
  Phone, 
  Instagram, 
  Facebook, 
  Send,
  Globe,
  Smartphone,
  Store
} from 'lucide-react-native';

export interface Platform {
  id: string;
  label: string;
  labelKu: string;
  color: string | ((colors: any) => string);
  placeholder: string;
  icon: any;
}

export const PLATFORMS: Platform[] = [
  { 
    id: 'whatsapp', 
    label: 'WhatsApp', 
    labelKu: 'واتساپ', 
    color: '#25D366', 
    placeholder: '+964 XXX XXX XXXX',
    icon: MessageCircle
  },
  { 
    id: 'viber', 
    label: 'Viber', 
    labelKu: 'ڤایبەر', 
    color: '#7360F2', 
    placeholder: '+964 XXX XXX XXXX',
    icon: MessageCircle
  },
  { 
    id: 'instagram', 
    label: 'Instagram', 
    labelKu: 'ئینستاگرام', 
    color: '#E4405F', 
    placeholder: '@yourusername',
    icon: Instagram
  },
  { 
    id: 'facebook', 
    label: 'Facebook', 
    labelKu: 'فەیسبووک', 
    color: '#1877F2', 
    placeholder: 'yourpage',
    icon: Facebook
  },
  { 
    id: 'telegram', 
    label: 'Telegram', 
    labelKu: 'تێلەگرام', 
    color: '#26A5E4', 
    placeholder: '@yourusername',
    icon: Send
  },
  { 
    id: 'website', 
    label: 'Website', 
    labelKu: 'وێبسایت', 
    color: '#334155', 
    placeholder: 'https://yourwebsite.com',
    icon: Globe
  },
  { 
    id: 'app_store', 
    label: 'App Store', 
    labelKu: 'ئەپ ستۆر', 
    color: (colors: any) => colors.foreground.DEFAULT,
    placeholder: 'https://apps.apple.com/...',
    icon: Store
  },
  { 
    id: 'google_play', 
    label: 'Google Play', 
    labelKu: 'گووگڵ پلەی', 
    color: '#00C853', 
    placeholder: 'https://play.google.com/store/apps/...',
    icon: Store
  },
  { 
    id: 'korek_phone', 
    label: 'Korek', 
    labelKu: 'کۆڕەک', 
    color: '#E31E24', 
    placeholder: '075X XXX XXXX',
    icon: Smartphone
  },
  { 
    id: 'asiacell_phone', 
    label: 'Asiacell', 
    labelKu: 'ئاسیاسێڵ', 
    color: '#00A651', 
    placeholder: '077X XXX XXXX',
    icon: Smartphone
  },
  { 
    id: 'zain_phone', 
    label: 'Zain', 
    labelKu: 'زەین', 
    color: '#6E2585', 
    placeholder: '078X XXX XXXX',
    icon: Smartphone
  },
];

export const ICON_MAP: Record<string, string> = {
  whatsapp: 'whatsapp',
  viber: 'viber',
  instagram: 'instagram',
  facebook: 'facebook',
  telegram: 'telegram',
  website: 'website',
  korek_phone: 'korek',
  asiacell_phone: 'asiacell',
  zain_phone: 'zain',
  app_store: 'appstore',
  google_play: 'playstore',
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
