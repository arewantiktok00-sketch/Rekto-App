// Spacing scale as per UI Design Spec
export const spacing = {
  // Base spacing units
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,

  // Semantic spacing
  screenPadding: 24,      // Horizontal page padding
  cardPadding: 16,        // Inside cards
  sectionGap: 24,         // Between sections
  itemGap: 12,            // Between list items
  inputGap: 16,           // Between form inputs

  // Legacy support (for backwards compatibility)
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  none: 0,
  sm: 4,
  DEFAULT: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,

  // Semantic radius
  button: 16,             // Primary buttons
  buttonSmall: 12,        // Secondary buttons
  card: 16,               // Cards
  cardLarge: 24,          // Large cards (onboarding)
  input: 12,              // Text inputs
  badge: 9999,            // Status badges (pill shape)
  avatar: 9999,           // Avatars (circular)
  bottomSheet: 24,        // Top corners of bottom sheets
};
