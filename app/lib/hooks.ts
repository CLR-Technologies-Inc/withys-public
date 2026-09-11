/**
 * Local storage data hooks powered by TanStack Query.
 *
 * These hooks map React component data requests to the local Zustand store.
 * TanStack Query is retained to keep the UI's reactive mutation / invalidation
 * patterns working without needing modifications in the component files.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useJournalStore } from './store';
import type { SampleEntry, SampleContact, SampleTag } from './sampleData';
import { encrypt, serializeEncrypted } from './vault';

// ── Query Keys ──────────────────────────────────────────────────────────────

export const queryKeys = {
  entries: ['entries'] as const,
  contacts: ['contacts'] as const,
  tags: ['tags'] as const,
};

// ── Read Hooks ──────────────────────────────────────────────────────────────

/**
 * Fetches journal entries from the local Zustand store.
 */
export function useEntries() {
  const entries = useJournalStore((s) => s.entries);

  return useQuery({
    queryKey: queryKeys.entries,
    queryFn: async (): Promise<SampleEntry[]> => {
      return entries;
    },
    staleTime: Infinity,
  });
}

/**
 * Fetches contacts from the local Zustand store.
 */
export function useContacts() {
  const contacts = useJournalStore((s) => s.contacts);

  return useQuery({
    queryKey: queryKeys.contacts,
    queryFn: async (): Promise<SampleContact[]> => {
      return contacts;
    },
    staleTime: Infinity,
  });
}

/**
 * Fetches tags with counts from the local Zustand store.
 */
export function useTags() {
  const tags = useJournalStore((s) => s.tags);

  return useQuery({
    queryKey: queryKeys.tags,
    queryFn: async (): Promise<SampleTag[]> => {
      return tags;
    },
    staleTime: Infinity,
  });
}

// ── Mutation Hooks ──────────────────────────────────────────────────────────

/**
 * Creates a new journal entry in local storage.
 */
export function useAddEntry() {
  const queryClient = useQueryClient();
  const storeAddEntry = useJournalStore((s) => s.addEntry);

  return useMutation({
    mutationFn: async ({ entry, encryptOnSave = false }: { entry: SampleEntry; encryptOnSave?: boolean }) => {
      const { vaultPassphrase } = useJournalStore.getState();

      let preparedEntry = entry;
      if (encryptOnSave) {
        if (!vaultPassphrase) {
          throw new Error('Unlock your vault before saving this encrypted entry.');
        }
        try {
          const payload = await encrypt(entry.raw_text, vaultPassphrase);
          preparedEntry = { ...entry, raw_text: serializeEncrypted(payload) };
        } catch {
          throw new Error('Encryption failed. Your draft has been kept; try saving again.');
        }
        if (useJournalStore.getState().vaultPassphrase !== vaultPassphrase) {
          throw new Error('Your vault changed while saving. Unlock it and try again.');
        }
      }

      storeAddEntry(preparedEntry);
      return preparedEntry;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.entries }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tags }),
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts }),
      ]);
    },
  });
}

/**
 * Toggles an entry's encryption status in local storage.
 */
export function useToggleEntryVault() {
  const queryClient = useQueryClient();
  const toggleEntryVault = useJournalStore((s) => s.toggleEntryVault);

  return useMutation({
    mutationFn: async ({ id, currentRawText }: { id: string; currentRawText: string }) => {
      await toggleEntryVault(id, currentRawText);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entries });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    },
  });
}

/**
 * Updates an existing journal entry's raw_text in local storage.
 */
export function useUpdateEntry() {
  const queryClient = useQueryClient();
  const storeUpdateEntry = useJournalStore((s) => s.updateEntry);

  return useMutation({
    mutationFn: async ({ id, raw_text }: { id: string; raw_text: string }) => {
      storeUpdateEntry(id, raw_text);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entries });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts });
    },
  });
}

/**
 * Deletes a journal entry from local storage.
 */
export function useDeleteEntry() {
  const queryClient = useQueryClient();
  const storeDeleteEntry = useJournalStore((s) => s.deleteEntry);

  return useMutation({
    mutationFn: async (id: string) => {
      storeDeleteEntry(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entries }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tags }),
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts })
    },
  });
}

/**
 * Updates an entry's approval status in local storage.
 */
export function useUpdateEntryStatus() {
  const queryClient = useQueryClient();
  const storeUpdateEntryStatus = useJournalStore((s) => s.updateEntryStatus);

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      storeUpdateEntryStatus(id, status);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.entries }),
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts })
      ]);
    },
  });
}

/**
 * Updates a contact's fields in local storage.
 */
export function useUpdateContact() {
  const queryClient = useQueryClient();
  const storeUpdateContact = useJournalStore((s) => s.updateContact);

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SampleContact> }) => {
      storeUpdateContact(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts });
    },
  });
}

/**
 * Creates a new contact in local storage.
 */
export function useAddContact() {
  const queryClient = useQueryClient();
  const storeAddContact = useJournalStore((s) => s.addContact);

  return useMutation({
    mutationFn: async (contact: Omit<SampleContact, 'id' | 'entry_count' | 'last_entry'>) => {
      storeAddContact(contact);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts });
    },
  });
}

/**
 * Deletes a contact from local storage.
 */
export function useDeleteContact() {
  const queryClient = useQueryClient();
  const storeDeleteContact = useJournalStore((s) => s.deleteContact);

  return useMutation({
    mutationFn: async (id: string) => {
      storeDeleteContact(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts }),
      queryClient.invalidateQueries({ queryKey: queryKeys.entries })
    },
  });
}
