import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useResponsive } from '@/lib/useResponsive';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColors, useTheme } from '@/lib/ThemeProvider';
import { useContacts, useEntries, useDeleteContact } from '@/lib/hooks';
import { useRouter } from 'expo-router';
import { LoadingSkeletonList } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  calculateRelationshipHealth,
  healthScoreColor,
  healthStatusEmoji,
  targetLevelLabel,
} from '@/lib/sentiment';

export default function PeopleScreen() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const { data: contacts = [], isLoading } = useContacts();
  const { data: entries = [] } = useEntries();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRelationship, setFilterRelationship] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'health' | 'recent'>('health');
  const [showArchived, setShowArchived] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Bulk selection state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const deleteContactMutation = useDeleteContact();

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exitBulkMode = () => {
    setBulkMode(false);
    setSelectedIds(new Set());
  };

  const responsive = useResponsive();
  const numColumns = responsive.isDesktop ? 3 : responsive.isTablet ? 2 : 1;

  const relationships = useMemo(
    () => [...new Set(contacts.map((c) => c.relationship))].sort(),
    [contacts]
  );

  // Group entries by contact name to avoid O(C * E) search
  const entriesByContact = useMemo(() => {
    const map = new Map<string, typeof entries>();
    entries.forEach((e) => {
      const name = e.contact_name.toLowerCase();
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(e);
    });
    return map;
  }, [entries]);

  // Compute health for each contact
  const contactsWithHealth = useMemo(() => {
    return contacts.map((contact) => {
      const contactEntries = entriesByContact.get(contact.name.toLowerCase()) || [];
      const health = calculateRelationshipHealth(contactEntries, contact.targetLevel);
      return { contact, health };
    });
  }, [contacts, entriesByContact]);

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let result = contactsWithHealth.filter(({ contact: c }) => {
      // 1. Fail-fast: check simple boolean and equality filters first
      if (!showArchived && c.is_archived) return false;
      if (filterRelationship && c.relationship !== filterRelationship) return false;

      // 2. Expensive string search only if needed
      if (q) {
        return (
          c.name.toLowerCase().includes(q) ||
          (c.emails && c.emails.some(e => e.address.toLowerCase().includes(q))) ||
          (c.company && c.company.toLowerCase().includes(q)) ||
          (c.city && c.city.toLowerCase().includes(q)) ||
          c.relationship.toLowerCase().includes(q)
        );
      }

      return true;
    });

    // Sort
    if (sortBy === 'health') {
      result = [...result].sort((a, b) => b.health.score - a.health.score);
    } else if (sortBy === 'recent') {
      result = [...result].sort((a, b) => a.health.daysSinceLastContact - b.health.daysSinceLastContact);
    } else {
      result = [...result].sort((a, b) => a.contact.name.localeCompare(b.contact.name));
    }
    return result;
  }, [contactsWithHealth, searchQuery, filterRelationship, sortBy, showArchived]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRelationship, sortBy, showArchived, itemsPerPage]);

  const paginatedContacts = useMemo(() => {
    return filteredContacts.slice(0, currentPage * itemsPerPage);
  }, [filteredContacts, currentPage, itemsPerPage]);

  const archivedCount = useMemo(
    () => contactsWithHealth.filter(({ contact }) => contact.is_archived).length,
    [contactsWithHealth]
  );

  const Colors = useColors();
  const styles = useStyles(Colors);

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={{ flex: 1, maxWidth: responsive.maxContentWidth, alignSelf: 'center' as const, width: '100%', paddingHorizontal: responsive.contentPadding }}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={14} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, city, company…"
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Search contacts"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityRole="button" accessibilityLabel="Clear search">
              <FontAwesome name="times-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Sort + Filter Row */}
        <View style={styles.controlRow}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, !filterRelationship && styles.filterChipActive]}
              onPress={() => setFilterRelationship(null)}
            >
              <Text style={[styles.filterChipText, !filterRelationship && styles.filterChipTextActive]}>All</Text>
            </TouchableOpacity>
            {relationships.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.filterChip, filterRelationship === r && styles.filterChipActive]}
                onPress={() => setFilterRelationship(filterRelationship === r ? null : r)}
              >
                <Text style={[styles.filterChipText, filterRelationship === r && styles.filterChipTextActive]}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.sortRow}>
            {(['health', 'recent', 'name'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.sortBtn, sortBy === s && styles.sortBtnActive]}
                onPress={() => setSortBy(s)}
                accessibilityRole="button"
                accessibilityLabel={`Sort by ${s === 'health' ? 'relationship health' : s === 'recent' ? 'most recent' : 'name'}`}
                accessibilityState={{ selected: sortBy === s }}
              >
                <FontAwesome
                  name={s === 'health' ? 'heart' : s === 'recent' ? 'clock-o' : 'sort-alpha-asc'}
                  size={11}
                  color={sortBy === s ? '#FFFFFF' : Colors.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Archived toggle */}
        {archivedCount > 0 && (
          <TouchableOpacity
            style={[styles.archivedToggle, showArchived && styles.archivedToggleActive]}
            onPress={() => setShowArchived(!showArchived)}
          >
            <FontAwesome name="archive" size={11} color={showArchived ? Colors.warning : Colors.textMuted} />
            <Text style={[styles.archivedToggleText, showArchived && { color: Colors.warning }]}>
              {showArchived ? 'Hide' : 'Show'} Archived ({archivedCount})
            </Text>
          </TouchableOpacity>
        )}

        {/* Bulk mode header bar */}
        {bulkMode && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surfaceCard, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 8, borderWidth: 1, borderColor: Colors.danger + '40' }}>
            <TouchableOpacity onPress={exitBulkMode} style={{ padding: 4 }}>
              <FontAwesome name="times" size={14} color={Colors.textMuted} />
            </TouchableOpacity>
            <Text style={{ color: Colors.textPrimary, fontSize: 14, fontWeight: '600' }}>{selectedIds.size} selected</Text>
            <TouchableOpacity
              onPress={() => { if (selectedIds.size > 0) setShowBulkDeleteConfirm(true); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: selectedIds.size > 0 ? Colors.danger : Colors.borderSubtle, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, opacity: selectedIds.size > 0 ? 1 : 0.4 }}
              disabled={selectedIds.size === 0}
            >
              <FontAwesome name="trash" size={12} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLoading ? (
          <LoadingSkeletonList />
        ) : (
          <FlatList
            key={numColumns}
            data={paginatedContacts}
            keyExtractor={({ contact }) => contact.id}
            contentContainerStyle={styles.listContent}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1 ? { gap: 10 } : undefined}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: { contact, health } }) => {
              const scoreColor = healthScoreColor(health.score, resolvedTheme);
              const isArchived = contact.is_archived;
              return (
                <TouchableOpacity
                  style={[styles.contactCard, { borderLeftColor: scoreColor }, isArchived && styles.archivedCard, numColumns > 1 && { flex: 1 }, bulkMode && selectedIds.has(contact.id) && { borderColor: Colors.danger, borderWidth: 2 }]}
                  activeOpacity={0.7}
                  onPress={() => bulkMode ? toggleSelect(contact.id) : router.push(`/person/${contact.id}` as any)}
                  onLongPress={() => { if (!bulkMode) { setBulkMode(true); toggleSelect(contact.id); } }}
                >
                  {isArchived && (
                    <View style={styles.archivedBadge}>
                      <FontAwesome name="archive" size={8} color={Colors.warning} />
                    </View>
                  )}
                  <View style={[styles.avatar, { borderColor: scoreColor }]}>
                    <Text style={styles.avatarText}>{contact.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <View style={styles.contactNameRow}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      <Text style={styles.contactRelationship}>{contact.relationship}</Text>
                    </View>
                    {(contact.company || contact.city) && (
                      <View style={styles.contactDetailsRow}>
                        {contact.company && (
                          <View style={styles.detailPill}>
                            <FontAwesome name="building" size={10} color={Colors.textMuted} />
                            <Text style={styles.detailText}>{contact.company}</Text>
                          </View>
                        )}
                        {contact.city && (
                          <View style={styles.detailPill}>
                            <FontAwesome name="map-marker" size={10} color={Colors.textMuted} />
                            <Text style={styles.detailText}>{contact.city}</Text>
                          </View>
                        )}
                      </View>
                    )}
                    {/* Health mini-bar */}
                    <View style={styles.healthMiniRow}>
                      <View style={styles.healthMiniBarTrack}>
                        <View style={[styles.healthMiniBarFill, { width: `${health.score}%`, backgroundColor: scoreColor }]} />
                      </View>
                      <Text style={[styles.healthMiniLabel, { color: scoreColor }]}>
                        {healthStatusEmoji(health.status)} {health.score}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.contactStats}>
                    <View style={styles.statBadge}>
                      <Text style={styles.statNumber}>{contact.entry_count}</Text>
                      <Text style={styles.statLabel}>entries</Text>
                    </View>
                    <Text style={styles.lastDate}>{contact.last_entry}</Text>
                    {contact.targetLevel !== 'none' && (
                      <Text style={[styles.targetMini, { color: health.onTarget ? Colors.success : Colors.warning }]}>
                        {targetLevelLabel(contact.targetLevel)}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <EmptyState
                icon="users"
                title={searchQuery ? "No people found" : "No contacts yet"}
                body={searchQuery ? "Try a different search term" : "Your personal network will appear here once you add your first contact."}
                action={!searchQuery ? {
                  label: "Add Contact",
                  onPress: () => router.push('/person/new'),
                  icon: "plus"
                } : undefined}
              />
            }
            ListFooterComponent={
              filteredContacts.length > 0 ? (
                <View style={styles.paginationFooter}>
                  {paginatedContacts.length < filteredContacts.length && (
                    <TouchableOpacity 
                      style={styles.loadMoreBtn} 
                      onPress={() => setCurrentPage(p => p + 1)}
                    >
                      <Text style={styles.loadMoreText}>Load More</Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.itemsPerPageContainer}>
                    <Text style={styles.itemsPerPageLabel}>Show:</Text>
                    <TouchableOpacity 
                      style={[styles.itemsPerPageBtn, itemsPerPage === 10 && styles.itemsPerPageBtnActive]} 
                      onPress={() => setItemsPerPage(10)}
                    >
                      <Text style={[styles.itemsPerPageText, itemsPerPage === 10 && styles.itemsPerPageTextActive]}>10</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.itemsPerPageBtn, itemsPerPage === 25 && styles.itemsPerPageBtnActive]} 
                      onPress={() => setItemsPerPage(25)}
                    >
                      <Text style={[styles.itemsPerPageText, itemsPerPage === 25 && styles.itemsPerPageTextActive]}>25</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null
            }
          />
        )}
      </View>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/person/new')}
        accessibilityRole="button"
        accessibilityLabel="Add new contact"
      >
        <FontAwesome name="plus" size={20} color={Colors.background} />
      </TouchableOpacity>

      <ConfirmDialog
        open={showBulkDeleteConfirm}
        title={`Delete ${selectedIds.size} contact${selectedIds.size === 1 ? '' : 's'}?`}
        body="This will permanently remove the selected contacts and all their journal entries. This cannot be undone."
        confirmLabel="Delete All"
        destructive
        onConfirm={() => {
          selectedIds.forEach((id) => deleteContactMutation.mutate(id));
          setShowBulkDeleteConfirm(false);
          exitBulkMode();
        }}
        onCancel={() => setShowBulkDeleteConfirm(false)}
      />
    </View>
  );
}

const useStyles = (Colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.secondaryAccent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceCard, marginTop: 12, marginBottom: 8, borderRadius: 12, paddingHorizontal: 14, height: 44, borderWidth: 1, borderColor: Colors.border },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 15 },

  controlRow: { marginBottom: 8, gap: 8 },
  filterRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filterChip: { backgroundColor: Colors.surfaceCard, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primaryAccent, borderColor: Colors.primaryAccent },
  filterChipText: { color: Colors.textMuted, fontSize: 12, textTransform: 'capitalize' },
  filterChipTextActive: { color: '#FFFFFF', fontWeight: '600' },

  sortRow: { flexDirection: 'row', gap: 4, alignSelf: 'flex-end' },
  sortBtn: { padding: 6, backgroundColor: Colors.surfaceCard, borderRadius: 6, borderWidth: 1, borderColor: Colors.border },
  sortBtnActive: { backgroundColor: Colors.primaryAccent, borderColor: Colors.primaryAccent },

  listContent: { paddingBottom: 24 },
  contactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceCard, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryAccent, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  contactInfo: { flex: 1, marginLeft: 12 },
  contactNameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  contactName: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' },
  contactRelationship: { color: Colors.secondaryAccent, fontSize: 11, textTransform: 'capitalize' },
  contactDetailsRow: { flexDirection: 'row', gap: 8, marginTop: 3, flexWrap: 'wrap' },
  detailPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { color: Colors.textMuted, fontSize: 11 },

  // Health mini-bar
  healthMiniRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  healthMiniBarTrack: { flex: 1, height: 4, backgroundColor: Colors.borderSubtle, borderRadius: 2, overflow: 'hidden' },
  healthMiniBarFill: { height: '100%', borderRadius: 2 },
  healthMiniLabel: { fontSize: 11, fontWeight: '700', fontFamily: 'SpaceMono' },

  contactStats: { alignItems: 'flex-end', gap: 2 },
  statBadge: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statNumber: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  statLabel: { color: Colors.textMuted, fontSize: 11 },
  lastDate: { color: Colors.textMuted, fontSize: 11, fontFamily: 'SpaceMono' },
  targetMini: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Archive UI
  archivedToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: Colors.borderSubtle, marginBottom: 8 },
  archivedToggleActive: { borderColor: Colors.warning, backgroundColor: 'rgba(251, 191, 36, 0.08)' },
  archivedToggleText: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' },
  archivedCard: { opacity: 0.55 },
  archivedBadge: { position: 'absolute', top: 6, right: 8, zIndex: 1 },

  // Pagination
  paginationFooter: { marginTop: 16, alignItems: 'center', gap: 16 },
  loadMoreBtn: { backgroundColor: Colors.surfaceCard, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  loadMoreText: { color: Colors.textPrimary, fontWeight: '600' },
  itemsPerPageContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemsPerPageLabel: { color: Colors.textMuted, fontSize: 12 },
  itemsPerPageBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: Colors.surfaceCard, borderWidth: 1, borderColor: Colors.border },
  itemsPerPageBtnActive: { backgroundColor: Colors.primaryAccent, borderColor: Colors.primaryAccent },
  itemsPerPageText: { color: Colors.textMuted, fontSize: 12 },
  itemsPerPageTextActive: { color: '#FFFFFF', fontWeight: '600' },
});
