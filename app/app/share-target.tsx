import { useEffect } from 'react';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/lib/ThemeProvider';

/**
 * Fallback page for the Web Share Target API.
 *
 * When the OS shares content to this PWA, the service worker intercepts
 * the POST to /share-target and redirects to /modal with prefill params.
 * If the service worker is unavailable (first install, or GET navigation),
 * this page handles the redirect client-side.
 */
export default function ShareTargetPage() {
  const Colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{
    prefillTitle?: string;
    prefillBody?: string;
    title?: string;
    text?: string;
    url?: string;
  }>();

  useEffect(() => {
    // The service worker normally handles the POST and redirects with
    // prefillTitle + prefillBody params.  But if we land here via a GET
    // (e.g. the browser followed a share intent without SW), we assemble
    // the params ourselves.
    const title = params.prefillTitle || params.title || '';
    const bodyParts: string[] = [];
    if (params.prefillBody) bodyParts.push(params.prefillBody);
    if (params.text)        bodyParts.push(params.text);
    if (params.url)         bodyParts.push(params.url);
    const body = bodyParts.join('\n\n');

    const navParams: Record<string, string> = {};
    if (title) navParams.prefillTitle = title;
    if (body)  navParams.prefillBody = body;

    // Small delay to let the layout mount before navigating
    const timeout = setTimeout(() => {
      router.replace({ pathname: '/modal', params: navParams } as any);
    }, 100);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Colors.primaryAccent} />
      <Text style={{ color: Colors.textSecondary, marginTop: 16, fontSize: 14 }}>
        Opening journal entry...
      </Text>
    </View>
  );
}
