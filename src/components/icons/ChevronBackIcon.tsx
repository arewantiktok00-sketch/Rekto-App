import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Back chevron icon — same shape as chevron-right.svg (Tabler).
 * LTR: chevron pointing left (flip). RTL: chevron pointing right (no flip).
 */
const PATH_CHEVRON_RIGHT =
  'M9.707 5.293l6 6a1 1 0 0 1 0 1.414l-6 6a1 1 0 1 1 -1.414 -1.414l5.293 -5.293l-5.293 -5.293a1 1 0 0 1 1.414 -1.414';

export function ChevronBackIcon({
  size = 24,
  color = 'currentColor',
  isRTL = false,
}: {
  size?: number;
  color?: string;
  isRTL?: boolean;
}) {
  const svg = (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path fill={color} d={PATH_CHEVRON_RIGHT} />
    </Svg>
  );

  if (isRTL) return svg;
  return <View style={{ transform: [{ scaleX: -1 }] }}>{svg}</View>;
}
