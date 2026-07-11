import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColors } from '@/lib/ThemeProvider';
import { useMemo } from 'react';

export default function NotFoundScreen() {
  const Colors = useColors();
  const styles = useStyles(Colors);


  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={styles.container}>
        <FontAwesome name="exclamation-triangle" size={48} color={Colors.textMuted} />
        <Text style={styles.title}>Page not found</Text>
        <Link href={'/' as any} style={styles.link}>
          <Text style={styles.linkText}>Go to journal</Text>
        </Link>
      </View>
    </>
  );
}

function useStyles(Colors: any) {
  return useMemo(() => StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: Colors.background, gap: 16 },
    title: { fontSize: 20, fontWeight: '600', color: Colors.textPrimary },
    link: { marginTop: 10 },
    linkText: { fontSize: 15, color: Colors.secondaryAccent },
  }), [Colors]);
}
