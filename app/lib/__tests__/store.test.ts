/**
 * Unit tests for the Zustand journal store.
 *
 * Tests cover:
 *   - Initial state (sample data loaded)
 *   - Filter actions (search, month, view mode)
 *   - Entry CRUD (add, update, delete) with optimistic updates
 *   - Contact CRUD (add, update, delete, target level)
 *   - Sync state management
 *   - Auto-creation of contacts when adding entries for new people
 *
 * Note: Supabase calls are mocked — we test local state transitions only.
 */

import { useJournalStore } from '../store';
import { SAMPLE_ENTRIES, SAMPLE_CONTACTS, SAMPLE_TAGS } from './mockData';
import type { SampleEntry } from '../sampleData';



// Mock vault module to prevent crypto calls in store init
jest.mock('../vault', () => ({
  encrypt: jest.fn().mockResolvedValue({ ciphertext: 'mock', version: 1 }),
  decrypt: jest.fn().mockResolvedValue('decrypted'),
  hashPassphrase: jest.fn().mockResolvedValue('mock-hash'),
  verifyPassphrase: jest.fn().mockResolvedValue(true),
  isEncryptedEntry: jest.fn().mockReturnValue(false),
  serializeEncrypted: jest.fn().mockReturnValue('VAULT:1:mock'),
  deserializeEncrypted: jest.fn().mockReturnValue({ ciphertext: 'mock', version: 1 }),
}));

describe('useJournalStore', () => {
  beforeEach(() => {
    // Reset store to default state before each test
    useJournalStore.setState({
      entries: [...SAMPLE_ENTRIES],
      contacts: [...SAMPLE_CONTACTS],
      tags: [...SAMPLE_TAGS],
      sync: { isOnline: false, isLoaded: false, lastError: null, isSyncing: false },
      userId: null,
      searchQuery: '',
      selectedMonth: null,
      viewMode: 'list',
      vaultPassphrase: null,
      vaultPassphraseHash: null,
      vaultUnlocked: false,
      vaultConfigured: false,
    });
  });

  // ── Initial State ─────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('loads sample data by default', () => {
      const state = useJournalStore.getState();
      expect(state.entries.length).toBe(SAMPLE_ENTRIES.length);
      expect(state.contacts.length).toBe(SAMPLE_CONTACTS.length);
      expect(state.tags.length).toBe(SAMPLE_TAGS.length);
    });

    it('starts with offline sync state', () => {
      const { sync } = useJournalStore.getState();
      expect(sync.isOnline).toBe(false);
      expect(sync.isLoaded).toBe(false);
      expect(sync.lastError).toBeNull();
      expect(sync.isSyncing).toBe(false);
    });

    it('starts with vault locked', () => {
      const state = useJournalStore.getState();
      expect(state.vaultUnlocked).toBe(false);
      expect(state.vaultConfigured).toBe(false);
      expect(state.vaultPassphrase).toBeNull();
    });
  });

  // ── Filter Actions ────────────────────────────────────────────────────────

  describe('filter actions', () => {
    it('setSearchQuery updates the search query', () => {
      useJournalStore.getState().setSearchQuery('potatoes');
      expect(useJournalStore.getState().searchQuery).toBe('potatoes');
    });

    it('setSelectedMonth updates the selected month', () => {
      useJournalStore.getState().setSelectedMonth('2025-07');
      expect(useJournalStore.getState().selectedMonth).toBe('2025-07');
    });

    it('setSelectedMonth can be cleared to null', () => {
      useJournalStore.getState().setSelectedMonth('2025-07');
      useJournalStore.getState().setSelectedMonth(null);
      expect(useJournalStore.getState().selectedMonth).toBeNull();
    });

    it('setViewMode changes the view mode', () => {
      useJournalStore.getState().setViewMode('calendar');
      expect(useJournalStore.getState().viewMode).toBe('calendar');

      useJournalStore.getState().setViewMode('continuous');
      expect(useJournalStore.getState().viewMode).toBe('continuous');
    });
  });

  // ── Entry CRUD ────────────────────────────────────────────────────────────

  describe('addEntry', () => {
    it('adds an entry to the beginning of the list', () => {
      const newEntry: SampleEntry = {
        id: 'new-1',
        entry_date: '2025-09-01',
        contact_name: 'New Person',
        location: 'Somewhere',
        raw_text: '2025-09-01 New Person | Somewhere\n    Hello',
        tags: [],
        source: 'manual',
        status: 'approved',
      };

      const initialCount = useJournalStore.getState().entries.length;
      useJournalStore.getState().addEntry(newEntry);

      const state = useJournalStore.getState();
      expect(state.entries.length).toBe(initialCount + 1);
      expect(state.entries[0].id).toBe('new-1');
    });

    it('auto-creates a contact for unknown contact names', () => {
      const newEntry: SampleEntry = {
        id: 'new-2',
        entry_date: '2025-09-01',
        contact_name: 'Brand New Person',
        location: '',
        raw_text: '2025-09-01 Brand New Person\n    Met them',
        tags: [],
        source: 'manual',
        status: 'approved',
      };

      const initialContactCount = useJournalStore.getState().contacts.length;
      useJournalStore.getState().addEntry(newEntry);

      const contacts = useJournalStore.getState().contacts;
      expect(contacts.length).toBe(initialContactCount + 1);

      const newContact = contacts.find(c => c.name === 'Brand New Person');
      expect(newContact).toBeDefined();
      expect(newContact!.relationship).toBe('acquaintance');
      expect(newContact!.entry_count).toBe(1);
    });

    it('increments entry_count for existing contacts', () => {
      const existingContact = useJournalStore.getState().contacts.find(c => c.name === 'John');
      const initialCount = existingContact!.entry_count;

      useJournalStore.getState().addEntry({
        id: 'new-3',
        entry_date: '2025-09-05',
        contact_name: 'John',
        location: '',
        raw_text: '2025-09-05 John\n    Another meeting',
        tags: [],
        source: 'manual',
        status: 'approved',
      });

      const updatedContact = useJournalStore.getState().contacts.find(c => c.name === 'John');
      expect(updatedContact!.entry_count).toBe(initialCount + 1);
    });

    it('maintains date-descending sort order', () => {
      useJournalStore.getState().addEntry({
        id: 'old-entry',
        entry_date: '2020-01-01',
        contact_name: 'Old',
        location: '',
        raw_text: '2020-01-01 Old\n    Way back',
        tags: [],
        source: 'manual',
        status: 'approved',
      });

      const entries = useJournalStore.getState().entries;
      // Old entry should be at the end
      expect(entries[entries.length - 1].id).toBe('old-entry');
    });
  });

  describe('updateEntry', () => {
    it('updates the raw_text of an existing entry', () => {
      const entryId = SAMPLE_ENTRIES[0].id;
      const newText = '2025-07-01 John | Updated Location\n    Updated description';

      useJournalStore.getState().updateEntry(entryId, newText);

      const updated = useJournalStore.getState().entries.find(e => e.id === entryId);
      expect(updated!.raw_text).toBe(newText);
    });

    it('updates the entry_date from raw_text', () => {
      const entryId = SAMPLE_ENTRIES[0].id;
      const newText = '2026-01-15 John\n    New date';

      useJournalStore.getState().updateEntry(entryId, newText);

      const updated = useJournalStore.getState().entries.find(e => e.id === entryId);
      expect(updated!.entry_date).toBe('2026-01-15');
    });
  });

  describe('deleteEntry', () => {
    it('removes the entry from the list', () => {
      const entryId = SAMPLE_ENTRIES[0].id;
      const initialCount = useJournalStore.getState().entries.length;

      useJournalStore.getState().deleteEntry(entryId);

      const state = useJournalStore.getState();
      expect(state.entries.length).toBe(initialCount - 1);
      expect(state.entries.find(e => e.id === entryId)).toBeUndefined();
    });
  });

  // ── Contact CRUD ──────────────────────────────────────────────────────────

  describe('addContact', () => {
    it('adds a new contact with computed fields', () => {
      const initialCount = useJournalStore.getState().contacts.length;

      useJournalStore.getState().addContact({
        name: 'Test Contact',
        relationship: 'friend',
        targetLevel: 'weekly',
      });

      const contacts = useJournalStore.getState().contacts;
      expect(contacts.length).toBe(initialCount + 1);

      const added = contacts.find(c => c.name === 'Test Contact');
      expect(added).toBeDefined();
      expect(added!.entry_count).toBe(0);
      expect(added!.last_entry).toBe('');
      expect(added!.id).toBeDefined();
    });
  });

  describe('updateContact', () => {
    it('updates contact fields via partial updates', () => {
      const contactId = SAMPLE_CONTACTS[0].id;

      useJournalStore.getState().updateContact(contactId, {
        name: 'Updated Name',
        city: 'New York',
      });

      const updated = useJournalStore.getState().contacts.find(c => c.id === contactId);
      expect(updated!.name).toBe('Updated Name');
      expect(updated!.city).toBe('New York');
    });

    it('does not affect other contacts', () => {
      const contactId = SAMPLE_CONTACTS[0].id;
      const otherContact = SAMPLE_CONTACTS[1];

      useJournalStore.getState().updateContact(contactId, { name: 'Changed' });

      const unchanged = useJournalStore.getState().contacts.find(c => c.id === otherContact.id);
      expect(unchanged!.name).toBe(otherContact.name);
    });
  });

  describe('deleteContact', () => {
    it('removes the contact from the list', () => {
      const contactId = SAMPLE_CONTACTS[0].id;
      const initialCount = useJournalStore.getState().contacts.length;

      useJournalStore.getState().deleteContact(contactId);

      const contacts = useJournalStore.getState().contacts;
      expect(contacts.length).toBe(initialCount - 1);
      expect(contacts.find(c => c.id === contactId)).toBeUndefined();
    });
  });


  // ── User & Sync ───────────────────────────────────────────────────────────

  describe('setUserId', () => {
    it('sets the user ID', () => {
      useJournalStore.getState().setUserId('user-123');
      expect(useJournalStore.getState().userId).toBe('user-123');
    });

    it('can clear the user ID', () => {
      useJournalStore.getState().setUserId('user-123');
      useJournalStore.getState().setUserId(null);
      expect(useJournalStore.getState().userId).toBeNull();
    });
  });
});
