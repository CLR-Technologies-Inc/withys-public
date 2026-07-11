import React, { useMemo } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColors, useTheme } from '@/lib/ThemeProvider';

export function ThemeToggleButton() {
  const colors = useColors();
  const styles = useStyles();
  const { resolvedTheme, setPreference } = useTheme();

  const handlePress = () => {
    setPreference(resolvedTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Toggle Theme"
    >
      <MaterialIcons 
        name={resolvedTheme === 'dark' ? 'light-mode' : 'dark-mode'} 
        size={20} 
        color={colors.textMuted} 
      />
    </TouchableOpacity>
  );
}

function useStyles() {
  return useMemo(() => StyleSheet.create({
    button: {
      padding: 8,
      marginRight: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
  }), []);
}
