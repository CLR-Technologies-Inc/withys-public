/**
 * WWLO EmptyState — formal empty state per the design system's `Feedback.jsx`.
 *
 * Use this for first-run states (Journal with no entries, People with no
 * contacts, Trends with nothing to chart) and "no results match this filter"
 * states. The icon glyph sits in a muted disc; title and body use the active
 * mode's display/body type. Optional action renders a primary button.
 *
 * Per design system voice rules: empty-state copy stays gentle and second-
 * person — "No entries found" / "Tap + to create your first entry", not
 * marketing-speak.
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColors } from '@/lib/ThemeProvider';
import type { ColorPalette } from '@/constants/Colors';

interface EmptyStateProps {
  /** FontAwesome 4 glyph name — defaults to `book` for journal-style empties. */
  icon?: React.ComponentProps<typeof FontAwesome>['name'];
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void; icon?: React.ComponentProps<typeof FontAwesome>['name'] };
  /** Adjust top padding when the empty state lives inside a scrolling list. */
  compact?: boolean;
}

export function EmptyState({ icon = 'book', title, body, action, compact = false }: EmptyStateProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View
      style={[styles.wrap, compact && styles.wrapCompact]}
      accessibilityRole="alert"
      accessibilityLabel={`${title}${body ? `. ${body}` : ''}`}
    >
      <View style={styles.glyph} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <FontAwesome name={icon} size={28} color={colors.textMuted} />
      </View>
      <Text style={styles.title} aria-hidden>{title}</Text>
      {body ? <Text style={styles.body} aria-hidden>{body}</Text> : null}
      {action ? (
        <Pressable
          onPress={action.onPress}
          style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          {action.icon ? (
            <FontAwesome name={action.icon} size={14} color="#FFFFFF" />
          ) : null}
          <Text style={styles.actionText}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      alignItems: 'center',
      paddingVertical: 64,
      paddingHorizontal: 24,
      gap: 8,
    },
    wrapCompact: {
      paddingVertical: 40,
    },
    glyph: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.surfaceContainer ?? c.surfaceCard,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: c.textPrimary,
      textAlign: 'center',
    },
    body: {
      fontSize: 14,
      lineHeight: 21,
      color: c.textSecondary,
      textAlign: 'center',
      maxWidth: 280,
      marginBottom: 8,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: c.primaryAccent,
      marginTop: 8,
    },
    actionText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 14,
    },
  });
}

export default EmptyState;
