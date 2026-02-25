import { useLanguage } from '@/contexts/LanguageContext';
import { getOwnerColors } from '@/theme/colors';
import { getFontFamilyByLanguage } from '@/utils/fonts';
import {
    Activity,
    Bell,
    Building2,
    ClipboardCheck,
    DollarSign,
    FileText,
    Gift,
    HelpCircle,
    Image,
    Key,
    Megaphone,
    MousePointer2,
    Percent,
    Settings,
    Shield,
    ShieldCheck,
    Star,
    UserCheck,
    Users,
    Video,
    X,
} from 'lucide-react-native';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  category: string;
}

const NAV_ITEMS: NavItem[] = [
  // Main
  {
    id: 'review',
    label: 'Ad Review',
    icon: <ClipboardCheck size={20} />,
    category: 'main',
  },
  {
    id: 'featured',
    label: 'Featured Ad',
    icon: <Star size={20} />,
    category: 'main',
  },
  {
    id: 'app-control',
    label: 'App Control',
    icon: <Settings size={20} />,
    category: 'main',
  },
  {
    id: 'banner',
    label: 'Banner Content',
    icon: <Image size={20} />,
    category: 'main',
  },
  {
    id: 'promo',
    label: 'Promo Banner',
    icon: <Gift size={20} />,
    category: 'main',
  },
  // TikTok
  {
    id: 'health',
    label: 'Health',
    icon: <Activity size={20} />,
    category: 'tiktok',
  },
  {
    id: 'api',
    label: 'API Settings',
    icon: <Key size={20} />,
    category: 'tiktok',
  },
  {
    id: 'accounts',
    label: 'Business Center',
    icon: <Building2 size={20} />,
    category: 'tiktok',
  },
  {
    id: 'buttons',
    label: 'Buttons',
    icon: <MousePointer2 size={20} />,
    category: 'tiktok',
  },
  // Content
  {
    id: 'faqs',
    label: 'FAQs',
    icon: <HelpCircle size={20} />,
    category: 'content',
  },
  {
    id: 'tutorials',
    label: 'Tutorials',
    icon: <Video size={20} />,
    category: 'content',
  },
  {
    id: 'announcement',
    label: 'Popup Announce',
    icon: <Megaphone size={20} />,
    category: 'content',
  },
  // Users
  {
    id: 'users',
    label: 'Users',
    icon: <Users size={20} />,
    category: 'users',
  },
  {
    id: 'permissions',
    label: 'Permissions',
    icon: <Shield size={20} />,
    category: 'users',
  },
  {
    id: 'admins',
    label: 'Admins',
    icon: <ShieldCheck size={20} />,
    category: 'users',
  },
  {
    id: 'reviewers',
    label: 'Reviewers',
    icon: <UserCheck size={20} />,
    category: 'users',
  },
  // Finance
  {
    id: 'pricing',
    label: 'Pricing',
    icon: <DollarSign size={20} />,
    category: 'finance',
  },
  {
    id: 'discounts',
    label: 'Discounts',
    icon: <Percent size={20} />,
    category: 'finance',
  },
  // System
  {
    id: 'logs',
    label: 'Logs',
    icon: <FileText size={20} />,
    category: 'system',
  },
  {
    id: 'broadcast',
    label: 'Broadcast',
    icon: <Bell size={20} />,
    category: 'system',
  },
];

const CATEGORIES = [
  { id: 'main', label: 'Main' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'content', label: 'Content' },
  { id: 'users', label: 'Users' },
  { id: 'finance', label: 'Finance' },
  { id: 'system', label: 'System' },
];

interface OwnerDrawerNavProps {
  visible: boolean;
  activeTab: string;
  onClose: () => void;
  onTabChange: (tabId: string) => void;
  isReviewerOnly?: boolean;
}

export const OwnerDrawerNav: React.FC<OwnerDrawerNavProps> = ({
  visible,
  activeTab,
  onClose,
  onTabChange,
  isReviewerOnly = false,
}) => {
  const colors = getOwnerColors();
  const { language } = useLanguage();
  const fontFamily = getFontFamilyByLanguage((language || 'ckb') as 'ckb' | 'ar');
  const styles = createStyles(colors, fontFamily);

  if (!visible) return null;

  const handleItemPress = (tabId: string) => {
    onTabChange(tabId);
    onClose();
  };

  // Filter items based on reviewer access
  const getFilteredItems = () => {
    if (isReviewerOnly) {
      return NAV_ITEMS.filter((item) => item.id === 'review');
    }
    return NAV_ITEMS;
  };

  const filteredItems = getFilteredItems();

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={styles.drawer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Navigation</Text>
          <TouchableOpacity onPress={onClose}>
            <X color={colors.foreground.DEFAULT} size={24} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {CATEGORIES.map((category) => {
            const categoryItems = filteredItems.filter(
              (item) => item.category === category.id
            );
            if (categoryItems.length === 0) return null;

            return (
              <View key={category.id} style={styles.category}>
                <Text style={styles.categoryLabel}>{category.label}</Text>
                {categoryItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.navItem,
                        isActive && styles.activeNavItem,
                      ]}
                      onPress={() => handleItemPress(item.id)}
                    >
                      <View
                        style={[
                          styles.iconContainer,
                          isActive && styles.activeIconContainer,
                        ]}
                      >
                        {React.cloneElement(item.icon as React.ReactElement, {
                          color: isActive ? '#7C3AED' : '#A1A1AA',
                        })}
                      </View>
                      <Text
                        style={[
                          styles.navLabel,
                          isActive && styles.activeNavLabel,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const createStyles = (colors: any, fontFamily: string) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 100,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay.dark,
    },
  drawer: {
    position: 'absolute',
    top: 0,
    start: 0,
    bottom: 0,
    width: 280,
    backgroundColor: colors.background.DEFAULT,
    borderEndWidth: 1,
    borderEndColor: colors.border.DEFAULT,
  },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
  headerTitle: {
    fontSize: 18,
    fontFamily: fontFamily === 'Rabar_021' ? 'Rabar_021' : 'Poppins-SemiBold',
    color: colors.foreground.DEFAULT,
  },
    content: {
      flex: 1,
    },
    category: {
      padding: 16,
    },
  categoryLabel: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
    color: colors.foreground.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      gap: 12,
      marginBottom: 4,
    },
  activeNavItem: {
    backgroundColor: colors.primary.DEFAULT + '25',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.overlay.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIconContainer: {
    backgroundColor: colors.primary.DEFAULT + '30',
  },
  navLabel: {
    fontSize: 14,
    fontFamily: fontFamily === 'Rabar_021' ? 'Rabar_021' : 'Poppins-Medium',
    color: colors.foreground.muted,
  },
  activeNavLabel: {
    color: colors.foreground.DEFAULT,
    fontFamily: fontFamily === 'Rabar_021' ? 'Rabar_021' : 'Poppins-SemiBold',
  },
  });
