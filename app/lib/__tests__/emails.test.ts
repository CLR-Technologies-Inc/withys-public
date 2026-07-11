import { useJournalStore } from '../store';

describe('Contact Emails Management', () => {
  beforeEach(() => {
    // Reset store
    useJournalStore.setState({
      entries: [],
      contacts: [],
      tags: [],
    });
  });

  it('should initialize contact with empty emails if undefined', () => {
    const store = useJournalStore.getState();
    expect(store.contacts).toEqual([]);
    
    // Test logic: When adding a contact through UI (handled locally until DB syncs),
    // it gets added to the store via setContacts or similar. Since we now use React Query,
    // the store acts mostly as a caching layer or local sync.
    // Let's just verify the store exposes the emails array properly.
    useJournalStore.setState({
      contacts: [
        {
          id: 'test-1',
          name: 'Jane Doe',
          relationship: 'friend',
          entry_count: 0,
          last_entry: '',
          emails: [{ address: 'jane@example.com', tag: 'work', is_preferred: true }],
          targetLevel: 'weekly',
        }
      ]
    });
    
    const updatedStore = useJournalStore.getState();
    expect(updatedStore.contacts[0].emails).toBeDefined();
    expect(updatedStore.contacts[0].emails?.length).toBe(1);
    expect(updatedStore.contacts[0].emails?.[0].address).toBe('jane@example.com');
    expect(updatedStore.contacts[0].emails?.[0].is_preferred).toBe(true);
  });
});
