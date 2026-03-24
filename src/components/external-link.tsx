import React from 'react';
import { Linking, TouchableOpacity, type GestureResponderEvent } from 'react-native';

type Props = {
  href: string;
  children?: React.ReactNode;
  [key: string]: unknown;
};

export function ExternalLink({ href, children, ...rest }: Props) {
  const handlePress = (event: GestureResponderEvent) => {
    if (rest.onPress) (rest.onPress as (e: GestureResponderEvent) => void)(event);
    Linking.openURL(href).catch(() => {});
  };
  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7} {...rest}>
      {children}
    </TouchableOpacity>
  );
}
