import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Platform } from 'react-native';

// Disable SSR for index route
export const ssr = false;

export default function Index() {
  const { user, loading } = useAuth();

  // Only render on client side (not during SSR)
  if (Platform.OS === 'web' && typeof window === 'undefined') {
    return null;
  }

  // Show nothing while loading (splash screen handles this)
  if (loading) {
    return null;
  }

  // If user is logged in, redirect to tabs
  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  // If not logged in, show the onboarding/login screen
  // Import and use your existing Index component from src/screens/Index.tsx
  // For now, redirect to a login route or show the Index component
  // You'll need to create app/login.tsx or app/signup.tsx routes
  // For now, let's redirect to tabs (which should handle showing login)
  return <Redirect href="/(tabs)" />;
}
