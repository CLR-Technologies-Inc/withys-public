import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ThemeProvider as NavThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, ActivityIndicator } from 'react-native';
import 'react-native-reanimated';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// IMPORTANT: import context providers via the same `@/...` alias every
// screen and component uses. Mixing `../lib/...` here with `@/lib/...`
// elsewhere can yield two distinct module instances under Metro + the
// static web export, which produces two `createContext()` instances —
// the Provider feeds one, consumers read the other (default = DarkColors),
// and you get a mixed-theme render (light chrome, dark cards).
import { AuthProvider, useAuth } from '@/lib/AuthProvider';
import { SyncStatus } from '@/components/SyncStatus';
import { ThemeProvider, useTheme } from '@/lib/ThemeProvider';
import { ToastProvider } from '@/lib/ToastProvider';
import { hasCompletedOnboarding, ONBOARDING_COMPLETE_EVENT } from './(auth)/onboarding';
import { VersionBanner } from '@/components/VersionBanner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <RootLayoutNav />
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(true);
  const { resolvedTheme, colors } = useTheme();


  // Build navigation theme from resolved colors
  const navTheme = useMemo(() => {
    const base = resolvedTheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.background,
        text: colors.textPrimary,
        border: colors.border,
        primary: colors.primaryAccent,
      },
    };
  }, [resolvedTheme, colors]);

  // Check onboarding state when session is present
  useEffect(() => {
    if (session) {
      hasCompletedOnboarding().then((done) => {
        setOnboardingDone(done);
        setOnboardingChecked(true);
      });
    } else {
      setOnboardingChecked(true);
    }
  }, [session]);

  // Listen for onboarding completion events (fired from the onboarding screen)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = () => {
      setOnboardingDone(true);
    };
    window.addEventListener(ONBOARDING_COMPLETE_EVENT, handler);
    return () => window.removeEventListener(ONBOARDING_COMPLETE_EVENT, handler);
  }, []);

  useEffect(() => {
    if (loading || !onboardingChecked) return;

    const inAuthGroup = segments[0] === '(auth)' || segments[0] === 'auth';
    const isTermsPage = segments[0] === 'terms';
    const isPrivacyPage = segments[0] === 'privacy-policy';
    const isOnboarding = segments.join('/').includes('onboarding');

    if (!session && !inAuthGroup && !isTermsPage && !isPrivacyPage) {
      // Not logged in → send to welcome landing page
      router.replace('/(auth)/welcome' as any);
    } else if (session && inAuthGroup && !isOnboarding) {
      // Logged in, on a non-onboarding auth page → check if onboarding needed
      if (!onboardingDone) {
        router.replace('/(auth)/onboarding' as any);
      } else {
        router.replace('/(tabs)' as any);
      }
    } else if (session && !inAuthGroup && !onboardingDone && !isTermsPage && !isPrivacyPage) {
      // Logged in but onboarding incomplete → redirect to onboarding
      router.replace('/(auth)/onboarding' as any);
    }

  }, [session, loading, segments, router, onboardingChecked, onboardingDone]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
          e.preventDefault();
          router.push('/modal' as any);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [router]);

  const headerDefaults = {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.textPrimary,
  };

  if (loading) {
    return (
      <NavThemeProvider value={navTheme}>
        <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primaryAccent} />
          <View style={{ marginTop: 20 }}>
            <SyncStatus />
          </View>
        </View>
      </NavThemeProvider>
    );
  }

  return (
    <NavThemeProvider value={navTheme}>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <VersionBanner />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/welcome" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/onboarding" options={{ headerShown: false }} />

        <Stack.Screen
          name="usage"
          options={{ title: 'Usage & Projection', ...headerDefaults }}
        />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', title: 'New Entry', ...headerDefaults }}
        />
        <Stack.Screen
          name="entry/[id]"
          options={{ title: 'Journal Entry', ...headerDefaults }}
        />
        <Stack.Screen
          name="person/[id]"
          options={{ title: 'Person', ...headerDefaults }}
        />
        <Stack.Screen
          name="about"
          options={{ title: 'About & Help', ...headerDefaults }}
        />
        <Stack.Screen
          name="billing"
          options={{ title: 'Billing & Subscription', ...headerDefaults }}
        />
        <Stack.Screen
          name="terms"
          options={{ title: 'Terms & Conditions', ...headerDefaults }}
        />
        <Stack.Screen
          name="privacy-policy"
          options={{ title: 'Privacy Policy', ...headerDefaults }}
        />
        <Stack.Screen
          name="profile"
          options={{ title: 'Profile', ...headerDefaults }}
        />
        <Stack.Screen
          name="share-target"
          options={{ headerShown: false }}
        />
      </Stack>
    </NavThemeProvider>
  );
}
