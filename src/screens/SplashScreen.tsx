import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, Dimensions, StatusBar } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  useDerivedValue,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

// Full physical screen so splash fills under status bar and home indicator
const { width, height } = Dimensions.get('screen');

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const { colors, isDark } = useTheme();
  const logoSource = isDark ? require('../../assets/images/iconDarkmode.png') : require('../../assets/images/logo.png');
  const waveOffset = useSharedValue(0);
  const fillProgress = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);
  const [wavePath, setWavePath] = useState('');

  // Generate wave path - regular function (can be called from JS)
  const generateWavePath = (offset: number, progress: number): string => {
    const waveHeight = 80;
    const waveWidth = width;
    const centerY = height * 0.55;
    const points: number[] = [];

    for (let i = 0; i <= waveWidth; i += 4) {
      const x = i;
      const normalizedX = i / waveWidth;
      const wave1 = Math.sin(normalizedX * Math.PI * 4 + offset) * waveHeight * progress;
      const wave2 = Math.cos(normalizedX * Math.PI * 6 + offset * 1.5) * waveHeight * 0.4 * progress;
      const y = centerY + wave1 + wave2;
      points.push(x, y);
    }

    let path = `M 0 ${height} L 0 ${points[1]}`;
    for (let i = 2; i < points.length; i += 2) {
      path += ` L ${points[i]} ${points[i + 1]}`;
    }
    path += ` L ${width} ${height} Z`;

    return path;
  };

  useEffect(() => {
    // Start wave animation
    waveOffset.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0, {
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      false
    );

    // Start fill animation
    fillProgress.value = withTiming(1, {
      duration: 1500,
      easing: Easing.out(Easing.cubic),
    });

    // Logo entrance animation
    logoScale.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.back(1.2)),
    });
    logoOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.ease),
    });

    // Update wave path at ~60fps (16ms intervals)
    const updateWave = () => {
      const offset = waveOffset.value * Math.PI * 2;
      const progress = fillProgress.value;
      const path = generateWavePath(offset, progress);
      setWavePath(path);
    };

    // Initial path
    updateWave();

    // Update path periodically for smooth animation
    const interval = setInterval(updateWave, 16); // ~60fps

    // Navigate after animation completes
    const timer = setTimeout(() => {
      clearInterval(interval);
      onFinish();
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const fillAnimatedStyle = useAnimatedStyle(() => {
    const opacity = typeof fillProgress.value === 'number' ? fillProgress.value : 1;
    return { opacity };
  });

  const logoAnimatedStyle = useAnimatedStyle(() => {
    const scale = typeof logoScale.value === 'number' ? logoScale.value : 1;
    const opacity = typeof logoOpacity.value === 'number' ? logoOpacity.value : 1;
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={[styles.container, styles.fullScreen, { width, height, backgroundColor: colors.background.DEFAULT }]}>
        <View style={[styles.backgroundFill, { backgroundColor: colors.background.DEFAULT }]} />

      {/* Liquid Fill Wave */}
      <Animated.View style={[styles.waveContainer, fillAnimatedStyle]}>
        <Svg width={width} height={height} style={styles.waveSvg}>
          <Defs>
            <LinearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#7C3AED" stopOpacity="0.95" />
              <Stop offset="50%" stopColor="#9333EA" stopOpacity="0.85" />
              <Stop offset="100%" stopColor="#A855F7" stopOpacity="0.75" />
            </LinearGradient>
          </Defs>
          {wavePath && (
            <Path
              d={wavePath}
              fill="url(#waveGradient)"
            />
          )}
        </Svg>
      </Animated.View>

      {/* Logo - Centered (dark mode uses iconDarkmode) */}
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <Image
          source={logoSource}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundFill: {
    ...StyleSheet.absoluteFillObject,
  },
  waveContainer: {
    ...StyleSheet.absoluteFillObject,
    bottom: 0,
  },
  waveSvg: {
    position: 'absolute',
    bottom: 0,
  },
  logoContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  logo: {
    width: 120,
    height: 120,
  },
});
