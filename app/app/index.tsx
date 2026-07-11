import { Redirect } from 'expo-router';

export default function Index() {
  // Always start at /(tabs); root layout guard will redirect unauth users to welcome.
  return <Redirect href={'/(tabs)' as any} />;
}
