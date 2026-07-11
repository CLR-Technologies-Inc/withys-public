import React, { useMemo } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColors } from '@/lib/ThemeProvider';
import { openSafeExternalURL } from '@/lib/urlUtils';

export function FeedbackButton() {
  const colors = useColors();
  const styles = useStyles();

  const handlePress = () => {
    openSafeExternalURL('mailto:dev@clrtechnologies.co?subject=WWLO PRM Feedback');
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Send Feedback"
    >
      <FontAwesome name="envelope-o" size={18} color={colors.textMuted} />
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
