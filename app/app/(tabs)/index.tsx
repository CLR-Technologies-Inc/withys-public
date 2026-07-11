import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useResponsive, responsiveValue } from '@/lib/useResponsive';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColors, useTheme } from '@/lib/ThemeProvider';
import { useEntries, useContacts, useTags, useAddEntry } from '@/lib/hooks';
import { parseMarkdownEntry, formatMarkdownEntry, extractAllTags } from '@/lib/markdownParser';
import type { MarkdownEntry, InteractionType } from '@/lib/markdownParser';
import { isEncryptedEntry } from '@/lib/vault';
import { targetLevelToDays, targetLevelLabel, calculateRelationshipHealth, healthScoreColor, healthStatusEmoji } from '@/lib/sentiment';
import type { TargetLevel } from '@/lib/sentiment';
import { useJournalStore } from '@/lib/store';

// ── Quick-Log interaction types ──────────────────────────────────────────────

const QUICK_TYPES: { key: InteractionType; icon: string; label: string }[] = [
  { key: 'phone', icon: 'phone', label: 'Call' },
  { key: 'text', icon: 'comment', label: 'Text' },
  { key: 'in-person', icon: 'map-marker', label: 'In Person' },
  { key: 'video', icon: 'video-camera', label: 'Video' },
  { key: 'email', icon: 'envelope', label: 'Email' },
  { key: 'other', icon: 'ellipsis-h', label: 'Other' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { data: entries = [] } = useEntries();
  const { data: contacts = [] } = useContacts();
  const { data: tags = [] } = useTags();
  const addEntryMutation = useAddEntry();

  // Quick-log state
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [qlContact, setQlContact] = useState('');
  const [qlType, setQlType] = useState<InteractionType>('in-person');
  const [qlNote, setQlNote] = useState('');
  const [qlSearch, setQlSearch] = useState('');
  const [qlSaved, setQlSaved] = useState(false);

  const { recentEntries, streak, thisMonthCount, topContact, needsAttention } = useMemo(() => {
    const sorted = [...entries].sort(
      (a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
    );
    const recent = sorted.slice(0, 5);

    // Streak
    const uniqueDates = [...new Set(sorted.map((e) => e.entry_date))].sort().reverse();
    let strk = 0;
    const today = new Date();
    for (let i = 0; i < uniqueDates.length; i++) {
      const d = new Date(uniqueDates[i]);
      const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
      if (diff <= i + 1) strk++;
      else break;
    }

    // This month count
    const thisMonth = new Date().toISOString().substring(0, 7);
    const monthCount = entries.filter((e) => e.entry_date.startsWith(thisMonth)).length;

    // Most active contact
    const contactFreq: Record<string, number> = {};
    entries.forEach((e) => {
      contactFreq[e.contact_name] = (contactFreq[e.contact_name] || 0) + 1;
    });
    const top = Object.entries(contactFreq).sort(([, a], [, b]) => b - a)[0];

    // Identify contacts needing attention
    const entriesByContact = new Map<string, typeof entries>();
    entries.forEach((e) => {
      const name = e.contact_name.toLowerCase();
      if (!entriesByContact.has(name)) entriesByContact.set(name, []);
      entriesByContact.get(name)!.push(e);
    });

    const needsAttention = contacts
      .map((c) => {
        const contactEntries = entriesByContact.get(c.name.toLowerCase()) || [];
        const health = calculateRelationshipHealth(contactEntries, c.targetLevel);
        return { ...c, health };
      })
      .filter((c) => !c.is_self && (c.health.status === 'neglected' || c.health.status === 'fading'))
      .sort((a, b) => a.health.score - b.health.score)
      .slice(0, 3);

    return { recentEntries: recent, streak: strk, thisMonthCount: monthCount, topContact: top, needsAttention };
  }, [entries, contacts]);

  // ── Effort calculation ───────────────────────────────────────────────────
  const { estimatedMonthlyEffort, actualMonthlyEffort, effortPercent } = useMemo(() => {
    // Sum expected interactions per month based on each contact's target level
    let estimated = 0;
    contacts.forEach((c: any) => {
      if (c.is_self || c.is_archived) return;
      const level = (c.targetLevel || 'none') as TargetLevel;
      if (level === 'none') return;
      const days = targetLevelToDays(level);
      if (days === Infinity) return;
      estimated += 30 / days; // interactions per 30-day month
    });
    const est = Math.round(estimated);
    const thisMonth = new Date().toISOString().substring(0, 7);
    const actual = entries.filter((e) => e.entry_date.startsWith(thisMonth)).length;
    const pct = est > 0 ? Math.min(Math.round((actual / est) * 100), 100) : 0;
    return { estimatedMonthlyEffort: est, actualMonthlyEffort: actual, effortPercent: pct };
  }, [entries, contacts]);

  const simpleMode = useJournalStore((s) => s.simpleMode);

  // Quick-log filtered contacts
  const filteredContacts = useMemo(() => {
    if (!qlSearch) return [];
    const q = qlSearch.toLowerCase();
    return contacts
      .filter((c: any) => !c.is_self && !c.is_archived && c.name?.toLowerCase().includes(q))
      .slice(0, 5);
  }, [qlSearch, contacts]);

  const handleQuickLog = () => {
    if (!qlContact) return;
    const today = new Date().toISOString().split('T')[0];
    const entry: MarkdownEntry = {
      frontmatter: { date: today, contact: qlContact, type: qlType, location: '' },
      title: qlNote || `Quick ${QUICK_TYPES.find(t => t.key === qlType)?.label || 'interaction'} with ${qlContact}`,
      body: qlNote || '',
      raw: '',
    };
    const rawText = formatMarkdownEntry(entry);
    const allTags = extractAllTags(parseMarkdownEntry(rawText));
    addEntryMutation.mutate({
      entry: {
        id: String(Date.now()),
        entry_date: today,
        contact_name: qlContact,
        location: '',
        raw_text: rawText,
        tags: allTags,
        source: 'manual',
        status: 'approved',
      },
    });
    setQlSaved(true);
    setTimeout(() => {
      setQlContact('');
      setQlType('in-person');
      setQlNote('');
      setQlSearch('');
      setQlSaved(false);
      setQuickLogOpen(false);
    }, 1200);
  };

  const responsive = useResponsive();
  const contentMaxWidth = responsive.maxContentWidth;
  const pad = responsive.contentPadding;

  const colors = useColors();
  const { resolvedTheme } = useTheme();
  const styles = useThemedStyles();

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', paddingHorizontal: pad }]}>
      {/* Welcome */}
      <Text style={[styles.welcome, responsive.isDesktop && { fontSize: 30 }]}>Welcome back</Text>
      <Text style={styles.subtitle}>Here&apos;s your journal at a glance</Text>

      {/* Stats Grid */}
      <View style={[styles.statsGrid, { gap: responsive.isMobile ? 10 : 14 }]}>
        <StatCard icon="book" value={entries.length} label="Total Entries" description="Total number of journal entries you've recorded" isDesktop={responsive.isDesktop} />
        <StatCard icon="users" value={contacts.length} label="People" description="Number of contacts in your personal network" isDesktop={responsive.isDesktop} />
        <StatCard icon="fire" value={streak} label="Day Streak" description="Consecutive days with at least one journal entry" isDesktop={responsive.isDesktop} />
        <StatCard icon="calendar" value={thisMonthCount} label="This Month" description="Entries recorded during this calendar month" isDesktop={responsive.isDesktop} />
      </View>

      {/* Effort Meter */}
      {!simpleMode && estimatedMonthlyEffort > 0 && (
        <View style={styles.effortCard}>
          <View style={styles.effortHeader}>
            <FontAwesome name="tachometer" size={14} color={colors.secondaryAccent} />
            <Text style={styles.effortTitle}>Monthly Effort</Text>
          </View>
          <View style={styles.effortBarBg}>
            <View style={[
              styles.effortBarFill,
              {
                width: `${effortPercent}%`,
                backgroundColor: effortPercent >= 80 ? colors.success : effortPercent >= 40 ? colors.warning : colors.danger,
              }
            ]} />
          </View>
          <View style={styles.effortStats}>
            <View style={styles.effortStatItem}>
              <Text style={styles.effortStatValue}>{actualMonthlyEffort}</Text>
              <Text style={styles.effortStatLabel}>Recorded</Text>
            </View>
            <View style={styles.effortStatItem}>
              <Text style={[styles.effortStatValue, { color: colors.secondaryAccent }]}>{estimatedMonthlyEffort}</Text>
              <Text style={styles.effortStatLabel}>Target</Text>
            </View>
            <View style={styles.effortStatItem}>
              <Text style={[
                styles.effortStatValue,
                { color: effortPercent >= 80 ? colors.success : effortPercent >= 40 ? colors.warning : colors.danger }
              ]}>{effortPercent}%</Text>
              <Text style={styles.effortStatLabel}>On Track</Text>
            </View>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/modal' as any)} activeOpacity={0.7}>
          <FontAwesome name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.actionText}>New Entry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, quickLogOpen ? styles.actionActive : styles.actionSecondary]}
          onPress={() => setQuickLogOpen(!quickLogOpen)}
          activeOpacity={0.7}
        >
          <FontAwesome name="bolt" size={16} color={quickLogOpen ? colors.textPrimary : colors.secondaryAccent} />
          <Text style={[styles.actionText, !quickLogOpen && styles.actionTextSecondary]}>Quick Log</Text>
        </TouchableOpacity>
      </View>

      {/* ── Quick-Log Widget ──────────────────────────────────────────────── */}
      {quickLogOpen && (
        <View style={styles.quickLogCard}>
          <Text style={styles.quickLogTitle}>I just talked to...</Text>

          {/* Contact search */}
          {!qlContact ? (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <TextInput
                  style={[styles.quickLogInput, { flex: 1, marginBottom: 0 }]}
                  placeholder="Search contacts..."
                  placeholderTextColor={colors.textMuted}
                  value={qlSearch}
                  onChangeText={setQlSearch}
                  autoFocus
                />
                {qlSearch.trim().length > 0 && !filteredContacts.some((c: any) => c.name.toLowerCase() === qlSearch.trim().toLowerCase()) && (
                  <TouchableOpacity
                    style={styles.quickLogAddBtn}
                    onPress={() => { setQlContact(qlSearch.trim()); setQlSearch(''); }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${qlSearch.trim()} as a contact`}
                  >
                    <FontAwesome name="plus" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>
              {filteredContacts.map((c: any) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.quickLogSuggestion}
                  onPress={() => { setQlContact(c.name); setQlSearch(''); }}
                >
                  <FontAwesome name="user" size={12} color={colors.secondaryAccent} />
                  <Text style={styles.quickLogSuggestionText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View>
              {/* Selected contact */}
              <View style={styles.quickLogSelected}>
                <Text style={styles.quickLogSelectedName}>{qlContact}</Text>
                <TouchableOpacity
                  onPress={() => setQlContact('')}
                  accessibilityRole="button"
                  accessibilityLabel="Clear selected contact"
                >
                  <FontAwesome name="times" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Interaction type pills */}
              <View style={styles.quickLogTypes}>
                {QUICK_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.quickLogTypePill, qlType === t.key && styles.quickLogTypePillActive]}
                    onPress={() => setQlType(t.key)}
                  >
                    <FontAwesome name={t.icon as any} size={11} color={qlType === t.key ? '#FFFFFF' : colors.textMuted} />
                    <Text style={[styles.quickLogTypeLabel, qlType === t.key && styles.quickLogTypeLabelActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Optional note */}
              <TextInput
                style={styles.quickLogInput}
                placeholder="Quick note (optional)..."
                placeholderTextColor={colors.textMuted}
                value={qlNote}
                onChangeText={setQlNote}
              />

              {/* Save */}
              <TouchableOpacity
                style={[styles.quickLogSaveBtn, qlSaved && styles.quickLogSavedBtn]}
                onPress={handleQuickLog}
                disabled={qlSaved}
                activeOpacity={0.7}
              >
                <FontAwesome name={qlSaved ? 'check' : 'bolt'} size={14} color="#FFFFFF" />
                <Text style={styles.quickLogSaveText}>{qlSaved ? 'Logged!' : 'Log It'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}



      {/* Top Contact */}
      {topContact && (
        <View style={styles.highlightCard}>
          <View style={styles.highlightIcon}>
            <FontAwesome name="star" size={16} color={colors.warning} />
          </View>
          <View style={styles.highlightContent}>
            <Text style={styles.highlightLabel}>Most Connected</Text>
            <Text style={styles.highlightValue}>{topContact[0]} — {topContact[1]} entries</Text>
          </View>
        </View>
      )}

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Needs Attention</Text>
          <View style={styles.needsAttentionList}>
            {needsAttention.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.attentionCard, { borderLeftColor: healthScoreColor(c.health.score, resolvedTheme) }]}
                onPress={() => router.push(`/person/${c.id}` as any)}
                activeOpacity={0.7}
              >
                <View style={styles.attentionInfo}>
                  <Text style={styles.attentionName}>
                    {healthStatusEmoji(c.health.status)} {c.name}
                  </Text>
                  <Text style={styles.attentionSub}>
                    {c.health.daysSinceLastContact === Infinity ? 'No entries yet' : `${c.health.daysSinceLastContact} days since last contact`}
                  </Text>
                </View>
                <View style={[styles.attentionScore, { backgroundColor: healthScoreColor(c.health.score, resolvedTheme) + '20' }]}>
                  <Text style={[styles.attentionScoreText, { color: healthScoreColor(c.health.score, resolvedTheme) }]}>
                    {c.health.score}
                  </Text>
                </View>
                <View style={styles.attentionAction}>
                  <FontAwesome name="chevron-right" size={10} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Recent Entries */}
      <Text style={styles.sectionTitle}>Recent Entries</Text>
      {recentEntries.map((entry) => {
        const encrypted = isEncryptedEntry(entry.raw_text);
        let preview = '';
        if (!encrypted) {
          const md = parseMarkdownEntry(entry.raw_text);
          preview = md.title
            ? `${md.title} — ${md.body.substring(0, 80)}`
            : md.body.substring(0, 120);
        }
        return (
          <TouchableOpacity
            key={entry.id}
            style={[styles.entryRow, encrypted && styles.entryRowEncrypted]}
            onPress={() => router.push(`/entry/${entry.id}` as any)}
            activeOpacity={0.7}
          >
            <View style={styles.entryDateCol}>
              {encrypted && <FontAwesome name="lock" size={10} color={colors.vaultAccent} style={{ marginBottom: 2 }} />}
              <Text style={styles.entryDay}>{new Date(entry.entry_date).getDate()}</Text>
              <Text style={styles.entryMonth}>
                {new Date(entry.entry_date).toLocaleString('default', { month: 'short' })}
              </Text>
            </View>
            <View style={styles.entryInfo}>
              <View style={styles.entryTopRow}>
                <Text style={styles.entryContact}>{entry.contact_name}</Text>
                {entry.location && <Text style={styles.entryLoc}>@ {entry.location}</Text>}
              </View>
              {encrypted ? (
                <View style={styles.encryptedPreview}>
                  <FontAwesome name="lock" size={11} color={colors.vaultAccent} />
                  <Text style={styles.encryptedPreviewText}>Encrypted vault entry</Text>
                </View>
              ) : (
                <Text style={styles.entryPreview} numberOfLines={1}>{preview}</Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Footer link */}
      <TouchableOpacity
        style={styles.viewAllBtn}
        onPress={() => router.push('/(tabs)/journal' as any)}
        activeOpacity={0.7}
      >
        <Text style={styles.viewAllText}>View all entries</Text>
        <FontAwesome name="arrow-right" size={12} color={colors.secondaryAccent} />
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatCard({ icon, value, label, description, isDesktop }: { icon: string; value: number; label: string; description?: string; isDesktop?: boolean }) {
  const c = useColors();
  const s = useThemedStyles();
  return (
    <View
      style={[s.statCard, isDesktop && { minWidth: '22%' }]}
      // @ts-ignore — title is valid on web, enables hover tooltip
      title={description}
      accessibilityHint={description}
    >
      <FontAwesome name={icon as any} size={isDesktop ? 22 : 18} color={c.primaryAccent} />
      <Text style={[s.statValue, isDesktop && { fontSize: 30 }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function useThemedStyles() {
  const colors = useColors();
  return useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingVertical: 16, paddingBottom: 40 },
    welcome: { color: colors.textPrimary, fontSize: 26, fontWeight: '800', marginTop: 8 },
    subtitle: { color: colors.textMuted, fontSize: 14, marginTop: 4, marginBottom: 20 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    statCard: { flex: 1, minWidth: '45%', backgroundColor: colors.surfaceCard, borderRadius: 14, padding: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border },
    statValue: { color: colors.textPrimary, fontSize: 26, fontWeight: '800' },
    statLabel: { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },

    // Effort meter
    effortCard: { backgroundColor: colors.surfaceCard, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
    effortHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    effortTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
    effortBarBg: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceContainerHigh, overflow: 'hidden', marginBottom: 12 },
    effortBarFill: { height: '100%', borderRadius: 4, minWidth: 4 },
    effortStats: { flexDirection: 'row', justifyContent: 'space-around' },
    effortStatItem: { alignItems: 'center', gap: 2 },
    effortStatValue: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
    effortStatLabel: { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

    actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primaryAccent, borderRadius: 12, paddingVertical: 14 },
    actionSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
    actionActive: { backgroundColor: colors.warning },
    actionText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
    actionTextSecondary: { color: colors.primaryAccent },

    // Quick-Log Widget
    quickLogCard: { backgroundColor: colors.surfaceCard, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.vaultBorder },
    quickLogTitle: { color: colors.warning, fontSize: 15, fontWeight: '700', marginBottom: 12 },
    quickLogInput: { backgroundColor: colors.surfaceContainerHigh, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.borderSubtle, marginBottom: 8 },
    quickLogAddBtn: { width: 40, height: 40, backgroundColor: colors.success, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    quickLogSuggestion: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 4 },
    quickLogSuggestionText: { color: colors.textPrimary, fontSize: 14 },
    quickLogSelected: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceContainerHigh, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
    quickLogSelectedName: { color: colors.primaryAccent, fontSize: 15, fontWeight: '700' },
    quickLogTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    quickLogTypePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSubtle },
    quickLogTypePillActive: { backgroundColor: colors.primaryAccent, borderColor: colors.primaryAccent },
    quickLogTypeLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
    quickLogTypeLabelActive: { color: '#FFFFFF' },
    quickLogSaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primaryAccent, borderRadius: 10, paddingVertical: 12 },
    quickLogSavedBtn: { backgroundColor: colors.success },
    quickLogSaveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

    // Needs Attention
    needsAttentionList: { marginBottom: 20 },
    attentionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceCard, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, gap: 12 },
    attentionInfo: { flex: 1 },
    attentionName: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
    attentionSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
    attentionScore: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    attentionScoreText: { fontSize: 12, fontWeight: '800', fontFamily: 'SpaceMono' },
    attentionAction: { padding: 8, backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border },

    // Existing styles
    highlightCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceCard, borderRadius: 14, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.border, gap: 14 },
    highlightIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
    highlightContent: { flex: 1 },
    highlightLabel: { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
    highlightValue: { color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginTop: 2 },
    sectionTitle: { color: colors.primaryAccent, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
    entryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceCard, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border, gap: 12 },
    entryRowEncrypted: { borderColor: colors.vaultBorder },
    entryDateCol: { width: 40, alignItems: 'center' },
    entryDay: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
    entryMonth: { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase' },
    entryInfo: { flex: 1 },
    entryTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    entryContact: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
    entryLoc: { color: colors.textMuted, fontSize: 12 },
    entryPreview: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
    encryptedPreview: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    encryptedPreviewText: { color: colors.vaultAccent, fontSize: 13, fontStyle: 'italic' },
    viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, paddingVertical: 12 },
    viewAllText: { color: colors.primaryAccent, fontSize: 14, fontWeight: '600' },
  }), [colors]);
}
