import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColors } from '@/lib/ThemeProvider';
import { useRouter } from 'expo-router';

export default function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  const router = useRouter();
  const Colors = useColors();
  const styles = useStyles(Colors);

  return (
    <View style={styles.container}>
      <FontAwesome name="exclamation-triangle" size={48} color={Colors.warning} />
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{error.message || 'An unexpected error occurred.'}</Text>
      
      <View style={styles.actions}>
        <TouchableOpacity style={styles.button} onPress={retry}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={() => router.replace('/' as any)}>
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Go Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function useStyles(Colors: any) {
  return useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: Colors.textPrimary,
    },
    message: {
      fontSize: 14,
      color: Colors.textMuted,
      textAlign: 'center',
      marginBottom: 16,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      backgroundColor: Colors.primaryAccent,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
    },
    buttonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 14,
    },
    buttonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: Colors.border,
    },
    buttonTextSecondary: {
      color: Colors.textSecondary,
    },
  }), [Colors]);
}
