import React from 'react';
import { TextProps } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTypographyStyles, TypographyStyles } from '@/theme/typography';
import { Text as BrandText } from '@/components/common/Text';

interface TypographyTextProps extends TextProps {
  variant?: keyof TypographyStyles;
  children: React.ReactNode;
}

/**
 * TypographyText - A Text component that automatically applies typography styles
 * based on the current language. Use this instead of regular Text for consistent spacing.
 */
export const TypographyText: React.FC<TypographyTextProps> = ({
  variant = 'body',
  style,
  children,
  ...props
}) => {
  const { language } = useLanguage();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const typographyStyle = typography[variant];

  return (
    <BrandText style={[typographyStyle, style]} {...props}>
      {children}
    </BrandText>
  );
};
