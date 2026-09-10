/**
 * Zustand store for WWLO PRM.
 *
 * Local Storage Architecture:
 *   - All CRUD operations read and write to AsyncStorage immediately.
 *   - Local state is the single source of truth for the UI.
 *   - On startup, data is loaded (hydrated) from AsyncStorage.
 *   - If no local data exists, it is seeded with sample data.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SampleEntry, SampleContact, SampleTag } from './sampleData';
import {
  encrypt,
  decrypt,
  hashPassphrase,
  verifyPassphrase,
  isEncryptedEntry,
  serializeEncrypted,
  deserializeEncrypted,
} from './vault';
import { saveVaultHash, loadVaultHash, clearVaultStorage } from './vaultStorage';
import { generateSecureId } from './idUtils';

// ── Types ────────────────────────────────────────────────────────────────────

interface SyncState {
  /** Unused in local-only mode, but kept for UI component signature compatibility */
  isOnline: boolean;
  /** Whether initial data has been loaded from storage */
  isLoaded: boolean;
  lastError: string | null;
  isSyncing: boolean;
}

interface JournalState {
  // Data
  entries: SampleEntry[];
  contacts: SampleContact[];
  tags: SampleTag[];

  // Sync state
  sync: SyncState;

  // User
  userId: string | null;

  // Filters
  searchQuery: string;
  selectedMonth: string | null;
  viewMode: 'list' | 'calendar' | 'continuous';

  // Vault state
  vaultPassphrase: string | null;
  vaultPassphraseHash: string | null;
  vaultUnlocked: boolean;
  vaultConfigured: boolean;
  vaultRestorable: boolean;

  // AI & App Settings
  aiEnabled: boolean;
  offlineModeEnabled: boolean;
  simpleMode: boolean;
  onboardingComplete: boolean;

  // Actions
  setAiEnabled: (enabled: boolean) => void;
  setOfflineModeEnabled: (enabled: boolean) => void;
  setSimpleMode: (enabled: boolean) => void;
  setSearchQuery: (q: string) => void;
  setSelectedMonth: (month: string | null) => void;
  setViewMode: (mode: 'list' | 'calendar' | 'continuous') => void;
  dismissOnboarding: () => void;

  // Local CRUD actions (AsyncStorage-backed)
  addEntry: (entry: SampleEntry) => void;
  updateEntry: (id: string, raw_text: string) => void;
  deleteEntry: (id: string) => void;
  updateEntryStatus: (id: string, status: 'approved' | 'rejected') => void;
  updateContact: (id: string, updates: Partial<SampleContact>) => void;
  addContact: (contact: Omit<SampleContact, 'id' | 'entry_count' | 'last_entry'>) => void;
  deleteContact: (id: string) => void;

  // Data loading
  loadLocalData: () => Promise<void>;
  initializeSession: (userId: string) => Promise<void>;
  setUserId: (userId: string | null) => void;

  // Vault actions
  hydrateVault: () => Promise<void>;
  setupVault: (passphrase: string) => Promise<void>;
  unlockVault: (passphrase: string) => Promise<boolean>;
  restoreVault: (passphrase: string) => Promise<boolean>;
  lockVault: () => void;
  resetVault: () => Promise<void>;
  encryptEntry: (id: string) => Promise<void>;
  decryptEntry: (id: string) => Promise<string | null>;
  toggleEntryVault: (id: string, currentRawText: string) => Promise<void>;
}

const ENTRIES_STORAGE_KEY = 'prm_journal_entries';
const CONTACTS_STORAGE_KEY = 'prm_journal_contacts';

/**
 * Calculates and sorts tags on the fly based on current entry counts.
 * This guarantees referential integrity without explicit tag synchronization tables.
 */
const deriveTags = (entries: SampleEntry[]): SampleTag[] => {
  const counts: Record<string, number> = {};
  entries.forEach(e => {
    (e.tags || []).forEach(t => {
      counts[t] = (counts[t] || 0) + 1;
    });
  });
  return Object.keys(counts).map((name, i) => ({
    id: `derived-${i}`,
    name,
    entry_count: counts[name],
  })).sort((a, b) => a.name.localeCompare(b.name));
};

// ── Store ────────────────────────────────────────────────────────────────────

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: [],
  contacts: [],
  tags: [],

  sync: {
    isOnline: false,
    isLoaded: false,
    lastError: null,
    isSyncing: false,
  },

  userId: null,

  searchQuery: '',
  selectedMonth: null,
  viewMode: 'list',

  // Vault state
  vaultPassphrase: null,
  vaultPassphraseHash: null,
  vaultUnlocked: false,
  vaultConfigured: false,
  vaultRestorable: false,

  aiEnabled: false,
  offlineModeEnabled: true, // Local-first by default
  simpleMode: (() => { try { return typeof window !== 'undefined' && localStorage.getItem('prm_simple_mode') === 'true'; } catch { return false; } })(),
  onboardingComplete: (() => { try { return typeof window !== 'undefined' && localStorage.getItem('prm_onboarding_complete') === 'true'; } catch { return false; } })(),

  setSearchQuery: (q) => set({ searchQuery: q }),
  setAiEnabled: (enabled) => set({ aiEnabled: enabled }),
  setOfflineModeEnabled: (enabled) => set({ offlineModeEnabled: enabled }),
  setSimpleMode: (enabled) => {
    set({ simpleMode: enabled });
    if (typeof window !== 'undefined') {
      localStorage.setItem('prm_simple_mode', String(enabled));
    }
  },
  setSelectedMonth: (month) => set({ selectedMonth: month }),
  setViewMode: (mode) => set({ viewMode: mode }),
  dismissOnboarding: () => {
    set({ onboardingComplete: true });
    if (typeof window !== 'undefined') {
      localStorage.setItem('prm_onboarding_complete', 'true');
    }
  },

  // ── User & Sync ──────────────────────────────────────────────────────────

  setUserId: (userId) => set({ userId }),

  loadLocalData: async () => {
    set({
      sync: { isOnline: false, isLoaded: false, lastError: null, isSyncing: true },
    });

    try {
      const storedEntries = await AsyncStorage.getItem(ENTRIES_STORAGE_KEY);
      const storedContacts = await AsyncStorage.getItem(CONTACTS_STORAGE_KEY);

      let entries: SampleEntry[] = [];
      let contacts: SampleContact[] = [];

      if (storedEntries) {
        entries = JSON.parse(storedEntries);
      } else {
        await AsyncStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify([]));
      }

      if (storedContacts) {
        contacts = JSON.parse(storedContacts);
      } else {
        await AsyncStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify([]));
      }

      const tags = deriveTags(entries);

      set({
        entries,
        contacts,
        tags,
        sync: { isOnline: false, isLoaded: true, lastError: null, isSyncing: false },
      });
    } catch (e: any) {
      console.error('Failed to load local data:', e.message);
      set({
        sync: { isOnline: false, isLoaded: true, lastError: e.message, isSyncing: false },
      });
    }
  },

  initializeSession: async (userId: string) => {
    set({ userId });
    get().hydrateVault().catch(console.error);
    await get().loadLocalData();
  },

  // ── Entry CRUD ───────────────────────────────────────────────────────────

  addEntry: (entry) => {
    set((state) => {
      let newContacts = state.contacts;
      const existingContact = state.contacts.find(
        (c) => c.name.toLowerCase() === entry.contact_name.toLowerCase()
      );

      if (existingContact) {
        newContacts = state.contacts.map((c) =>
          c.id === existingContact.id
            ? {
              ...c,
              entry_count: c.entry_count + 1,
              last_entry: !c.last_entry || entry.entry_date > c.last_entry ? entry.entry_date : c.last_entry,
            }
            : c
        );
      } else if (entry.contact_name) {
        const newContact: SampleContact = {
          id: generateSecureId(9),
          name: entry.contact_name,
          relationship: 'acquaintance',
          targetLevel: 'monthly',
          entry_count: 1,
          last_entry: entry.entry_date,
        };
        newContacts = [...state.contacts, newContact];
      }

      const nextEntries = [entry, ...state.entries].sort((a, b) =>
        new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
      );

      AsyncStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(nextEntries)).catch(reportLocalSaveFailure);
      AsyncStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(newContacts)).catch(reportLocalSaveFailure);

      return {
        entries: nextEntries,
        contacts: newContacts,
        tags: deriveTags(nextEntries),
      };
    });
  },

  updateEntry: (id, raw_text) => {
    set((state) => {
      const nextEntries = state.entries.map((e) =>
        e.id === id ? { ...e, raw_text, entry_date: raw_text.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? e.entry_date } : e
      );

      AsyncStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(nextEntries)).catch(reportLocalSaveFailure);

      return {
        entries: nextEntries,
        tags: deriveTags(nextEntries),
      };
    });
  },

  deleteEntry: (id) => {
    set((state) => {
      const nextEntries = state.entries.filter((e) => e.id !== id);

      AsyncStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(nextEntries)).catch(reportLocalSaveFailure);

      return {
        entries: nextEntries,
        tags: deriveTags(nextEntries),
      };
    });
  },

  updateEntryStatus: (id, status) => {
    set((state) => {
      const nextEntries = state.entries.map((e) =>
        e.id === id ? { ...e, status } : e
      );

      AsyncStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(nextEntries)).catch(reportLocalSaveFailure);

      return {
        entries: nextEntries,
      };
    });
  },

  // ── Contact CRUD ─────────────────────────────────────────────────────────

  addContact: (contact) => {
    const newContact: SampleContact = {
      ...contact,
      id: generateSecureId(9),
      entry_count: 0,
      last_entry: '',
    };

    set((state) => {
      const nextContacts = [...state.contacts, newContact];
      AsyncStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(nextContacts)).catch(reportLocalSaveFailure);
      return { contacts: nextContacts };
    });
  },

  updateContact: (id, updates) => {
    set((state) => {
      const nextContacts = state.contacts.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      );
      AsyncStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(nextContacts)).catch(reportLocalSaveFailure);
      return { contacts: nextContacts };
    });
  },

  deleteContact: (id) => {
    set((state) => {
      const nextContacts = state.contacts.filter((c) => c.id !== id);
      AsyncStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(nextContacts)).catch(reportLocalSaveFailure);
      return { contacts: nextContacts };
    });
  },

  // ── Vault Actions ────────────────────────────────────────────────────────

  hydrateVault: async () => {
    try {
      const hash = await loadVaultHash();
      if (hash) {
        set({
          vaultPassphraseHash: hash,
          vaultConfigured: true,
          vaultRestorable: false,
          vaultUnlocked: false,
          vaultPassphrase: null,
        });
      }
    } catch (e) {
      console.error('Failed to hydrate vault state:', e);
    }
  },

  setupVault: async (passphrase: string) => {
    const hash = await hashPassphrase(passphrase);
    await saveVaultHash(hash);
    set({
      vaultPassphrase: passphrase,
      vaultPassphraseHash: hash,
      vaultUnlocked: true,
      vaultConfigured: true,
    });
  },

  unlockVault: async (passphrase: string) => {
    const { vaultPassphraseHash } = get();
    if (!vaultPassphraseHash) return false;

    const valid = await verifyPassphrase(passphrase, vaultPassphraseHash);
    if (valid) {
      set({ vaultPassphrase: passphrase, vaultUnlocked: true });
    }
    return valid;
  },

  restoreVault: async (_passphrase: string) => {
    // Cloud restore features disabled in local storage mode
    return false;
  },

  lockVault: () => {
    set({ vaultPassphrase: null, vaultUnlocked: false });
  },

  resetVault: async () => {
    await clearVaultStorage();
    set({
      vaultPassphrase: null,
      vaultPassphraseHash: null,
      vaultUnlocked: false,
      vaultConfigured: false,
      vaultRestorable: false,
    });
  },

  encryptEntry: async (id: string) => {
    const { entries, vaultPassphrase } = get();
    if (!vaultPassphrase) throw new Error('Vault is locked');

    const entry = entries.find((e) => e.id === id);
    if (!entry || isEncryptedEntry(entry.raw_text)) return;

    const payload = await encrypt(entry.raw_text, vaultPassphrase);
    const encrypted = serializeEncrypted(payload);

    const nextEntries = entries.map((e) =>
      e.id === id
        ? { ...e, raw_text: encrypted, tags: [...(e.tags || []), 'vault:true'] }
        : e
    );

    set({
      entries: nextEntries,
      tags: deriveTags(nextEntries),
    });

    await AsyncStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(nextEntries));
  },

  decryptEntry: async (id: string) => {
    const { entries, vaultPassphrase } = get();
    if (!vaultPassphrase) return null;

    const entry = entries.find((e) => e.id === id);
    if (!entry || !isEncryptedEntry(entry.raw_text)) return entry?.raw_text ?? null;

    try {
      const payload = deserializeEncrypted(entry.raw_text);
      return await decrypt(payload, vaultPassphrase);
    } catch {
      return null;
    }
  },

  toggleEntryVault: async (id: string, currentRawText: string) => {
    const { entries, vaultPassphrase } = get();
    if (!vaultPassphrase) throw new Error('Vault is locked');

    let nextEntries;
    if (isEncryptedEntry(currentRawText)) {
      try {
        const payload = deserializeEncrypted(currentRawText);
        const plaintext = await decrypt(payload, vaultPassphrase);
        nextEntries = entries.map((e) =>
          e.id === id
            ? { ...e, raw_text: plaintext, tags: (e.tags || []).filter((t) => t !== 'vault:true') }
            : e
        );
      } catch {
        throw new Error('Failed to decrypt — wrong passphrase?');
      }
    } else {
      const payload = await encrypt(currentRawText, vaultPassphrase);
      const encrypted = serializeEncrypted(payload);
      nextEntries = entries.map((e) =>
        e.id === id
          ? { ...e, raw_text: encrypted, tags: [...(e.tags || []), 'vault:true'] }
          : e
      );
    }

    set({
      entries: nextEntries,
      tags: deriveTags(nextEntries),
    });

    await AsyncStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(nextEntries));
  },
}));

/** Keep unsaved in-memory changes visible without logging journal content. */
function reportLocalSaveFailure() {
  useJournalStore.setState((state) => ({
    sync: {
      ...state.sync,
      lastError: 'Changes could not be saved on this device. Keep the app open and export a backup before closing or reloading.',
    },
  }));
}
