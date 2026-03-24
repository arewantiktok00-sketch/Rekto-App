import React, { useCallback, useRef } from 'react';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { AnimatedSplash } from '@/screens/AnimatedSplash';

export function Index() {
  const navigation = useNavigation();
  const hasNavigatedRef = useRef(false);

  const handleFinish = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Auth' as never }],
      })
    );
  }, [navigation]);

  return <AnimatedSplash onFinish={handleFinish} />;
}

