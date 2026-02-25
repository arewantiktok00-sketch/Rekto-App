import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform, Dimensions, StatusBar } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Lottie for native platforms (Android & iOS)
let LottieView: any = null;
if (Platform.OS !== 'web') {
  try {
    // @ts-ignore - lottie-react-native types may not be perfect
    LottieView = require('lottie-react-native').default;
  } catch (e) {
    console.log('[Splash] Lottie native not available');
  }
}

// Lottie for web platform
let DotLottieReact: any = null;
if (Platform.OS === 'web') {
  try {
    DotLottieReact = require('@lottiefiles/dotlottie-react').DotLottieReact;
  } catch (e) {
    console.log('[Splash] DotLottie web not available');
  }
}

interface AnimatedSplashProps {
  onFinish: () => void;
  onReady?: () => void;
}

export function AnimatedSplash({ onFinish, onReady }: AnimatedSplashProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const lottieRef = useRef<any>(null);
  const webLottieRef = useRef<any>(null);
  const [animationFinished, setAnimationFinished] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Handle navigation when animation finishes
  useEffect(() => {
    if (animationFinished) {
      // Small delay for smooth transition
      const timer = setTimeout(() => {
        if (Platform.OS === 'android') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        
        // Call onFinish callback - navigation will be handled in _layout.tsx
        onFinish();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [animationFinished, onFinish]);

  // Handle Lottie animation completion
  useEffect(() => {
    // Web platform - use DotLottie
    if (Platform.OS === 'web') {
      if (!DotLottieReact) {
        console.log('[Splash] DotLottie unavailable on web, skipping animation');
        if (onReady) onReady();
        setAnimationFinished(true);
        return;
      }

      // For web, DotLottie auto-plays, so we just need to wait for it to finish
      if (onReady && !isReady) {
        onReady();
        setIsReady(true);
      }
      
      // Animation duration: 91 frames at 29.98 fps = ~3.03 seconds
      const webTimeout = setTimeout(() => {
        console.log('[Splash] Web animation finished');
        setAnimationFinished(true);
      }, 3100);

      return () => clearTimeout(webTimeout);
    }

    // Native platforms (Android & iOS) - use lottie-react-native
    if (!LottieView) {
      console.log('[Splash] Lottie native unavailable, skipping animation');
      if (onReady && !isReady) {
        onReady();
        setIsReady(true);
      }
      setAnimationFinished(true);
      return;
    }

    // Wait for ref to be ready, then play animation
    const playAnimation = () => {
      if (lottieRef.current) {
        // Notify that splash is ready (so native splash can be hidden)
        if (onReady && !isReady) {
          onReady();
          setIsReady(true);
        }
        
        // Play animation once (no loop)
        lottieRef.current.play();
        console.log('[Splash] Native animation started');
      } else {
        // Retry if ref not ready yet
        setTimeout(playAnimation, 50);
      }
    };

    // Start playing after a short delay to ensure component is mounted
    const startTimer = setTimeout(playAnimation, 100);

    // Fallback timeout (in case animation doesn't trigger completion callback)
    // Animation: 91 frames at 29.98 fps = ~3.03 seconds, use 3.5 seconds as safety
    const fallbackTimeout = setTimeout(() => {
      console.log('[Splash] Fallback timeout reached, finishing animation');
      setAnimationFinished(true);
    }, 3500);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(fallbackTimeout);
    };
  }, [onReady, isReady]);

  // Get the Lottie JSON source (vector-only, no image dependencies)
  const lottieSource = require('../../assets/animations/splash.json');
  
  // For web, convert require() to URL string if needed
  const getWebLottieSource = () => {
    if (Platform.OS === 'web') {
      // In Expo web, require() returns a URL string for JSON files
      return typeof lottieSource === 'string' ? lottieSource : lottieSource.default || lottieSource;
    }
    return lottieSource;
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#EFEFEF" translucent={false} />
      <View style={[styles.root, { backgroundColor: '#EFEFEF' }]}>
      {/* Full background - fills entire screen */}
      <View style={[styles.background, { backgroundColor: '#EFEFEF' }]} />

      {/* Lottie Animation - Web Platform */}
      {Platform.OS === 'web' && DotLottieReact && (
        <View style={styles.lottieContainer}>
          <DotLottieReact
            ref={webLottieRef}
            src={getWebLottieSource()}
            loop={false}
            autoplay={true}
            style={styles.lottie}
            onComplete={() => {
              console.log('[Splash] Web animation finished');
              setAnimationFinished(true);
            }}
          />
        </View>
      )}

      {/* Lottie Animation - Native Platforms (Android & iOS) */}
      {Platform.OS !== 'web' && LottieView && (
        <View style={styles.lottieContainer}>
          <LottieView
            ref={lottieRef}
            source={lottieSource}
            style={styles.lottie}
            autoPlay={false}
            loop={false}
            resizeMode="contain"
            onAnimationFinish={() => {
              console.log('[Splash] Native animation finished');
              setAnimationFinished(true);
            }}
            onLayout={() => {
              console.log('[Splash] Lottie view laid out');
            }}
          />
        </View>
      )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#EFEFEF',
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    bottom: 0,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EFEFEF',
  },
  lottieContainer: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    // Animation is 1080x1920, scale to fit screen while maintaining aspect ratio
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});
