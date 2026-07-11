/**
 * WWLO ConfirmDialog — destructive-action pattern from the design system's
 * `Feedback.jsx`. Replaces ad-hoc `Alert.alert` calls so destructive flows
 * (delete entry, archive contact, sign out, etc.) render with WWLO chrome
 * and respect both Narrative and Technical modes.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={isOpen}
 *     title="Delete entry?"
 *     body="This can't be undone."
 *     confirmLabel="Delete"
 *     destructive
 *     onConfirm={handleDelete}
 *     onCancel={() => setOpen(false)}
 *   />
 */
import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColors } from '@/lib/ThemeProvider';
import type { ColorPalette } from '@/constants/Colors';
import { ZIndex } from '@/constants/Motion';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true, the primary action button uses the danger palette. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={open}
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: destructive
                  ? withAlpha(colors.danger, 0.12)
                  : withAlpha(colors.secondaryAccent, 0.12),
              },
            ]}
          >
            <FontAwesome
              name={destructive ? 'exclamation-triangle' : 'question-circle'}
              size={22}
              color={destructive ? colors.danger : colors.secondaryAccent}
            />
          </View>
          <Text style={styles.title}>{title}</Text>
          {body ? <Text style={styles.body}>{body}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={[styles.btn, styles.btnSecondary]}
            >
              <Text style={[styles.btnText, { color: colors.textSecondary }]}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={[
                styles.btn,
                {
                  backgroundColor: destructive ? colors.danger : colors.primaryAccent,
                  borderColor: destructive ? colors.danger : colors.primaryAccent,
                },
              ]}
            >
              <Text style={[styles.btnText, { color: '#FFFFFF' }]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function withAlpha(hex: string, alpha: number): string {
  // Handles `#RRGGBB` plus passes through anything that already includes alpha.
  if (hex.startsWith('rgba')) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      zIndex: ZIndex.overlay,
    },
    dialog: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: c.surfaceCard,
      borderRadius: 16,
      padding: 24,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      zIndex: ZIndex.modal,
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 6,
      textAlign: 'center',
    },
    body: {
      fontSize: 14,
      lineHeight: 21,
      color: c.textSecondary,
      marginBottom: 18,
      textAlign: 'center',
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      width: '100%',
    },
    btn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    btnSecondary: {
      backgroundColor: 'transparent',
      borderColor: c.border,
    },
    btnText: {
      fontSize: 14,
      fontWeight: '600',
    },
  });
}

export default ConfirmDialog;
