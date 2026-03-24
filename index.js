import 'react-native-url-polyfill/auto';
import 'react-native-reanimated';
import 'react-native-gesture-handler';
import { AppRegistry, I18nManager } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import App from './src/App';

// Dev-only timer logging to catch invalid callbacks without touching RN core (JSTimers).
if (__DEV__) {
  const originalSetTimeout = global.setTimeout;
  global.setTimeout = (cb, delay, ...rest) => {
    if (typeof cb !== 'function') {
      // eslint-disable-next-line no-console
      console.warn('setTimeout invalid cb (expected function):', cb);
      // eslint-disable-next-line no-console
      console.warn(new Error('setTimeout invalid callback stack').stack);
      return 0;
    }
    return originalSetTimeout(cb, delay, ...rest);
  };

  const originalSetInterval = global.setInterval;
  global.setInterval = (cb, delay, ...rest) => {
    if (typeof cb !== 'function') {
      // eslint-disable-next-line no-console
      console.warn('setInterval invalid cb (expected function):', cb);
      // eslint-disable-next-line no-console
      console.warn(new Error('setInterval invalid callback stack').stack);
      return 0;
    }
    return originalSetInterval(cb, delay, ...rest);
  };

  const originalRequestAnimationFrame = global.requestAnimationFrame;
  if (originalRequestAnimationFrame) {
    global.requestAnimationFrame = (cb, ...rest) => {
      if (typeof cb !== 'function') {
        // eslint-disable-next-line no-console
        console.warn('requestAnimationFrame invalid cb (expected function):', cb);
        // eslint-disable-next-line no-console
        console.warn(new Error('requestAnimationFrame invalid callback stack').stack);
        return 0;
      }
      return originalRequestAnimationFrame(cb, ...rest);
    };
  }
}

// RTL: MUST run before AppRegistry so layout is RTL before any React component renders.
// Kurdish/Arabic only — RTL is permanent. No conditional; hot/cold reload can reset the flag.
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const Root = () => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <App />
  </GestureHandlerRootView>
);

// React Native CLI entrypoint. Must match the native app name.
AppRegistry.registerComponent('RektoApp', () => Root);

