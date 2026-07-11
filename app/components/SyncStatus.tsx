import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useJournalStore } from '@/lib/store';
import { useColors } from '@/lib/ThemeProvider';

export function SyncStatus() {
  const colors = useColors();
  const styles = useStyles();
  const sync = useJournalStore((s) => s.sync);
  const vaultUnlocked = useJournalStore((s) => s.vaultUnlocked);
  const vaultConfigured = useJournalStore((s) => s.vaultConfigured);
  const aiEnabled = useJournalStore((s) => s.aiEnabled);
  const [showError, setShowError] = useState(false);

  // ── Sync pill ──
  let syncIcon: React.ComponentProps<typeof FontAwesome>['name'] = 'cloud';
  let syncLabel = 'Synced';
  let syncColor = colors.success;

  if (!sync.isOnline) {
    syncIcon = 'cloud-download';
    syncLabel = 'Offline';
    syncColor = colors.textMuted;
  } else if (sync.lastError) {
    syncIcon = 'exclamation-triangle';
    syncLabel = 'Not Syncing';
    syncColor = colors.warning;
  } else if (sync.isSyncing) {
    syncLabel = 'Syncing';
    syncColor = colors.secondaryAccent;
  }

  // ── Vault state ──
  const vaultColor = vaultUnlocked ? colors.vaultAccent : colors.textMuted;
  const vaultIcon: React.ComponentProps<typeof FontAwesome>['name'] = vaultUnlocked ? 'unlock-alt' : 'lock';
  const vaultLabel = vaultUnlocked ? 'Open' : vaultConfigured ? 'Locked' : 'Off';

  // ── AI state ──
  const aiColor = aiEnabled ? colors.secondaryAccent : colors.textMuted;

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {/* Sync pill — tappable when there's an error */}
        <Pressable onPress={() => sync.lastError && setShowError(!showError)}>
          <View style={[styles.pill, { borderColor: syncColor + '30' }]}>
            {sync.isSyncing && sync.isOnline && !sync.lastError ? (
              <ActivityIndicator size="small" color={syncColor} style={styles.spinner} />
            ) : (
              <FontAwesome name={syncIcon} size={11} color={syncColor} />
            )}
            <Text style={[styles.label, { color: syncColor }]}>{syncLabel}</Text>
          </View>
        </Pressable>

        {/* Vault pill — only show when configured */}
        {vaultConfigured && (
          <View style={[styles.pill, { borderColor: vaultColor + '30' }]}>
            <FontAwesome name={vaultIcon} size={10} color={vaultColor} />
            <Text style={[styles.label, { color: vaultColor }]}>{vaultLabel}</Text>
          </View>
        )}

        {/* AI pill */}
        {aiEnabled && (
          <View style={[styles.pill, { borderColor: aiColor + '30' }]}>
            <FontAwesome name="magic" size={10} color={aiColor} />
            <Text style={[styles.label, { color: aiColor }]}>AI</Text>
          </View>
        )}
      </View>

      {/* Error detail banner — appears on tap */}
      {showError && sync.lastError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText} numberOfLines={2}>
            {sync.lastError}
          </Text>
          <Pressable onPress={() => setShowError(false)}>
            <FontAwesome name="times" size={10} color={colors.textMuted} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

function useStyles() {
  const colors = useColors();
  return useMemo(() => StyleSheet.create({
    wrapper: {
      marginRight: 16,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: colors.surfaceCard,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    spinner: {
      transform: [{ scale: 0.6 }],
      width: 11,
      height: 11,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: colors.warning + '15',
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.warning + '30',
      maxWidth: 220,
    },
    errorText: {
      flex: 1,
      fontSize: 9,
      color: colors.warning,
      fontWeight: '500',
    },
  }), [colors]);
}
