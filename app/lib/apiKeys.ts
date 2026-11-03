import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureGet, secureSet, secureDelete } from './vaultStorage';

const API_KEYS_STORAGE_KEY = 'prm_journal_api_keys';
export type ApiKeys = Record<string, string>;

export const usesSessionOnlyApiKeys = Platform.OS !== 'ios' && Platform.OS !== 'android';
let sessionKeys: ApiKeys = {};
let sessionVersion = 0;
let pendingCleanup: Promise<void> | undefined;

/** Remove the old browser record without reading its contents. Retry after a storage failure. */
export function discardLegacyBrowserApiKeys(): Promise<void> {
  if (!usesSessionOnlyApiKeys) return Promise.resolve();
  if (!pendingCleanup) {
    pendingCleanup = AsyncStorage.removeItem(API_KEYS_STORAGE_KEY).finally(() => {
      pendingCleanup = undefined;
    });
  }
  return pendingCleanup;
}

/** Invalidate saves still waiting on storage cleanup when this session ends. */
export function endApiKeySession(): void {
  sessionVersion += 1;
  sessionKeys = {};
}

export async function getStoredApiKeys(): Promise<ApiKeys> {
  if (usesSessionOnlyApiKeys) {
    await discardLegacyBrowserApiKeys();
    return { ...sessionKeys };
  }

  let stored = await secureGet(API_KEYS_STORAGE_KEY);

  // Migrate existing native keys through the device's secure store.
  if (!stored) {
    try {
      const legacy = await AsyncStorage.getItem(API_KEYS_STORAGE_KEY);
      if (legacy) {
        await secureSet(API_KEYS_STORAGE_KEY, legacy);
        stored = legacy;
      }
    } catch {
      throw new Error('Could not finish migrating provider keys to secure storage. Retry in Settings.');
    }
  }

  if (stored) {
    // Complete any interrupted migration before returning native keys.
    await AsyncStorage.removeItem(API_KEYS_STORAGE_KEY);
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }
  return {};
}

export async function saveStoredApiKeys(keys: ApiKeys): Promise<void> {
  if (usesSessionOnlyApiKeys) {
    const version = sessionVersion;
    const next = { ...keys };
    await discardLegacyBrowserApiKeys();
    if (version !== sessionVersion) throw new Error('The provider key session ended.');
    sessionKeys = next;
    return;
  }

  // Finish any previous migration before changing the authoritative secure value.
  await getStoredApiKeys();
  await secureSet(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
}

export async function clearStoredApiKeys(): Promise<void> {
  if (usesSessionOnlyApiKeys) {
    endApiKeySession();
    await discardLegacyBrowserApiKeys();
    return;
  }

  await AsyncStorage.removeItem(API_KEYS_STORAGE_KEY);
  await secureDelete(API_KEYS_STORAGE_KEY);
}
