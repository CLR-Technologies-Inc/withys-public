import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColors, useTheme } from '@/lib/ThemeProvider';
import {
  healthScoreColor,
  healthStatusEmoji,
  targetLevelLabel,
  trendArrow,
  sentimentEmoji,
  TARGET_LEVELS,
} from '@/lib/sentiment';
import type { TargetLevel, RelationshipHealth as HealthType } from '@/lib/sentiment';

interface HealthCardProps {
  health: HealthType;
  targetLevel: TargetLevel;
  showTargetPicker: boolean;
  onTogglePicker: () => void;
  onChangeTarget: (level: TargetLevel) => void;
}

export function RelationshipHealthCard({
  health,
  targetLevel,
  showTargetPicker,
  onTogglePicker,
  onChangeTarget,
}: HealthCardProps) {
  const Colors = useColors();
  const { resolvedTheme } = useTheme();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const scoreColor = healthScoreColor(health.score, resolvedTheme);

  return (
    <View style={styles.healthCard}>
      <Text style={styles.sectionTitle}>Relationship Health</Text>

      {/* Score Ring */}
      <View style={styles.healthScoreRow}>
        <View style={[styles.scoreRing, { borderColor: scoreColor }]}>
          <Text style={[styles.scoreNumber, { color: scoreColor }]}>{health.score}</Text>
          <Text style={styles.scoreOutOf}>/100</Text>
        </View>
        <View style={styles.healthMeta}>
          <Text style={styles.healthStatus}>
            {healthStatusEmoji(health.status)} {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
          </Text>
          <View style={styles.healthMetaRow}>
            <FontAwesome name="clock-o" size={11} color={Colors.textMuted} />
            <Text style={styles.healthMetaText}>
              {health.daysSinceLastContact === Infinity ? 'No interactions' : `${health.daysSinceLastContact}d since last contact`}
            </Text>
          </View>
          <View style={styles.healthMetaRow}>
            <FontAwesome name="line-chart" size={11} color={Colors.textMuted} />
            <Text style={styles.healthMetaText}>
              Sentiment: {trendArrow(health.trend)} {health.trend}
            </Text>
          </View>
          <View style={styles.healthMetaRow}>
            <FontAwesome name="heart" size={11} color={Colors.textMuted} />
            <Text style={styles.healthMetaText}>
              Avg mood: {sentimentEmoji(health.avgSentiment > 0.1 ? 'positive' : health.avgSentiment < -0.1 ? 'negative' : 'neutral')}
              {' '}{health.avgSentiment > 0 ? '+' : ''}{(health.avgSentiment * 100).toFixed(0)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Target Level */}
      <View style={styles.targetRow}>
        <View style={styles.targetInfo}>
          <Text style={styles.targetLabel}>Interaction Target</Text>
          <Text style={styles.targetValue}>{targetLevelLabel(targetLevel)}</Text>
        </View>
        <TouchableOpacity style={styles.targetEditBtn} onPress={onTogglePicker}>
          <FontAwesome name="pencil" size={11} color={Colors.secondaryAccent} />
        </TouchableOpacity>
      </View>

      {/* Target Progress */}
      {targetLevel !== 'none' && (
        <View style={styles.targetProgressRow}>
          <View style={styles.targetBarTrack}>
            <View style={[
              styles.targetBarFill,
              {
                width: `${Math.min(100, health.targetCompletion)}%`,
                backgroundColor: health.onTarget ? Colors.success : Colors.warning,
              }
            ]} />
          </View>
          <Text style={[styles.targetPercent, { color: health.onTarget ? Colors.success : Colors.warning }]}>
            {health.targetCompletion}%
          </Text>
        </View>
      )}

      {/* Target Picker */}
      {showTargetPicker && (
        <View style={styles.targetPicker}>
          {TARGET_LEVELS.map((level) => (
            <TouchableOpacity
              key={level}
              style={[styles.targetOption, targetLevel === level && styles.targetOptionActive]}
              onPress={() => onChangeTarget(level)}
            >
              <Text style={[styles.targetOptionText, targetLevel === level && styles.targetOptionTextActive]}>
                {targetLevelLabel(level)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const createStyles = (Colors: ReturnType<typeof useColors>) => StyleSheet.create({
  sectionTitle: { color: Colors.secondaryAccent, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginLeft: 16, marginTop: 20, marginBottom: 10 },
  healthCard: { margin: 16, backgroundColor: Colors.surfaceCard, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border },
  healthScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 12 },
  scoreRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  scoreNumber: { fontSize: 28, fontWeight: '800', fontFamily: 'SpaceMono' },
  scoreOutOf: { color: Colors.textMuted, fontSize: 10, marginTop: -2 },
  healthMeta: { flex: 1, gap: 6 },
  healthStatus: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  healthMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  healthMetaText: { color: Colors.textMuted, fontSize: 12 },
  targetRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: Colors.borderSubtle },
  targetInfo: { flex: 1 },
  targetLabel: { color: Colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  targetValue: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600', marginTop: 2 },
  targetEditBtn: { padding: 8 },
  targetProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  targetBarTrack: { flex: 1, height: 6, backgroundColor: Colors.borderSubtle, borderRadius: 3, overflow: 'hidden' },
  targetBarFill: { height: '100%', borderRadius: 3 },
  targetPercent: { fontSize: 12, fontWeight: '700', fontFamily: 'SpaceMono', width: 40, textAlign: 'right' },
  targetPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.borderSubtle },
  targetOption: { backgroundColor: Colors.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  targetOptionActive: { backgroundColor: Colors.primaryAccent, borderColor: Colors.primaryAccent },
  targetOptionText: { color: Colors.textMuted, fontSize: 12, fontWeight: '500' },
  targetOptionTextActive: { color: '#FFFFFF', fontWeight: '700' },
});
