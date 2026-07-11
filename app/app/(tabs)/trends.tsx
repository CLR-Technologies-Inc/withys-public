import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useResponsive } from '@/lib/useResponsive';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useColors, useTheme } from '@/lib/ThemeProvider';
import { useEntries, useContacts, useTags } from '@/lib/hooks';
import { LoadingSkeletonList } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import {
  analyzeSentiment,
  calculateRelationshipHealth,
  healthScoreColor,
  healthStatusEmoji,
  sentimentColor,
  sentimentEmoji,
  trendArrow,
  targetLevelLabel,
} from '@/lib/sentiment';

type TimeRange = '7d' | '30d' | '90d' | 'all';
type TrendsTab = 'overview' | 'health' | 'sentiment';

export default function TrendsScreen() {
  const Colors = useColors();
  const { resolvedTheme } = useTheme();
  const styles = useStyles(Colors);
  const router = useRouter();
  const { data: entries = [], isLoading: entriesLoading } = useEntries();
  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const { data: tags = [], isLoading: tagsLoading } = useTags();

  const isLoading = entriesLoading || contactsLoading || tagsLoading;

  if (!isLoading && entries.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="bar-chart"
          title="No data to analyze"
          body="Create some journal entries to see your relationship trends and sentiment analysis."
          action={{
            label: "Create Entry",
            onPress: () => router.push('/modal' as any),
            icon: "plus"
          }}
        />
      </View>
    );
  }

  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [activeTab, setActiveTab] = useState<TrendsTab>('overview');
  const [visiblePeople, setVisiblePeople] = useState(5);
  const [sentimentFilter, setSentimentFilter] = useState<'positive' | 'neutral' | 'negative' | null>(null);

  const filteredEntries = useMemo(() => {
    if (timeRange === 'all') return entries;
    const now = Date.now();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const cutoff = now - days * 86400000;
    return entries.filter((e) => new Date(e.entry_date).getTime() >= cutoff);
  }, [entries, timeRange]);

  // ⚡ Memoized overview stats — avoid recomputing on tab/filter state changes
  const { totalEntries, totalPeople, totalTags } = useMemo(() => ({
    totalEntries: filteredEntries.length,
    totalPeople: new Set(filteredEntries.map((e) => e.contact_name)).size,
    totalTags: new Set(filteredEntries.flatMap((e) => e.tags)).size,
  }), [filteredEntries]);

  // ⚡ People frequency — only recompute when filteredEntries changes
  const { peopleSorted, maxPeople } = useMemo(() => {
    const freq: Record<string, number> = {};
    filteredEntries.forEach((e) => { freq[e.contact_name] = (freq[e.contact_name] || 0) + 1; });
    const sorted = Object.entries(freq).sort(([, a], [, b]) => b - a);
    return { peopleSorted: sorted, maxPeople: sorted[0]?.[1] || 1 };
  }, [filteredEntries]);

  // ⚡ Tag frequency — only recompute when filteredEntries changes
  const { tagsSorted, maxTags } = useMemo(() => {
    const freq: Record<string, number> = {};
    filteredEntries.forEach((e) => {
      e.tags.forEach((t) => {
        const label = t.includes(':') ? t.split(':')[1] : t;
        freq[label] = (freq[label] || 0) + 1;
      });
    });
    const sorted = Object.entries(freq).sort(([, a], [, b]) => b - a).slice(0, 8);
    return { tagsSorted: sorted, maxTags: sorted[0]?.[1] || 1 };
  }, [filteredEntries]);

  // ⚡ Monthly activity — only recompute when full entries array changes
  const { months, maxMonthly } = useMemo(() => {
    const activity: Record<string, number> = {};
    entries.forEach((e) => {
      const m = e.entry_date.substring(0, 7);
      activity[m] = (activity[m] || 0) + 1;
    });
    const sorted = Object.entries(activity).sort(([a], [b]) => a.localeCompare(b));
    return { months: sorted, maxMonthly: Math.max(...sorted.map(([, v]) => v), 1) };
  }, [entries]);

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

  // ── Relationship Health Rankings ──
  const healthRankings = useMemo(() => {
    return contacts.map((contact) => {
      const contactEntries = entriesByContact.get(contact.name.toLowerCase()) || [];
      const health = calculateRelationshipHealth(contactEntries, contact.targetLevel);
      return { contact, health };
    }).sort((a, b) => b.health.score - a.health.score);
  }, [contacts, entriesByContact]);

  // ── Sentiment Overview ──
  const sentimentOverview = useMemo(() => {
    const results = filteredEntries.map((e) => ({
      ...analyzeSentiment(e.raw_text),
      id: e.id,
      date: e.entry_date,
      contact: e.contact_name,
    }));
    const positive = results.filter((r) => r.label === 'positive').length;
    const neutral = results.filter((r) => r.label === 'neutral').length;
    const negative = results.filter((r) => r.label === 'negative').length;
    const avgScore = results.length > 0
      ? results.reduce((s, r) => s + r.score, 0) / results.length
      : 0;

    // Group filtered results by contact for "Sentiment by Person"
    const resultsByContact = new Map<string, typeof results>();
    results.forEach((r) => {
      const name = r.contact.toLowerCase();
      if (!resultsByContact.has(name)) resultsByContact.set(name, []);
      resultsByContact.get(name)!.push(r);
    });

    return { results, positive, neutral, negative, avgScore, total: results.length, resultsByContact };
  }, [filteredEntries]);

  // ⚡ Overall health stats — single pass instead of 3 separate array traversals
  const { overallHealthAvg, neglectedCount, thrivingCount } = useMemo(() => {
    if (healthRankings.length === 0) return { overallHealthAvg: 0, neglectedCount: 0, thrivingCount: 0 };
    let totalScore = 0;
    let neglected = 0;
    let thriving = 0;
    for (const r of healthRankings) {
      totalScore += r.health.score;
      if (r.health.status === 'neglected' || r.health.status === 'fading') neglected++;
      if (r.health.status === 'thriving') thriving++;
    }
    return {
      overallHealthAvg: Math.round(totalScore / healthRankings.length),
      neglectedCount: neglected,
      thrivingCount: thriving,
    };
  }, [healthRankings]);

  const responsive = useResponsive();

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <LoadingSkeletonList />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <EmptyState
          icon="line-chart"
          title="No data to analyze"
          body="Recorded journal entries will appear here as trends and relationship health metrics."
          action={{
            label: 'Create First Entry',
            onPress: () => router.push('/modal' as any),
            icon: 'plus',
          }}
        />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: Colors.background }]} contentContainerStyle={[styles.content, { maxWidth: responsive.maxContentWidth, alignSelf: 'center', width: '100%', paddingHorizontal: responsive.contentPadding }]}>
      {/* Time Range Selector */}
      <View style={styles.rangeRow}>
        {([['7d', '7 Days'], ['30d', '30 Days'], ['90d', '90 Days'], ['all', 'All Time']] as [TimeRange, string][]).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.rangeBtn, timeRange === key && styles.rangeBtnActive]}
            onPress={() => setTimeRange(key)}
          >
            <Text style={[styles.rangeText, timeRange === key && styles.rangeTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Selector */}
      <View style={styles.tabRow}>
        {([['overview', 'Overview'], ['health', 'Health'], ['sentiment', 'Sentiment']] as [TrendsTab, string][]).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.tabBtn, activeTab === key && styles.tabBtnActive]}
            onPress={() => setActiveTab(key)}
          >
            <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ═══ OVERVIEW TAB ═══ */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <FontAwesome name="book" size={20} color={Colors.secondaryAccent} />
              <Text style={styles.statNumber}>{totalEntries}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
            <View style={styles.statCard}>
              <FontAwesome name="users" size={20} color={Colors.secondaryAccent} />
              <Text style={styles.statNumber}>{totalPeople}</Text>
              <Text style={styles.statLabel}>People</Text>
            </View>
            <View style={styles.statCard}>
              <FontAwesome name="tags" size={20} color={Colors.secondaryAccent} />
              <Text style={styles.statNumber}>{totalTags}</Text>
              <Text style={styles.statLabel}>Categories</Text>
            </View>
          </View>

          {/* Monthly Activity */}
          <Text style={styles.sectionTitle}>Monthly Activity</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthlyChart}>
            {months.map(([month, count]) => {
              const label = month.split('-')[1];
              const year = month.split('-')[0].slice(2);
              return (
                <View key={month} style={styles.monthBar}>
                  <View style={styles.monthBarTrack}>
                    <View style={[styles.monthBarFill, { height: `${(count / maxMonthly) * 100}%` }]} />
                  </View>
                  <Text style={styles.monthBarCount}>{count}</Text>
                  <Text style={styles.monthBarLabel}>{label}/{year}</Text>
                </View>
              );
            })}
          </ScrollView>

          {/* Top People */}
          <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Most Mentioned People</Text>
          {peopleSorted.slice(0, visiblePeople).map(([name, count]) => (
            <View key={name} style={styles.barRow}>
              <Text style={styles.barLabel}>{name}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(count / maxPeople) * 100}%` }]} />
              </View>
              <Text style={styles.barValue}>{count}</Text>
            </View>
          ))}
          {visiblePeople < peopleSorted.length && (
            <TouchableOpacity onPress={() => setVisiblePeople(v => v + 5)} style={styles.loadMoreBtn}>
              <Text style={styles.loadMoreText}>Load More</Text>
            </TouchableOpacity>
          )}

          {/* Top Tags */}
          <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Top Categories</Text>
          {tagsSorted.map(([label, count]) => (
            <View key={label} style={styles.barRow}>
              <Text style={styles.barLabel}>{label}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, styles.barFillAlt, { width: `${(count / maxTags) * 100}%` }]} />
              </View>
              <Text style={styles.barValue}>{count}</Text>
            </View>
          ))}
        </>
      )}

      {/* ═══ HEALTH TAB ═══ */}
      {activeTab === 'health' && (
        <>
          {/* Health Overview Cards */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderColor: healthScoreColor(overallHealthAvg, resolvedTheme) + '40' }]}>
              <Text style={[styles.statNumber, { color: healthScoreColor(overallHealthAvg, resolvedTheme) }]}>{overallHealthAvg}</Text>
              <Text style={styles.statLabel}>Avg Health</Text>
            </View>
            <View style={[styles.statCard, { borderColor: Colors.success + '40' }]}>
              <Text style={[styles.statNumber, { color: Colors.success }]}>{thrivingCount}</Text>
              <Text style={styles.statLabel}>Thriving</Text>
            </View>
            <View style={[styles.statCard, { borderColor: Colors.warning + '40' }]}>
              <Text style={[styles.statNumber, { color: neglectedCount > 0 ? Colors.warning : Colors.textMuted }]}>{neglectedCount}</Text>
              <Text style={styles.statLabel}>Needs Attn</Text>
            </View>
          </View>

          {/* Health Rankings */}
          <Text style={styles.sectionTitle}>Relationship Health Rankings</Text>
          {healthRankings.map(({ contact, health }) => (
            <TouchableOpacity
              key={contact.id}
              style={[styles.healthRow, { borderLeftColor: healthScoreColor(health.score, resolvedTheme) }]}
              onPress={() => router.push(`/person/${contact.id}` as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.healthScoreBadge, { backgroundColor: healthScoreColor(health.score, resolvedTheme) + '20' }]}>
                <Text style={[styles.healthScoreText, { color: healthScoreColor(health.score, resolvedTheme) }]}>{health.score}</Text>
              </View>
              <View style={styles.healthRowInfo}>
                <Text style={styles.healthRowName}>
                  {healthStatusEmoji(health.status)} {contact.name}
                </Text>
                <Text style={styles.healthRowSub}>
                  {health.daysSinceLastContact === Infinity ? 'No entries' : `${health.daysSinceLastContact}d ago`}
                  {' · '}
                  {trendArrow(health.trend)} {health.trend}
                  {contact.targetLevel !== 'none' && ` · Target: ${targetLevelLabel(contact.targetLevel)}`}
                </Text>
              </View>
              {contact.targetLevel !== 'none' && (
                <View style={styles.healthRowTarget}>
                  <View style={styles.miniProgressTrack}>
                    <View style={[
                      styles.miniProgressFill,
                      {
                        width: `${Math.min(100, health.targetCompletion)}%`,
                        backgroundColor: health.onTarget ? Colors.success : Colors.warning,
                      }
                    ]} />
                  </View>
                  <Text style={[styles.miniProgressText, { color: health.onTarget ? Colors.success : Colors.warning }]}>
                    {health.targetCompletion}%
                  </Text>
                </View>
              )}
              <FontAwesome name="chevron-right" size={10} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* ═══ SENTIMENT TAB ═══ */}
      {activeTab === 'sentiment' && (
        <>
          {/* Sentiment Distribution */}
          <View style={styles.statsRow}>
            <TouchableOpacity 
              style={[
                styles.statCard, 
                { borderColor: Colors.success + '40' },
                sentimentFilter === 'positive' && { backgroundColor: Colors.success + '20', borderColor: Colors.success }
              ]}
              onPress={() => setSentimentFilter(f => f === 'positive' ? null : 'positive')}
              activeOpacity={0.7}
            >
              <Text style={styles.sentimentStatEmoji}>😊</Text>
              <Text style={[styles.statNumber, { color: Colors.success }]}>{sentimentOverview.positive}</Text>
              <Text style={styles.statLabel}>Positive</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.statCard,
                sentimentFilter === 'neutral' && { backgroundColor: Colors.borderSubtle, borderColor: Colors.textMuted }
              ]}
              onPress={() => setSentimentFilter(f => f === 'neutral' ? null : 'neutral')}
              activeOpacity={0.7}
            >
              <Text style={styles.sentimentStatEmoji}>😐</Text>
              <Text style={styles.statNumber}>{sentimentOverview.neutral}</Text>
              <Text style={styles.statLabel}>Neutral</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.statCard, 
                { borderColor: Colors.danger + '40' },
                sentimentFilter === 'negative' && { backgroundColor: Colors.danger + '20', borderColor: Colors.danger }
              ]}
              onPress={() => setSentimentFilter(f => f === 'negative' ? null : 'negative')}
              activeOpacity={0.7}
            >
              <Text style={styles.sentimentStatEmoji}>😔</Text>
              <Text style={[styles.statNumber, { color: Colors.danger }]}>{sentimentOverview.negative}</Text>
              <Text style={styles.statLabel}>Negative</Text>
            </TouchableOpacity>
          </View>

          {/* Average Sentiment */}
          <View style={styles.avgSentimentCard}>
            <Text style={styles.avgSentimentLabel}>Overall Mood</Text>
            <View style={styles.avgSentimentRow}>
              <Text style={[styles.avgSentimentScore, { color: sentimentColor(sentimentOverview.avgScore, resolvedTheme) }]}>
                {sentimentEmoji(sentimentOverview.avgScore > 0.1 ? 'positive' : sentimentOverview.avgScore < -0.1 ? 'negative' : 'neutral')}
                {' '}{sentimentOverview.avgScore > 0 ? '+' : ''}{(sentimentOverview.avgScore * 100).toFixed(0)}%
              </Text>
              <View style={styles.avgSentimentBar}>
                <View style={[
                  styles.avgSentimentFill,
                  {
                    width: `${(sentimentOverview.avgScore + 1) * 50}%`,
                    backgroundColor: sentimentColor(sentimentOverview.avgScore, resolvedTheme),
                  }
                ]} />
              </View>
            </View>
          </View>

          {/* Per-Contact Sentiment */}
          <Text style={styles.sectionTitle}>Sentiment by Person</Text>
          {contacts.map((contact) => {
            const contactResults = sentimentOverview.resultsByContact.get(contact.name.toLowerCase()) || [];
            if (contactResults.length === 0) return null;
            const avg = contactResults.reduce((s, r) => s + r.score, 0) / contactResults.length;
            const label = avg > 0.1 ? 'positive' : avg < -0.1 ? 'negative' : 'neutral';
            if (sentimentFilter && label !== sentimentFilter) return null;
            return (
              <TouchableOpacity
                key={contact.id}
                style={styles.sentimentPersonRow}
                onPress={() => router.push(`/person/${contact.id}` as any)}
                activeOpacity={0.7}
              >
                <View style={styles.sentimentPersonInfo}>
                  <Text style={styles.sentimentPersonName}>{contact.name}</Text>
                  <Text style={styles.sentimentPersonCount}>{contactResults.length} entries</Text>
                </View>
                <View style={styles.sentimentMiniBar}>
                  <View style={[
                    styles.sentimentMiniFill,
                    {
                      width: `${(avg + 1) * 50}%`,
                      backgroundColor: sentimentColor(avg, resolvedTheme),
                    }
                  ]} />
                </View>
                <Text style={[styles.sentimentPersonScore, { color: sentimentColor(avg, resolvedTheme) }]}>
                  {sentimentEmoji(avg > 0.1 ? 'positive' : avg < -0.1 ? 'negative' : 'neutral')}
                  {' '}{avg > 0 ? '+' : ''}{(avg * 100).toFixed(0)}%
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Recent Entries Sentiment */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Recent Entry Moods</Text>
          {sentimentOverview.results
            .filter((r) => !sentimentFilter || r.label === sentimentFilter)
            .slice(0, 10).map((r, i) => (
            <TouchableOpacity key={i} style={styles.recentSentimentRow} onPress={() => router.push(`/entry/${r.id}` as any)}>
              <Text style={styles.recentDate}>{r.date}</Text>
              <Text style={styles.recentContact}>{r.contact}</Text>
              <View style={[styles.recentBadge, { backgroundColor: sentimentColor(r.score, resolvedTheme) + '20' }]}>
                <Text style={[styles.recentBadgeText, { color: sentimentColor(r.score, resolvedTheme) }]}>
                  {sentimentEmoji(r.label)} {r.label}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function useStyles(Colors: any) {
  return useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingVertical: 16, paddingBottom: 40 },

  // Range selector
  rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 12, backgroundColor: Colors.surfaceCard, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: Colors.border },
  rangeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  rangeBtnActive: { backgroundColor: Colors.primaryAccent },
  rangeText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  rangeTextActive: { color: '#FFFFFF' },

  // Tab selector
  tabRow: { flexDirection: 'row', gap: 0, marginBottom: 20, backgroundColor: Colors.surfaceCard, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: Colors.border },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: Colors.primaryAccent },
  tabText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  statCard: { flex: 1, backgroundColor: Colors.surfaceCard, borderRadius: 14, padding: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.border },
  statNumber: { color: Colors.textPrimary, fontSize: 28, fontWeight: '800' },
  statLabel: { color: Colors.textMuted, fontSize: 12 },
  sentimentStatEmoji: { fontSize: 20 },

  sectionTitle: { color: Colors.secondaryAccent, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, marginLeft: 4 },

  // Monthly chart
  monthlyChart: { flexDirection: 'row', height: 120, gap: 4, marginBottom: 8, alignItems: 'flex-end', paddingRight: 20 },
  monthBar: { width: 40, alignItems: 'center', gap: 2 },
  monthBarTrack: { flex: 1, width: '80%', backgroundColor: Colors.surfaceCard, borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  monthBarFill: { width: '100%', backgroundColor: Colors.primaryAccent, borderRadius: 4 },
  monthBarCount: { color: Colors.textPrimary, fontSize: 11, fontWeight: '700' },
  monthBarLabel: { color: Colors.textMuted, fontSize: 9 },

  // Bar charts
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  barLabel: { color: Colors.textPrimary, fontSize: 14, width: 80, fontWeight: '500' },
  barTrack: { flex: 1, height: 8, backgroundColor: Colors.surfaceCard, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: Colors.primaryAccent, borderRadius: 4 },
  barFillAlt: { backgroundColor: Colors.secondaryAccent },
  barValue: { color: Colors.textMuted, fontSize: 13, fontWeight: '600', width: 24, textAlign: 'right' },

  // Health rankings
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surfaceCard, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3 },
  healthScoreBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  healthScoreText: { fontSize: 16, fontWeight: '800', fontFamily: 'SpaceMono' },
  healthRowInfo: { flex: 1 },
  healthRowName: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
  healthRowSub: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  healthRowTarget: { alignItems: 'flex-end', width: 50 },
  miniProgressTrack: { width: 40, height: 4, backgroundColor: Colors.borderSubtle, borderRadius: 2, overflow: 'hidden' },
  miniProgressFill: { height: '100%', borderRadius: 2 },
  miniProgressText: { fontSize: 10, fontWeight: '700', fontFamily: 'SpaceMono', marginTop: 2 },

  // Average sentiment
  avgSentimentCard: { backgroundColor: Colors.surfaceCard, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  avgSentimentLabel: { color: Colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  avgSentimentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avgSentimentScore: { fontSize: 16, fontWeight: '700', width: 80 },
  avgSentimentBar: { flex: 1, height: 8, backgroundColor: Colors.borderSubtle, borderRadius: 4, overflow: 'hidden' },
  avgSentimentFill: { height: '100%', borderRadius: 4 },

  // Per-contact sentiment
  sentimentPersonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surfaceCard, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  sentimentPersonInfo: { width: 80 },
  sentimentPersonName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  sentimentPersonCount: { color: Colors.textMuted, fontSize: 10, marginTop: 1 },
  sentimentMiniBar: { flex: 1, height: 6, backgroundColor: Colors.borderSubtle, borderRadius: 3, overflow: 'hidden' },
  sentimentMiniFill: { height: '100%', borderRadius: 3 },
  sentimentPersonScore: { fontSize: 12, fontWeight: '600', width: 70, textAlign: 'right' },

  // Recent sentiment
  recentSentimentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  recentDate: { color: Colors.textMuted, fontSize: 11, fontFamily: 'SpaceMono', width: 78 },
  recentContact: { color: Colors.textPrimary, fontSize: 13, fontWeight: '500', flex: 1 },
  recentBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  recentBadgeText: { fontSize: 11, fontWeight: '600' },

  loadMoreBtn: { alignItems: 'center', padding: 10, marginTop: 4, backgroundColor: Colors.surfaceCard, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  loadMoreText: { color: Colors.secondaryAccent, fontSize: 12, fontWeight: '600' },
  }), [Colors]);
}
