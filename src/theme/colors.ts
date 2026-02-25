// Design system colors - Light Theme (Default) + Dark Theme Support
export const colors = {
  light: {
    // Primary Purple (Brand)
    primary: {
      DEFAULT: '#7C3AED',      // HSL(262, 83%, 58%) - Main purple
      light: '#A78BFA',        // HSL(262, 83%, 68%) - Light purple
      dark: '#6D28D9',         // HSL(262, 83%, 45%) - Dark purple
      foreground: '#FFFFFF',   // Text on primary buttons
    },

    // Background Colors (Light Theme)
    background: {
      DEFAULT: '#FAFAFA',      // Main app background
      secondary: '#F4F4F5',    // Secondary surfaces
      tertiary: '#F4F4F5',     // Elevated surfaces
    },

    // Foreground (Text) Colors
    foreground: {
      DEFAULT: '#18181B',      // Primary text
      muted: '#71717A',        // Secondary text
      subtle: '#A1A1AA',       // Tertiary text
    },

    // Border Colors
    border: {
      DEFAULT: '#E4E4E7',      // Default borders
      light: '#F4F4F5',        // Light borders
      focus: '#7C3AED',        // Focus state border
    },

    // Semantic Colors
    success: '#10B981',        // Green
    warning: '#F59E0B',        // Orange/Amber
    error: '#EF4444',          // Red
    info: '#3B82F6',           // Blue

    // Status Badge Colors
    status: {
      draft: { bg: '#F3F4F6', text: '#6B7280' },
      pending: { bg: '#FEF3C7', text: '#92400E' },
      awaiting_payment: { bg: '#FED7AA', text: '#7C2D12' },
      under_review: { bg: '#DBEAFE', text: '#1E40AF' },
      scheduled: { bg: '#EDE9FE', text: '#5B21B6' },
      active: { bg: '#D1FAE5', text: '#065F46' },
      paused: { bg: '#FEF3C7', text: '#92400E' },
      completed: { bg: '#F3F4F6', text: '#4B5563' },
      rejected: { bg: '#FEE2E2', text: '#991B1B' },
    },

    // Overlay Colors
    overlay: {
      light: 'rgba(0, 0, 0, 0.04)',
      medium: 'rgba(0, 0, 0, 0.08)',
      dark: 'rgba(0, 0, 0, 0.5)',
    },

    // Input Colors
    input: {
      background: '#E4E4E7',
      border: '#E4E4E7',
      borderFocus: '#7C3AED',
      placeholder: '#71717A',
    },

    // Card Colors
    card: {
      background: '#FFFFFF',
      border: '#E4E4E7',
    },

    // Gradients
    gradients: {
      // Primary button
      primaryButton: {
        colors: ['#7C3AED', '#9333EA'],
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
      },
      // Primary gradient (for cards/banners)
      primary: ['#7C3AED', '#4338CA'],
      card: ['rgba(124, 58, 237, 0.1)', 'transparent'],
    },
  },

  dark: {
    // Primary Purple (Brand)
    primary: {
      DEFAULT: '#8B5CF6',      // HSL(262, 83%, 65%) - Main purple
      light: '#A78BFA',        // Light purple
      dark: '#6D28D9',         // Dark purple
      foreground: '#FFFFFF',   // Text on primary buttons
    },

    // Background Colors (Dark Theme)
    background: {
      DEFAULT: '#0F0F1A',      // Main app background
      secondary: '#2A2A3E',    // Secondary surfaces
      tertiary: '#2A2A3E',     // Elevated surfaces
    },

    // Foreground (Text) Colors
    foreground: {
      DEFAULT: '#FAFAFA',      // Primary text
      muted: '#A1A1AA',        // Secondary text
      subtle: '#A1A1AA',       // Tertiary text
    },

    // Border Colors
    border: {
      DEFAULT: '#2A2A3E',      // Default borders
      light: '#2A2A3E',        // Light borders
      focus: '#8B5CF6',        // Focus state border
    },

    // Semantic Colors
    success: '#22C55E',        // Green
    warning: '#F59E0B',        // Orange/Amber
    error: '#EF4444',          // Red
    info: '#3B82F6',           // Blue

    // Status Badge Colors
    status: {
      draft: { bg: '#374151', text: '#9CA3AF' },
      pending: { bg: '#78350F', text: '#FCD34D' },
      awaiting_payment: { bg: '#7C2D12', text: '#FB923C' },
      under_review: { bg: '#1E3A5F', text: '#60A5FA' },
      scheduled: { bg: '#312E81', text: '#A78BFA' },
      active: { bg: '#14532D', text: '#4ADE80' },
      paused: { bg: '#78350F', text: '#FBBF24' },
      completed: { bg: '#1F2937', text: '#9CA3AF' },
      rejected: { bg: '#7F1D1D', text: '#FCA5A5' },
    },

    // Overlay Colors
    overlay: {
      light: 'rgba(255, 255, 255, 0.04)',
      medium: 'rgba(255, 255, 255, 0.08)',
      dark: 'rgba(0, 0, 0, 0.5)',
    },

    // Input Colors
    input: {
      background: '#2A2A3E',
      border: '#2A2A3E',
      borderFocus: '#8B5CF6',
      placeholder: '#A1A1AA',
    },

    // Card Colors
    card: {
      background: '#1A1A2E',
      border: '#2A2A3E',
    },

    // Gradients
    gradients: {
      // Onboarding background (dark luxury)
      onboardingBackground: {
        colors: ['#0A0A12', '#1A0F2E', '#0A0A0F'],
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
      },
      // Primary button
      primaryButton: {
        colors: ['#8B5CF6', '#7C3AED'],
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
      },
      // Primary gradient (for cards/banners)
      primary: ['#8B5CF6', '#4338CA'],
      card: ['rgba(124, 58, 237, 0.1)', 'transparent'],
    },
  },
};

// Default export - Light theme (main)
export default colors.light;

// Helper to get current theme colors
export const getThemeColors = (theme: 'light' | 'dark' = 'light') => colors[theme];

/** Owner Dashboard: force light theme only. Use everywhere in owner screens. */
export const getOwnerColors = () => ({
  primary: {
    DEFAULT: '#7C3AED',
    foreground: '#FFFFFF',
  },
  background: { DEFAULT: '#FFFFFF', secondary: '#F9FAFB' },
  foreground: { DEFAULT: '#111827', muted: '#6B7280', subtle: '#374151' },
  border: { DEFAULT: '#E5E7EB', light: '#D1D5DB' },
  card: { background: '#F9FAFB', border: '#E5E7EB' },
  input: { background: '#FFFFFF', border: '#D1D5DB', borderFocus: '#7C3AED', placeholder: '#6B7280' },
  success: '#10B981',
  error: '#EF4444',
  overlay: { dark: 'rgba(0,0,0,0.5)' },
  gradients: {
    primaryButton: { colors: ['#7C3AED', '#6D28D9'], start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
  },
});

// Legacy support (for backwards compatibility) - defaults to light
export const gradients = {
  primary: ['#7C3AED', '#4338CA'],
  card: ['rgba(124, 58, 237, 0.1)', 'transparent'],
};

// Re-export commonly used values (light theme by default)
export const primary = colors.light.primary.DEFAULT;
export const background = colors.light.background.DEFAULT;
export const foreground = colors.light.foreground.DEFAULT;
export const muted = colors.light.foreground.muted;
export const border = colors.light.border.DEFAULT;
export const card = colors.light.card.background;
