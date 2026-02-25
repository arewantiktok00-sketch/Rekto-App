/**
 * RTL helper for Kurdish/Arabic-only app.
 */
import { TextStyle, ViewStyle } from 'react-native';
export const isRTL = (_lang: string): boolean => true;

export const rtlText = (): TextStyle => ({
  textAlign: 'left',
  writingDirection: 'rtl',
});

export const rtlInput = (): TextStyle & ViewStyle => ({
  textAlign: 'left',
  writingDirection: 'rtl',
  paddingStart: 12,
  paddingEnd: 12,
});

export const ltrNumber: TextStyle = {
  textAlign: 'left',
  writingDirection: 'ltr',
};

// With I18nManager.forceRTL enabled app-wide, plain `row` mirrors automatically in RTL.
// Keep helper for compatibility so call sites don't need refactors.
export const rtlRow = (): ViewStyle => ({
  flexDirection: 'row',
});

export const rtlIcon = (): { transform: { scaleX: number }[] } => ({
  transform: [{ scaleX: -1 }],
});

// Backward compatibility aliases
export const textLTR = ltrNumber;
export const ltrNumberStyle: TextStyle = { ...ltrNumber, fontFamily: 'Poppins-Bold' };
export const iconTransformRTL = () => rtlIcon();
export const inputStyleRTL = () => rtlInput();
export function labelStyleRTL(_rtl?: boolean, _weight?: 'regular' | 'semibold', _opts?: { alignSelf?: boolean }): TextStyle {
  return rtlText();
}
export function centerLabelStyleRTL(_rtl?: boolean): TextStyle {
  return { textAlign: 'center' as const, ...rtlText() };
}
