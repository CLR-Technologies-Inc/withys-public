/**
 * Vault persistence layer for WWLO PRM.
 *
 * Uses expo-secure-store on native (iOS/Android) for hardware-backed
 * secure storage, and falls back to AsyncStorage on web/Tauri.
 *
 * Only the passphrase HASH is persisted (for verification).
 * The actual passphrase is NEVER stored — it lives only in memory
 * for the duration of the session.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Constants ────────────────────────────────────────────────────────────────

const KEY_PASSPHRASE_HASH = 'prm_vault_passphrase_hash';
const KEY_VAULT_CONFIGURED = 'prm_vault_configured';

// ── Platform-Adaptive Storage ────────────────────────────────────────────────

/**
 * On native platforms, use expo-secure-store for hardware-backed encryption.
 * On web (Tauri), fall back to AsyncStorage (localStorage under the hood).
 */
export async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS !== 'web') {
    try {
      const SecureStore = require('expo-secure-store');
      await SecureStore.setItemAsync(key, value);
      return;
    } catch (e) {
      // Prohibit silent fallback to plaintext on native mobile platforms
      if ((Platform.OS === 'ios' || Platform.OS === 'android') && process.env.NODE_ENV !== 'test') {
        throw new Error('Secure storage is required on native platforms.');
      }
    }
  }
  await AsyncStorage.setItem(key, value);
}

export async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS !== 'web') {
    try {
      const SecureStore = require('expo-secure-store');
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      if ((Platform.OS === 'ios' || Platform.OS === 'android') && process.env.NODE_ENV !== 'test') {
        throw new Error('Secure storage is required on native platforms.');
      }
    }
  }
  return AsyncStorage.getItem(key);
}

export async function secureDelete(key: string): Promise<void> {
  if (Platform.OS !== 'web') {
    try {
      const SecureStore = require('expo-secure-store');
      await SecureStore.deleteItemAsync(key);
      return;
    } catch (e) {
      if ((Platform.OS === 'ios' || Platform.OS === 'android') && process.env.NODE_ENV !== 'test') {
        throw new Error('Secure storage is required on native platforms.');
      }
    }
  }
  await AsyncStorage.removeItem(key);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Persist the vault passphrase hash so it survives app restarts.
 * The hash is used only for quick verification — not for encryption.
 */
export async function saveVaultHash(hash: string): Promise<void> {
  await secureSet(KEY_PASSPHRASE_HASH, hash);
  await secureSet(KEY_VAULT_CONFIGURED, 'true');
}

/**
 * Load the persisted vault passphrase hash.
 * Returns null if no vault has been configured.
 */
export async function loadVaultHash(): Promise<string | null> {
  return secureGet(KEY_PASSPHRASE_HASH);
}

/**
 * Check if the vault has been configured (without loading the hash).
 */
export async function isVaultConfigured(): Promise<boolean> {
  const val = await secureGet(KEY_VAULT_CONFIGURED);
  return val === 'true';
}

/**
 * Clear all vault persistence (used when resetting the vault).
 */
export async function clearVaultStorage(): Promise<void> {
  await secureDelete(KEY_PASSPHRASE_HASH);
  await secureDelete(KEY_VAULT_CONFIGURED);
}

// ── Cloud Vault Detection ────────────────────────────────────────────────────

/**
 * Cloud vault entries check (disabled in local-first mode).
 */
export async function checkCloudVaultEntries(): Promise<{ hasCloudEntries: boolean; count: number }> {
  return { hasCloudEntries: false, count: 0 };
}

/**
 * Cloud vault entry fetch (disabled in local-first mode).
 */
export async function fetchOneVaultEntry(): Promise<string | null> {
  return null;
}
