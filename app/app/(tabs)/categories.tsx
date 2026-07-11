import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useResponsive } from '@/lib/useResponsive';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColors } from '@/lib/ThemeProvider';
import { useTags, useEntries } from '@/lib/hooks';
import { useRouter } from 'expo-router';
import { useJournalStore } from '@/lib/store';

export default function CategoriesScreen() {
  const router = useRouter();
  const { data: tags = [] } = useTags();
  const { data: entries = [] } = useEntries();
  const [searchQuery, setSearchQuery] = useState('');
  const setStoreSearchQuery = useJournalStore((s) => s.setSearchQuery);

  const grouped = useMemo(() => {
    let filtered = tags;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = tags.filter((t) => t.name.toLowerCase().includes(q));
    }

    const groups = filtered.reduce<Record<string, typeof tags>>((acc, tag) => {
      const colonIdx = tag.name.indexOf(':');
      const group = colonIdx > 0 ? tag.name.substring(0, colonIdx) : 'other';
      if (!acc[group]) acc[group] = [];
      acc[group].push(tag);
      return acc;
    }, {});
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [tags, searchQuery]);

  const handleTagPress = (tagName: string) => {
    // Set search in the global store so journal tab picks it up
    setStoreSearchQuery(tagName);
    router.navigate('/(tabs)/journal' as any);
  };

  const responsive = useResponsive();

  const Colors = useColors();
  const styles = React.useMemo(() => useStyles(Colors), [Colors]);

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={{ maxWidth: responsive.maxContentWidth, alignSelf: 'center' as const, width: '100%', paddingHorizontal: responsive.contentPadding, flex: 1 }}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={14} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search categories…"
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <FontAwesome name="times-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={grouped}
        keyExtractor={([group]) => group}
        contentContainerStyle={styles.list}
        renderItem={({ item: [group, groupTags] }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{group}</Text>
            <View style={styles.tagGrid}>
              {groupTags.map((tag) => {
                const label = tag.name.includes(':') ? tag.name.split(':')[1] : tag.name;
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={styles.chip}
                    activeOpacity={0.7}
                    onPress={() => handleTagPress(tag.name)}
                  >
                    <Text style={styles.chipLabel}>{label}</Text>
                    <View style={styles.chipCount}>
                      <Text style={styles.chipCountText}>{tag.entry_count}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <FontAwesome name="tags" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No categories found</Text>
          </View>
        }
      />
      </View>
    </View>
  );
}

const useStyles = (Colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceCard, marginTop: 12, marginBottom: 8, borderRadius: 12, paddingHorizontal: 14, height: 44, borderWidth: 1, borderColor: Colors.border },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 15 },
  list: { padding: 16, paddingBottom: 24 },
  section: { marginBottom: 20 },
  sectionTitle: { color: Colors.secondaryAccent, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryAccent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  chipLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '500', textTransform: 'capitalize' },
  chipCount: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  chipCountText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 100, gap: 12 },
  emptyText: { color: Colors.textPrimary, fontSize: 18, fontWeight: '600' },
});
