/**
 * Centralized API Key Management for WWLO PRM.
 *
 * Stores AI service API keys (Gemini, Cerebras, OpenAI, etc.) in
 * hardware-backed secure storage on native (iOS/Android) and
 * falls back to AsyncStorage on web.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureGet, secureSet, secureDelete } from './vaultStorage';

const API_KEYS_STORAGE_KEY = 'prm_journal_api_keys';

export type ApiKeys = Record<string, string>;

/**
 * Load persisted API keys from secure storage.
 * Includes a migration path from legacy AsyncStorage to SecureStore on native.
 */
export async function getStoredApiKeys(): Promise<ApiKeys> {
  // 1. Try secure storage (SecureStore on native, AsyncStorage on web)
  let stored = await secureGet(API_KEYS_STORAGE_KEY);

  // 2. Migration: If nothing in secure storage on native, check legacy AsyncStorage
  if (!stored && Platform.OS !== 'web') {
    try {
      // Direct access to AsyncStorage to check for unencrypted legacy keys
      const legacy = await AsyncStorage.getItem(API_KEYS_STORAGE_KEY);
      if (legacy) {
        // Move to hardware-backed secure storage
        await secureSet(API_KEYS_STORAGE_KEY, legacy);
        // Clean up legacy unencrypted storage
        await AsyncStorage.removeItem(API_KEYS_STORAGE_KEY);
        stored = legacy;
      }
    } catch (e) {
      console.warn('API key migration from AsyncStorage failed:', e);
    }
  }

  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Persist API keys to secure storage.
 */
export async function saveStoredApiKeys(keys: ApiKeys): Promise<void> {
  await secureSet(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
}

/**
 * Remove all stored API keys.
 */
export async function clearStoredApiKeys(): Promise<void> {
  await secureDelete(API_KEYS_STORAGE_KEY);
}
