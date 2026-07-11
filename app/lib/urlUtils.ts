import { Linking, Alert, Platform } from 'react-native';

/**
 * List of protocols considered safe for external navigation.
 */
const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:', 'sms:'];

/**
 * Validates if a URL is safe to open.
 * Prevents javascript: and other dangerous protocols that can lead to XSS on web.
 */
export function isSafeUrl(url: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return SAFE_PROTOCOLS.includes(parsed.protocol);
  } catch {
    // If URL parsing fails (e.g. relative path or just a protocol string),
    // we check the protocol prefix manually for common safe patterns.
    const lowerUrl = url.toLowerCase().trim();
    return SAFE_PROTOCOLS.some(proto => lowerUrl.startsWith(proto));
  }
}

/**
 * Safely opens an external URL after validating its protocol.
 * Shows an alert if the URL is deemed unsafe.
 */
export async function openSafeExternalURL(url: string): Promise<void> {
  if (!url) return;

  if (isSafeUrl(url)) {
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.error('Failed to open URL:', err);
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Could not open the link.');
      }
    }
  } else {
    const message = 'The link you are trying to open uses an unsupported or potentially unsafe protocol.';
    if (Platform.OS === 'web') {
      alert(message);
    } else {
      Alert.alert('Security Warning', message);
    }
    console.warn(`Blocked attempt to open unsafe URL: ${url}`);
  }
}
