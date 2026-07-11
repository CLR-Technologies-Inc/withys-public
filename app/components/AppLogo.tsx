import React from 'react';
import { View, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColors } from '@/lib/ThemeProvider';

/**
 * WWLO App Logo — Green leaf on light-blue background with green outer ring.
 *
 * @param size  - overall diameter (default 44)
 * @param leafSize - icon size override (default size × 0.45)
 */
export function AppLogo({ size = 44, leafSize }: { size?: number; leafSize?: number }) {
  const colors = useColors();
  const iconSize = leafSize ?? Math.round(size * 0.45);
  const radius = size / 2;
  const borderWidth = Math.max(2, Math.round(size * 0.03));

  return (
    <View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: radius,
          borderWidth,
          borderColor: colors.willowGreen,
          backgroundColor: '#D6EAF8', // light-blue fill — mode-invariant
        },
      ]}
    >
      <FontAwesome name="leaf" size={iconSize} color={colors.willowGreen} />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
