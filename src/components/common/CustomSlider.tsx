import React, { useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

interface CustomSliderProps {
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

/**
 * Pure-JS slider. Works inside ScrollView.
 * FIX 1/2: Capture gestures before ScrollView.
 * FIX 3: Snap value on finger lift.
 * FIX 4/5: range <= 0 guard.
 */
export const CustomSlider: React.FC<CustomSliderProps> = ({
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
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const lastValue = useRef(value);
  const range = maximumValue - minimumValue;

  const clamp = (v: number) =>
    Math.min(maximumValue, Math.max(minimumValue, v));

  const toValue = (ratio: number) => {
    if (range <= 0) return minimumValue;
    const v = minimumValue + ratio * range;
    const stepped = step > 0 ? Math.round(v / step) * step : v;
    return clamp(stepped);
  };

  const getRatio = (evt: any) => {
    const w = trackWidthRef.current;
    if (w <= 0) return -1;
    return Math.max(0, Math.min(1, evt.nativeEvent.locationX / w));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (evt) => {
        const ratio = getRatio(evt);
        if (ratio < 0) return;
        const v = toValue(ratio);
        lastValue.current = v;
        onValueChange(v);
      },

      onPanResponderMove: (evt) => {
        const ratio = getRatio(evt);
        if (ratio < 0) return;
        const v = toValue(ratio);
        if (v !== lastValue.current) {
          lastValue.current = v;
          onValueChange(v);
        }
      },

      onPanResponderRelease: (evt) => {
        const ratio = getRatio(evt);
        if (ratio < 0) return;
        const v = toValue(ratio);
        lastValue.current = v;
        onValueChange(v);
      },
    })
  ).current;

  const ratio = range > 0 ? (value - minimumValue) / range : 0;
  const thumbLeft = trackWidth > 0 ? ratio * (trackWidth - THUMB_SIZE) : 0;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e?.nativeEvent?.layout?.width ?? 0;
    if (w > 0) {
      setTrackWidth(w);
      trackWidthRef.current = w;
    }
  };

  return (
    <View
      style={[styles.container, style]}
      onLayout={onLayout}
      {...panResponder.panHandlers}
      collapsable={false}
    >
      <View style={[styles.track, { backgroundColor: maximumTrackTintColor }]}>
        <View
          style={[
            styles.fill,
            {
              width: trackWidth > 0 ? `${ratio * 100}%` : 0,
              backgroundColor: minimumTrackTintColor,
            },
          ]}
        />
      </View>
      <View
        style={[
          styles.thumb,
          { left: thumbLeft, backgroundColor: thumbTintColor },
        ]}
      />
    </View>
  );
};

const THUMB_SIZE = 24;
const styles = StyleSheet.create({
  container: { height: 40, justifyContent: 'center', width: '100%' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', width: '100%' },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    top: (40 - THUMB_SIZE) / 2,
    marginLeft: -THUMB_SIZE / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
});
