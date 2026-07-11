import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useResponsive } from '@/lib/useResponsive';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColors } from '@/lib/ThemeProvider';
import { useEntries, useTags, useUpdateEntryStatus, useDeleteEntry, useContacts } from '@/lib/hooks';
import { parseMarkdownEntry } from '@/lib/markdownParser';
import { LoadingSkeletonList } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { isEncryptedEntry } from '@/lib/vault';
import { useJournalStore } from '@/lib/store';
import type { EntrySource, EntryStatus } from '@/lib/sampleData';

type ViewMode = 'list' | 'calendar' | 'continuous';

export default function JournalScreen() {
  const Colors = useColors();
  const styles = useStyles(Colors);
  const router = useRouter();
  const params = useLocalSearchParams<{ search?: string }>();
  const storeSearchQuery = useJournalStore((s) => s.searchQuery);
  const setStoreSearchQuery = useJournalStore((s) => s.setSearchQuery);
  const { data: entries = [], isLoading } = useEntries();
  const [searchQuery, setSearchQuery] = useState(params.search || storeSearchQuery || '');

  // Sync search query from store (set by Categories tab) or URL params
  useEffect(() => {
    if (storeSearchQuery) {
      setSearchQuery(storeSearchQuery);
      // Clear the store after consuming so subsequent tab visits start fresh
      setStoreSearchQuery('');
    } else if (params.search) {
      setSearchQuery(params.search);
    }
  }, [storeSearchQuery, params.search]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<EntrySource | null>(null);
  const [showPendingQueue, setShowPendingQueue] = useState(false);
  const { data: tags = [] } = useTags();
  const updateStatus = useUpdateEntryStatus();
  const deleteEntry = useDeleteEntry();
  const { data: contacts = [] } = useContacts();
  const onboardingComplete = useJournalStore((s) => s.onboardingComplete);
  const dismissOnboarding = useJournalStore((s) => s.dismissOnboarding);
  const hasSelfProfile = contacts.some(c => c.is_self);

  // Sort entries once by date (descending) to avoid O(N log N) sorts in multiple hooks
  // Using localeCompare on ISO date strings is significantly faster than new Date().getTime()
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => b.entry_date.localeCompare(a.entry_date));
  }, [entries]);

  // Available months
  const availableMonths = useMemo(() => {
    const months = [...new Set(entries.map((e) => e.entry_date.substring(0, 7)))].sort().reverse();
    return months;
  }, [entries]);

  const availableLocations = useMemo(() => {
    return [...new Set(entries.filter(e => e.location).map(e => e.location))].sort();
  }, [entries]);

  const topTags = useMemo(() => {
    return [...tags].sort((a, b) => b.entry_count - a.entry_count).slice(0, 10);
  }, [tags]);

  const availableSources = useMemo(() => {
    const sources = [...new Set(entries.map(e => e.source))].filter(Boolean);
    return sources.sort();
  }, [entries]);

  const pendingEntries = useMemo(() => {
    return sortedEntries.filter(e => e.status === 'pending');
  }, [sortedEntries]);

  const pendingCount = pendingEntries.length;

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const selTag = selectedTag?.toLowerCase();

    // Combine all filters into a single O(N) pass over the already sorted array
    return sortedEntries.filter((e) => {
      // 1. Status check (most entries are approved, so check this first to fail fast if pending)
      if (e.status === 'pending') return false;

      // 2. Simple equality filters
      if (selectedMonth && !e.entry_date.startsWith(selectedMonth)) return false;
      if (selectedLocation && e.location !== selectedLocation) return false;
      if (selectedSource && e.source !== selectedSource) return false;

      // 3. Tag filter (slightly more expensive)
      if (selTag && !e.tags.some(t => t.toLowerCase() === selTag)) return false;

      // 4. Search query (most expensive string lookups)
      if (q) {
        return (
          e.raw_text.toLowerCase().includes(q) ||
          e.contact_name.toLowerCase().includes(q) ||
          (e.location && e.location.toLowerCase().includes(q)) ||
          e.tags.some((t) => t.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [sortedEntries, searchQuery, selectedMonth, selectedTag, selectedLocation, selectedSource]);

  // Group entries by date for continuous view
  const groupedByDate = useMemo(() => {
    // Result is an array of [date, entries[]] pairs
    const groups: [string, typeof entries][] = [];
    let currentGroup: [string, typeof entries] | null = null;

    // Since filteredEntries is already sorted by date desc, we can group in one pass
    filteredEntries.forEach((e) => {
      if (!currentGroup || currentGroup[0] !== e.entry_date) {
        currentGroup = [e.entry_date, []];
        groups.push(currentGroup);
      }
      currentGroup[1].push(e);
    });
    return groups;
  }, [filteredEntries]);

  // Calendar grid data
  const calendarData = useMemo(() => {
    const month = selectedMonth || new Date().toISOString().substring(0, 7);
    const [year, mon] = month.split('-').map(Number);
    const firstDay = new Date(year, mon - 1, 1).getDay();
    const daysInMonth = new Date(year, mon, 0).getDate();
    const entriesByDay: Record<number, { count: number; hasFuture: boolean }> = {};
    
    const today = new Date();
    // Format YYYY-MM-DD in local time
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    filteredEntries
      .filter((e) => e.entry_date.startsWith(month))
      .forEach((e) => {
        const day = parseInt(e.entry_date.split('-')[2]);
        if (!entriesByDay[day]) entriesByDay[day] = { count: 0, hasFuture: false };
        entriesByDay[day].count += 1;
        if (e.entry_date > todayStr) {
          entriesByDay[day].hasFuture = true;
        }
      });
    return { year, month: mon, firstDay, daysInMonth, entriesByDay, monthStr: month };
  }, [selectedMonth, filteredEntries]);

  const formatMonthLabel = (m: string) => {
    const [y, mo] = m.split('-');
    const date = new Date(parseInt(y), parseInt(mo) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const hasActiveFilters = !!(searchQuery.trim() || selectedMonth || selectedTag || selectedLocation || selectedSource);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedMonth(null);
    setSelectedTag(null);
    setSelectedLocation(null);
    setSelectedSource(null);
  };

  const renderEntryCard = ({ item }: { item: (typeof entries)[0] }) => {
    const encrypted = isEncryptedEntry(item.raw_text);
    let preview = '';
    if (!encrypted) {
      const md = parseMarkdownEntry(item.raw_text);
      const desc = md.title ? `${md.title} — ${md.body}` : md.body;
      preview = desc.length > 100 ? desc.slice(0, 100) + '…' : desc;
    }
    return (
      <TouchableOpacity
        style={[styles.entryCard, encrypted && styles.entryCardEncrypted]}
        activeOpacity={0.7}
        onPress={() => router.push(`/entry/${item.id}` as any)}
      >
        <View style={styles.entryHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {encrypted && <FontAwesome name="lock" size={11} color={Colors.vaultAccent} />}
            <Text style={styles.entryDate}>{item.entry_date}</Text>
          </View>
          <View style={styles.entryMeta}>
            <FontAwesome name="user" size={12} color={Colors.secondaryAccent} />
            <Text style={styles.entryContact}>{item.contact_name}</Text>
            {item.location ? (
              <>
                <FontAwesome name="map-marker" size={12} color={Colors.textMuted} style={{ marginLeft: 10 }} />
                <Text style={styles.entryLocation}>{item.location}</Text>
              </>
            ) : null}
            {!encrypted && parseMarkdownEntry(item.raw_text).frontmatter.photo ? (
              <FontAwesome name="picture-o" size={12} color={Colors.primaryAccent} style={{ marginLeft: 10 }} />
            ) : null}
          </View>
        </View>
        {encrypted ? (
          <View style={styles.encryptedPreview}>
            <FontAwesome name="lock" size={12} color={Colors.vaultAccent} />
            <Text style={styles.encryptedPreviewText}>Encrypted vault entry</Text>
          </View>
        ) : (
          <Text style={styles.entryPreview} numberOfLines={2}>{preview}</Text>
        )}
        {item.tags.length > 0 && (
          <View style={styles.tagRow}>
            {item.tags.slice(0, 3).map((tag, i) => (
              <View key={i} style={[styles.tag, tag === 'vault:true' && styles.vaultTag]}>
                <Text style={[styles.tagText, tag === 'vault:true' && styles.vaultTagText]}>{tag}</Text>
              </View>
            ))}
            {item.tags.length > 3 && <Text style={styles.tagMore}>+{item.tags.length - 3}</Text>}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const responsive = useResponsive();
  const wrapperStyle = { flex: 1 as const, maxWidth: responsive.maxContentWidth, alignSelf: 'center' as const, width: '100%' as const, paddingHorizontal: responsive.contentPadding };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={wrapperStyle}>
      {/* Search + Filter Bar */}
      <View style={styles.topBar}>
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={14} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search entries…"
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityRole="button" accessibilityLabel="Clear search">
              <FontAwesome name="times-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Month Filter */}
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.monthBtn} onPress={() => setShowMonthPicker(!showMonthPicker)}>
            <FontAwesome name="calendar" size={13} color={Colors.secondaryAccent} />
            <Text style={styles.monthBtnText}>
              {selectedMonth ? formatMonthLabel(selectedMonth) : 'All months'}
            </Text>
            <FontAwesome name={showMonthPicker ? 'chevron-up' : 'chevron-down'} size={10} color={Colors.textMuted} />
          </TouchableOpacity>
          {selectedMonth && (
            <TouchableOpacity onPress={() => setSelectedMonth(null)} style={styles.clearBtn} accessibilityRole="button" accessibilityLabel="Clear month filter">
              <FontAwesome name="times" size={12} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
          <View style={styles.viewToggle}>
            {(['list', 'calendar', 'continuous'] as ViewMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.viewToggleBtn, viewMode === mode && styles.viewToggleBtnActive]}
                onPress={() => setViewMode(mode)}
                accessibilityRole="button"
                accessibilityLabel={`${mode.charAt(0).toUpperCase() + mode.slice(1)} view`}
                accessibilityState={{ selected: viewMode === mode }}
              >
                <FontAwesome
                  name={mode === 'list' ? 'list' : mode === 'calendar' ? 'calendar' : 'align-left'}
                  size={13}
                  color={viewMode === mode ? '#FFFFFF' : Colors.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Tag, Location & Source Quick Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickFilters}>
        {(selectedTag || selectedLocation || selectedMonth || selectedSource) ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.clearAllBtn}
            onPress={() => {
              setSelectedTag(null);
              setSelectedLocation(null);
              setSelectedMonth(null);
              setSelectedSource(null);
            }}
          >
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        ) : null}
        {availableSources.length > 1 && availableSources.map(src => (
          <TouchableOpacity
            accessibilityRole="button"
            key={src}
            style={[styles.filterChip, selectedSource === src && styles.filterChipActive]}
            onPress={() => setSelectedSource(selectedSource === src ? null : src)}
          >
            <Text style={[styles.filterChipText, selectedSource === src && styles.filterChipTextActive]}>{src}</Text>
          </TouchableOpacity>
        ))}
        {availableLocations.map(loc => (
          <TouchableOpacity
            accessibilityRole="button"
            key={loc}
            style={[styles.filterChip, selectedLocation === loc && styles.filterChipActive]}
            onPress={() => setSelectedLocation(selectedLocation === loc ? null : loc)}
          >
            <FontAwesome name="map-marker" size={10} color={selectedLocation === loc ? Colors.textPrimary : Colors.textMuted} />
            <Text style={[styles.filterChipText, selectedLocation === loc && styles.filterChipTextActive]}>{loc}</Text>
          </TouchableOpacity>
        ))}
        {topTags.map(tag => (
          <TouchableOpacity
            accessibilityRole="button"
            key={tag.id}
            style={[styles.filterChip, selectedTag === tag.name && styles.filterChipActive]}
            onPress={() => setSelectedTag(selectedTag === tag.name ? null : tag.name)}
          >
            <Text style={[styles.filterChipText, selectedTag === tag.name && styles.filterChipTextActive]}>#{tag.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Month Picker Dropdown */}
      {showMonthPicker && (
        <ScrollView style={styles.monthDropdown} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthDropdownContent}>
          {availableMonths.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.monthChip, selectedMonth === m && styles.monthChipActive]}
              onPress={() => { setSelectedMonth(m); setShowMonthPicker(false); }}
            >
              <Text style={[styles.monthChipText, selectedMonth === m && styles.monthChipTextActive]}>
                {formatMonthLabel(m)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Pending Review Queue ────────────────────────────────────── */}
      {pendingCount > 0 && (
        <View style={styles.pendingSection}>
          <TouchableOpacity
            style={styles.pendingBanner}
            onPress={() => setShowPendingQueue(!showPendingQueue)}
            activeOpacity={0.7}
          >
            <View style={styles.pendingBannerLeft}>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
              </View>
              <Text style={styles.pendingBannerText}>
                {pendingCount === 1 ? '1 entry' : `${pendingCount} entries`} pending review
              </Text>
            </View>
            <FontAwesome
              name={showPendingQueue ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={Colors.warning}
            />
          </TouchableOpacity>

          {showPendingQueue && (
            <ScrollView style={styles.pendingQueueScroll} nestedScrollEnabled showsVerticalScrollIndicator={true}>
              <View style={styles.pendingQueue}>
                {pendingEntries.map((item) => {
                  const md = parseMarkdownEntry(item.raw_text);
                  const preview = md.title ? `${md.title} — ${md.body}` : md.body;
                  return (
                    <View key={item.id} style={styles.pendingCard}>
                      <View style={styles.pendingCardHeader}>
                        <Text style={styles.pendingCardDate}>{item.entry_date}</Text>
                        <View style={styles.pendingCardMeta}>
                          <Text style={styles.pendingCardSource}>{item.source}</Text>
                        </View>
                      </View>
                      <Text style={styles.pendingCardContact}>{item.contact_name}</Text>
                      <Text style={styles.pendingCardPreview} numberOfLines={2}>
                        {preview.length > 120 ? preview.slice(0, 120) + '…' : preview}
                      </Text>
                      <View style={styles.pendingActions}>
                        <TouchableOpacity
                          style={styles.pendingApproveBtn}
                          onPress={() => updateStatus.mutate({ id: item.id, status: 'approved' })}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={`Approve entry from ${item.contact_name}`}
                        >
                          <FontAwesome name="check" size={13} color={Colors.success} />
                          <Text style={styles.pendingApproveBtnText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.pendingRejectBtn}
                          onPress={() => updateStatus.mutate({ id: item.id, status: 'rejected' })}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={`Reject entry from ${item.contact_name}`}
                        >
                          <FontAwesome name="times" size={13} color={Colors.danger} />
                          <Text style={styles.pendingRejectBtnText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.pendingViewBtn}
                          onPress={() => router.push(`/entry/${item.id}` as any)}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={`View entry from ${item.contact_name}`}
                        >
                          <FontAwesome name="eye" size={13} color={Colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* ── Onboarding Banner ── */}
      {!onboardingComplete && !hasSelfProfile && !isLoading && (
        <View style={{ marginHorizontal: 16, marginTop: 8, backgroundColor: Colors.surfaceCard, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.secondaryAccent + '30' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.secondaryAccent + '15', alignItems: 'center', justifyContent: 'center' }}>
              <FontAwesome name="user-circle" size={18} color={Colors.secondaryAccent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 2 }}>Set up your profile</Text>
              <Text style={{ color: Colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
                {"Create a \"Me\" contact to keep personal journal entries and reflections separate from your network."}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.secondaryAccent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 }}
                  onPress={() => router.push('/person/new')}
                >
                  <FontAwesome name="plus" size={11} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Create Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ paddingHorizontal: 10, paddingVertical: 7 }}
                  onPress={dismissOnboarding}
                >
                  <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        isLoading ? (
          <LoadingSkeletonList />
        ) : (
          <FlatList
            style={styles.listScroll}
            data={filteredEntries}
            keyExtractor={(item) => item.id}
            renderItem={renderEntryCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                icon={hasActiveFilters ? "search" : "book"}
                title={hasActiveFilters ? "No results found" : "No entries yet"}
                body={hasActiveFilters ? "Try adjusting your filters or search term." : "Tap + to create your first entry"}
                action={hasActiveFilters ? {
                  label: "Clear All Filters",
                  onPress: clearFilters,
                  icon: "times"
                } : {
                  label: "New Entry",
                  onPress: () => router.push('/modal'),
                  icon: "plus"
                }}
              />
            }
          />
        )
      )}

      {/* CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <ScrollView style={styles.calendarScroll} contentContainerStyle={styles.calendarContent}>
          <Text style={styles.calendarTitle}>{formatMonthLabel(calendarData.monthStr)}</Text>
          <View style={styles.calendarDayNames}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <Text key={d} style={styles.calendarDayName}>{d}</Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {Array.from({ length: calendarData.firstDay }).map((_, i) => (
              <View key={`blank-${i}`} style={styles.calendarCell} />
            ))}
            {Array.from({ length: calendarData.daysInMonth }).map((_, i) => {
              const day = i + 1;
              const data = calendarData.entriesByDay[day];
              const count = data?.count || 0;
              const hasFuture = data?.hasFuture || false;
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.calendarCell,
                    count > 0 && !hasFuture && styles.calendarCellActive,
                    hasFuture && styles.calendarCellFuture
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (count > 0) {
                      const dateStr = `${calendarData.monthStr}-${String(day).padStart(2, '0')}`;
                      setSearchQuery(dateStr);
                      setViewMode('list');
                    }
                  }}
                >
                  <Text style={[
                    styles.calendarDay,
                    count > 0 && !hasFuture && styles.calendarDayActive,
                    hasFuture && styles.calendarDayFuture
                  ]}>
                    {day}
                  </Text>
                  {count > 0 && (
                    <View style={[styles.calendarDot, hasFuture && { backgroundColor: Colors.success }]}>
                      <Text style={styles.calendarDotText}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* CONTINUOUS VIEW */}
      {viewMode === 'continuous' && (
        <ScrollView style={styles.continuousScroll} contentContainerStyle={styles.continuousContent}>
          {groupedByDate.map(([date, dayEntries]) => (
            <View key={date} style={styles.dayGroup}>
              <View style={styles.dayHeader}>
                <View style={styles.dayDot} />
                <Text style={styles.dayTitle}>{new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</Text>
              </View>
              <View style={styles.dayTimeline}>
                {dayEntries.map((entry) => {
                  const encrypted = isEncryptedEntry(entry.raw_text);
                  const md = encrypted ? null : parseMarkdownEntry(entry.raw_text);
                  return (
                    <TouchableOpacity key={entry.id} style={[styles.timelineEntry, encrypted && styles.timelineEntryEncrypted]} onPress={() => router.push(`/entry/${entry.id}` as any)} activeOpacity={0.7}>
                      <View style={styles.timelineLeft}>
                        {encrypted && <FontAwesome name="lock" size={11} color={Colors.vaultAccent} />}
                        <Text style={styles.timelineContact}>{entry.contact_name}</Text>
                        {entry.location ? <Text style={styles.timelineLoc}>@ {entry.location}</Text> : null}
                      </View>
                      {encrypted ? (
                        <View style={styles.timelineEncrypted}>
                          <FontAwesome name="lock" size={12} color={Colors.vaultAccent} />
                          <Text style={styles.timelineEncryptedText}>Encrypted vault entry</Text>
                        </View>
                      ) : (
                        <View style={styles.timelineBody}>
                          {md?.title ? <Text style={styles.timelineText}><Text style={{ fontWeight: '700' }}>{md.title}</Text></Text> : null}
                          {md?.body ? <Text style={styles.timelineText} numberOfLines={3}>{md.body}</Text> : null}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
          {groupedByDate.length === 0 && (
            <EmptyState
              icon={hasActiveFilters ? "search" : "book"}
              title={hasActiveFilters ? "No results found" : "No entries yet"}
              body={hasActiveFilters ? "Try adjusting your filters or search term." : "Tap + to create your first entry"}
              action={hasActiveFilters ? {
                label: "Clear All Filters",
                onPress: clearFilters,
                icon: "times"
              } : {
                label: "New Entry",
                onPress: () => router.push('/modal'),
                icon: "plus"
              }}
            />
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={() => router.push('/modal' as any)} accessibilityRole="button" accessibilityLabel="New journal entry">
        <FontAwesome name="plus" size={22} color={Colors.textPrimary} />
      </TouchableOpacity>
      </View>
    </View>
  );
}

function useStyles(Colors: any) {
  return useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { paddingTop: 12, gap: 8 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceCard, borderRadius: 12, paddingHorizontal: 14, height: 44, borderWidth: 1, borderColor: Colors.border },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 15 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monthBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surfaceCard, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  monthBtnText: { color: Colors.textSecondary, fontSize: 13 },
  clearBtn: { padding: 6 },
  viewToggle: { flexDirection: 'row', marginLeft: 'auto', backgroundColor: Colors.surfaceCard, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  viewToggleBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  viewToggleBtnActive: { backgroundColor: Colors.primaryAccent },
  quickFilters: { marginHorizontal: -16, paddingHorizontal: 16, marginTop: 8, maxHeight: 36 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surfaceCard, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border, marginRight: 8 },
  filterChipActive: { backgroundColor: Colors.primaryAccent, borderColor: Colors.primaryAccent },
  filterChipText: { color: Colors.textSecondary, fontSize: 12 },
  filterChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  clearAllBtn: { backgroundColor: Colors.borderSubtle, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8, justifyContent: 'center' },
  clearAllText: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  monthDropdown: { maxHeight: 48, marginHorizontal: 16, marginTop: 4 },
  monthDropdownContent: { gap: 6, paddingVertical: 4 },
  monthChip: { backgroundColor: Colors.surfaceCard, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  monthChipActive: { backgroundColor: Colors.primaryAccent, borderColor: Colors.primaryAccent },
  monthChipText: { color: Colors.textSecondary, fontSize: 13 },
  monthChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  listScroll: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  entryCard: { backgroundColor: Colors.surfaceCard, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  entryCardEncrypted: { borderColor: Colors.vaultBorder },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  entryDate: { color: Colors.syntaxDate, fontSize: 13, fontFamily: 'SpaceMono', fontWeight: '600' },
  entryMeta: { flexDirection: 'row', alignItems: 'center' },
  entryContact: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600', marginLeft: 5 },
  entryLocation: { color: Colors.textMuted, fontSize: 12, marginLeft: 4 },
  entryPreview: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  encryptedPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  encryptedPreviewText: { color: Colors.vaultAccent, fontSize: 13, fontStyle: 'italic' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 6 },
  tag: { backgroundColor: Colors.primaryAccent, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  vaultTag: { backgroundColor: Colors.vaultSurface, borderWidth: 1, borderColor: Colors.vaultBorder },
  tagText: { color: '#FFFFFF', fontSize: 11, fontWeight: '500' },
  vaultTagText: { color: Colors.vaultAccent },
  tagMore: { color: Colors.textMuted, fontSize: 11, alignSelf: 'center', marginLeft: 4 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primaryAccent, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  // Calendar styles
  calendarScroll: { flex: 1 },
  calendarContent: { padding: 16 },
  calendarTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  calendarDayNames: { flexDirection: 'row', marginBottom: 8 },
  calendarDayName: { flex: 1, textAlign: 'center', color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 4 },
  calendarCellActive: { backgroundColor: Colors.surfaceCard, borderRadius: 10, borderWidth: 1, borderColor: Colors.primaryAccent },
  calendarCellFuture: { backgroundColor: 'rgba(74, 222, 128, 0.15)', borderRadius: 10, borderWidth: 1, borderColor: Colors.success },
  calendarDay: { color: Colors.textMuted, fontSize: 14 },
  calendarDayActive: { color: Colors.textPrimary, fontWeight: '700' },
  calendarDayFuture: { color: Colors.success, fontWeight: '700' },
  calendarDot: { backgroundColor: Colors.primaryAccent, borderRadius: 6, paddingHorizontal: 4, marginTop: 2 },
  calendarDotText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  // Continuous view styles
  continuousScroll: { flex: 1 },
  continuousContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  dayGroup: { marginBottom: 24 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  dayDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primaryAccent },
  dayTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  dayTimeline: { marginLeft: 4, borderLeftWidth: 2, borderLeftColor: Colors.border, paddingLeft: 16, gap: 10 },
  timelineEntry: { backgroundColor: Colors.surfaceCard, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border },
  timelineEntryEncrypted: { borderColor: Colors.vaultBorder },
  timelineLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  timelineContact: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  timelineLoc: { color: Colors.textMuted, fontSize: 12 },
  timelineBody: { gap: 2 },
  timelineText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  timelineEncrypted: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  timelineEncryptedText: { color: Colors.vaultAccent, fontSize: 13, fontStyle: 'italic' },
  timelinePosting: { color: Colors.syntaxPosting, fontSize: 13, fontFamily: 'SpaceMono', marginTop: 4 },
  // Pending review queue styles
  pendingSection: { marginHorizontal: 16, marginTop: 8 },
  pendingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(251, 191, 36, 0.10)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.30)' },
  pendingBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pendingBadge: { backgroundColor: Colors.warning, borderRadius: 10, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  pendingBadgeText: { color: '#000', fontSize: 12, fontWeight: '800' },
  pendingBannerText: { color: Colors.warning, fontSize: 14, fontWeight: '600' },
  pendingQueueScroll: { maxHeight: 350, marginTop: 8 },
  pendingQueue: { gap: 8 },
  pendingCard: { backgroundColor: Colors.surfaceCard, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.20)' },
  pendingCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  pendingCardDate: { color: Colors.syntaxDate, fontSize: 12, fontFamily: 'SpaceMono', fontWeight: '600' },
  pendingCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pendingCardSource: { color: Colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', backgroundColor: Colors.borderSubtle, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  pendingCardContact: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  pendingCardPreview: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  pendingActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pendingApproveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(74, 222, 128, 0.12)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.30)' },
  pendingApproveBtnText: { color: Colors.success, fontSize: 13, fontWeight: '600' },
  pendingRejectBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(248, 113, 113, 0.10)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(248, 113, 113, 0.25)' },
  pendingRejectBtnText: { color: Colors.danger, fontSize: 13, fontWeight: '600' },
  pendingViewBtn: { padding: 7, marginLeft: 'auto' },
  }), [Colors]);
}
