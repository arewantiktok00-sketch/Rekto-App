import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';

/** Placeholder for SF Symbol (expo-symbols removed). Use lucide-react-native or react-native-vector-icons for icons. */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  name: string;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: string;
}) {
  return <View style={[{ width: size, height: size, backgroundColor: 'transparent' }, style]} />;
}
