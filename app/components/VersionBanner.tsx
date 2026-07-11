/**
 * VersionBanner — Non-dismissible update notification.
 *
 * Checks for version drift on mount and listens for service worker updates.
 * Renders nothing when current, a banner when behind, or a blocking overlay
 * when the version gap exceeds one minor version.
 *
 * Web-only — renders null on native platforms.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeProvider';
import { checkForUpdate, APP_VERSION, type UpdateStatus } from '@/lib/versionCheck';

// Polling interval: check every 5 minutes
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function VersionBanner() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ status: 'current' });
  const { colors } = useTheme();

  const doCheck = useCallback(async () => {
    const result = await checkForUpdate();
    if (result.status !== 'unknown') {
      setUpdateStatus(result);
    }
  }, []);

  useEffect(() => {
    // Only run on web
    if (Platform.OS !== 'web') return;

    // Initial check after a short delay (let the app render first)
    const initialTimeout = setTimeout(doCheck, 3000);

    // Periodic re-check
    const interval = setInterval(doCheck, CHECK_INTERVAL_MS);

    // Listen for SW update events
    const handleSWUpdate = () => {
      doCheck();
    };
    window.addEventListener('sw-update-available', handleSWUpdate);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
      window.removeEventListener('sw-update-available', handleSWUpdate);
    };
  }, [doCheck]);

  // Don't render on native or when current
  if (Platform.OS !== 'web') return null;
  if (updateStatus.status === 'current' || updateStatus.status === 'unknown') return null;

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const isBlocking = updateStatus.status === 'unsupported' ||
    (updateStatus.status === 'update-available' && updateStatus.gap > 1);

  const serverVersion = updateStatus.status === 'update-available'
    ? updateStatus.serverVersion
    : updateStatus.status === 'unsupported'
      ? updateStatus.serverVersion
      : '';

  const message = updateStatus.status === 'unsupported'
    ? `Your version (v${APP_VERSION}) is no longer supported. v${serverVersion} is required.`
    : `You're running v${APP_VERSION} — v${serverVersion} is available.`;

  // Blocking overlay for major drift
  if (isBlocking) {
    return (
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.92)' }]}>
        <View style={[styles.blockingCard, { backgroundColor: colors.surfaceContainerHigh }]}>
          <Text style={[styles.blockingIcon]}>⚠️</Text>
          <Text style={[styles.blockingTitle, { color: colors.textPrimary }]}>
            Update Required
          </Text>
          <Text style={[styles.blockingMessage, { color: colors.textSecondary }]}>
            {message}
          </Text>
          <TouchableOpacity
            style={[styles.reloadButton, { backgroundColor: colors.primaryAccent }]}
            onPress={handleReload}
            accessibilityRole="button"
            accessibilityLabel="Reload to update"
          >
            <Text style={[styles.reloadText, { color: colors.textOnPrimary }]}>
              Reload Now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Non-blocking banner for minor updates
  return (
    <View style={[styles.banner, { backgroundColor: colors.warning + '18', borderBottomColor: colors.warning + '40' }]}>
      <Text style={[styles.bannerText, { color: colors.textPrimary }]} numberOfLines={1}>
        {message}
      </Text>
      <TouchableOpacity
        onPress={handleReload}
        style={[styles.bannerButton, { backgroundColor: colors.warning }]}
        accessibilityRole="button"
        accessibilityLabel="Reload to update"
      >
        <Text style={[styles.bannerButtonText, { color: '#000' }]}>Reload</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Non-blocking banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },
  bannerButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bannerButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Blocking overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockingCard: {
    width: '85%',
    maxWidth: 380,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  blockingIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  blockingTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  blockingMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  reloadButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
  },
  reloadText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
