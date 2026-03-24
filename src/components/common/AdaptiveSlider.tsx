import React from 'react';
import { Platform, StyleProp, View, ViewStyle } from 'react-native';
import Slider from '@react-native-community/slider';

export interface AdaptiveSliderProps {
  minimumValue: number;
  maximumValue: number;
  step: number;
  value: number;
  onValueChange: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  style?: StyleProp<ViewStyle>;
}

const SLIDER_HEIGHT = Platform.OS === 'ios' ? 28 : 40;

/**
 * Official @react-native-community/slider. LTR only (min left, max right).
 */
export const AdaptiveSlider: React.FC<AdaptiveSliderProps> = ({
  minimumValue,
  maximumValue,
  step,
  value,
  onValueChange,
  minimumTrackTintColor = '#7C3AED',
  maximumTrackTintColor = '#E4E4E7',
  thumbTintColor = '#7C3AED',
  style,
}) => {
  return (
    <View style={[{ width: '100%', height: SLIDER_HEIGHT, justifyContent: 'center' }, style]}>
      <Slider
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        value={value}
        onValueChange={onValueChange}
        minimumTrackTintColor={minimumTrackTintColor}
        maximumTrackTintColor={maximumTrackTintColor}
        thumbTintColor={thumbTintColor}
        style={{ width: '100%', height: SLIDER_HEIGHT }}
      />
    </View>
  );
};
