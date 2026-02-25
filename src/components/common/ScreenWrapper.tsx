import React, { ReactNode } from 'react';
import { View, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';

interface ScreenWrapperProps {
  children: ReactNode;
  backgroundColor?: string;
}

export function ScreenWrapper({ children, backgroundColor }: ScreenWrapperProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const bgColor = backgroundColor || colors.background.DEFAULT;

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent={true}
      />
      <View style={{ 
        flex: 1, 
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}>
        {children}
      </View>
    </View>
  );
}
