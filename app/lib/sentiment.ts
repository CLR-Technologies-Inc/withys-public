/**
 * Sentiment & Relationship Health Analysis Engine for WWLO PRM.
 *
 * Architecture:
 *   1. Lexicon-based sentiment scoring (no external API dependencies)
 *   2. Composite health score from: sentiment trend, interaction frequency, recency decay
 *   3. Target level comparison for "on-track" / "neglecting" indicators
 *
 * The analyzer works entirely client-side on plaintext entries.
 * Future: can be enhanced with local Gemma inference for nuanced analysis.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export interface SentimentResult {
  /** Normalized score: -1.0 (very negative) to +1.0 (very positive) */
  score: number;
  /** Human-readable label */
  label: SentimentLabel;
  /** Confidence 0-1 (based on how many sentiment words were found) */
  confidence: number;
  /** Number of positive signals found */
  positiveCount: number;
  /** Number of negative signals found */
  negativeCount: number;
}

/** How often the user wants to interact with a contact */
export type TargetLevel =
  | 'daily'     // every day
  | 'weekly'    // once a week
  | 'biweekly'  // every 2 weeks
  | 'monthly'   // once a month
  | 'quarterly' // once per quarter
  | 'semiannually' // twice a year
  | 'annually'  // once a year
  | 'biannually' // every 2 years
  | 'none';     // no target set

export interface RelationshipHealth {
  /** Overall health score: 0 (critical) to 100 (thriving) */
  score: number;
  /** Human-readable status */
  status: 'thriving' | 'healthy' | 'fading' | 'neglected' | 'new';
  /** Average sentiment across all entries */
  avgSentiment: number;
  /** Sentiment trend: improving, stable, declining */
  trend: 'improving' | 'stable' | 'declining';
  /** Days since last interaction */
  daysSinceLastContact: number;
  /** Whether interaction frequency meets the target */
  onTarget: boolean;
  /** Expected days between interactions (from target level) */
  targetDays: number;
  /** Percentage of target met (0-200+, capped at display) */
  targetCompletion: number;
  /** Per-entry sentiment history (most recent first) */
  sentimentHistory: { date: string; score: number; label: SentimentLabel }[];
}

// ── Lexicon ──────────────────────────────────────────────────────────────────
// Weighted keyword lists tuned for personal/relationship journal context.
// Words are lowercase. Weights: 1 = mild, 2 = moderate, 3 = strong.

const SENTIMENT_LEXICON: Record<string, number> = {
  // Strong positive
  'amazing': 3, 'wonderful': 3, 'fantastic': 3, 'excellent': 3, 'incredible': 3,
  'thrilled': 3, 'ecstatic': 3, 'delighted': 3, 'love': 3, 'loved': 3,
  'brilliant': 3, 'outstanding': 3, 'perfect': 3, 'blessed': 3,
  // Moderate positive
  'great': 2, 'happy': 2, 'excited': 2, 'enjoyed': 2, 'fun': 2,
  'good': 2, 'glad': 2, 'nice': 2, 'helpful': 2, 'supportive': 2,
  'grateful': 2, 'thankful': 2, 'appreciate': 2, 'beautiful': 2,
  'celebrate': 2, 'celebrated': 2, 'celebrating': 2, 'success': 2,
  'accomplished': 2, 'inspired': 2, 'inspiring': 2, 'warm': 2,
  'generous': 2, 'kind': 2, 'thoughtful': 2, 'progress': 2,
  'productive': 2, 'meaningful': 2, 'positive': 2,
  // Mild positive
  'well': 1, 'better': 1, 'fine': 1, 'okay': 1, 'interesting': 1,
  'cool': 1, 'caught up': 1, 'connected': 1, 'shared': 1,
  'laughed': 1, 'smiled': 1, 'agreed': 1, 'helped': 1, 'helping': 1,
  'planning': 1, 'looking forward': 1, 'excited about': 1,
  'bonded': 1, 'growing': 1, 'improving': 1, 'learning': 1,
  'comfortable': 1, 'relaxed': 1, 'calm': 1, 'peaceful': 1,
  'together': 1, 'reunion': 1, 'catching up': 1,
  'reconnection': 2, 'support': 2, 'reliable': 2, 'consistent': 2,
  'understanding': 2, 'empathy': 2, 'vulnerability': 2, 'trust': 3,
  'encouraging': 2, 'positive energy': 2, 'refreshing': 2, 'comforting': 2,

  // Strong negative
  'terrible': -3, 'awful': -3, 'horrible': -3, 'devastated': -3,
  'furious': -3, 'betrayed': -3, 'disgusted': -3, 'hate': -3, 'hated': -3,
  'abusive': -3, 'toxic': -3, 'violent': -3, 'heartbroken': -3,
  // Moderate negative
  'angry': -2, 'upset': -2, 'frustrated': -2, 'annoyed': -2, 'disappointed': -2,
  'sad': -2, 'unhappy': -2, 'worried': -2, 'anxious': -2, 'stressed': -2,
  'argued': -2, 'argument': -2, 'fight': -2, 'fighting': -2, 'conflict': -2,
  'complained': -2, 'complaining': -2, 'difficult': -2, 'struggling': -2,
  'cancelled': -2, 'ignored': -2, 'ghosted': -2, 'lied': -2, 'lying': -2,
  'awkward': -2, 'tense': -2, 'cold': -2, 'distant': -2, 'rude': -2,
  // Mild negative
  'bad': -1, 'worse': -1, 'problem': -1, 'issue': -1, 'concern': -1,
  'busy': -1, 'tired': -1, 'boring': -1, 'bored': -1,
  'late': -1, 'missed': -1, 'forgot': -1, 'forgot about': -1,
  'confusing': -1, 'unclear': -1, 'unsure': -1, 'hesitant': -1,
  'delayed': -1, 'postponed': -1,
  'unreliable': -2, 'inconsistent': -2, 'flakey': -2,
  'draining': -2, 'exhausting': -2, 'one-sided': -2, 'neglected': -3,
  'misunderstanding': -2, 'tension': -2, 'uncomfortable': -2, 'avoiding': -2,
};

// ⚡ Auto-derive multi-word phrase starters from lexicon keys at module init.
// This avoids a manually maintained list that goes stale when new phrases are added.
const MULTI_WORD_STARTERS = new Set(
  Object.keys(SENTIMENT_LEXICON)
    .filter(k => k.includes(' '))
    .map(k => k.split(' ')[0])
);

// Negation words that flip the next sentiment word
const NEGATION_WORDS = new Set([
  'not', "n't", 'no', 'never', 'neither', 'nor', 'hardly', 'barely',
  'scarcely', 'without', "don't", "doesn't", "didn't", "won't",
  "wouldn't", "couldn't", "shouldn't", "isn't", "aren't", "wasn't",
]);

// Intensifiers that amplify the next sentiment word
const INTENSIFIERS: Record<string, number> = {
  'very': 1.5, 'really': 1.5, 'extremely': 2.0, 'incredibly': 2.0,
  'absolutely': 2.0, 'totally': 1.5, 'completely': 1.5, 'so': 1.3,
  'quite': 1.2, 'pretty': 1.2, 'super': 1.5,
};

// ── Sentiment Analysis ───────────────────────────────────────────────────────

// Cache for sentiment analysis results to avoid redundant computations
const sentimentCache = new Map<string, SentimentResult>();

// ⚡ Pre-compiled regexes hoisted to module scope to avoid recompilation per call
const METADATA_RE = /^(\s*(\w+:\w+|\d{4}-\d{2}-\d{2}).*)$/gm;
const PUNCTUATION_RE = /[.,!?;:'"()]/g;

/**
 * Analyze the sentiment of a text string.
 * Uses lexicon-based approach with negation and intensifier handling.
 * Optimized for O(N) single-pass analysis with minimal allocations.
 */
export function analyzeSentiment(text: string): SentimentResult {
  if (sentimentCache.has(text)) {
    return sentimentCache.get(text)!;
  }

  // ⚡ Strip metadata and date headers in a single regex pass (vs split/filter/join)
  const content = text.toLowerCase().replace(METADATA_RE, '');
  const rawWords = content.split(/\s+/);

  // ⚡ Pre-clean punctuation in a single pass to avoid repeated regex in loop
  const words = rawWords.map(w => w.replace(PUNCTUATION_RE, ''));

  let positiveScore = 0;
  let negativeScore = 0;
  let positiveCount = 0;
  let negativeCount = 0;
  let totalSentimentWords = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let weight = 0;
    let skip = 0;

    // Check if previous word was a negation or intensifier
    const prevWord = i > 0 ? words[i - 1] : '';
    const isNegated = NEGATION_WORDS.has(prevWord);
    const intensifier = INTENSIFIERS[prevWord] || 1.0;

    // ⚡ Only attempt multi-word lookups if word is a known phrase starter
    if (MULTI_WORD_STARTERS.has(word)) {
      const trigram = i < words.length - 2 ? `${word} ${words[i + 1]} ${words[i + 2]}` : '';
      const bigram = i < words.length - 1 ? `${word} ${words[i + 1]}` : '';
      
      if (trigram && SENTIMENT_LEXICON[trigram]) {
        weight = SENTIMENT_LEXICON[trigram];
        skip = 2;
      } else if (bigram && SENTIMENT_LEXICON[bigram]) {
        weight = SENTIMENT_LEXICON[bigram];
        skip = 1;
      } else {
        weight = SENTIMENT_LEXICON[word] || 0;
      }
    } else {
      weight = SENTIMENT_LEXICON[word] || 0;
    }

    if (weight !== 0) {
      let scoreVal = weight * intensifier;

      if (isNegated) {
        // Negated sentiment flips polarity and reduces intensity
        // e.g. "not great" (+2) → mild negative (-1)
        scoreVal = -scoreVal * 0.5;
      }

      if (scoreVal > 0) {
        positiveScore += scoreVal;
        positiveCount++;
      } else {
        negativeScore += Math.abs(scoreVal);
        negativeCount++;
      }

      totalSentimentWords++;
      i += skip; // Skip used words if n-gram matched
    }
  }

  // 2. Normalize to -1..+1 range
  const totalWeight = positiveScore + negativeScore;
  const score = totalWeight === 0 ? 0 : (positiveScore - negativeScore) / totalWeight;

  // Confidence based on number of sentiment signals relative to text length
  const confidence = Math.min(1, totalSentimentWords / Math.max(1, words.length * 0.15));

  const label: SentimentLabel =
    score > 0.1 ? 'positive' :
      score < -0.1 ? 'negative' :
        'neutral';

  const result: SentimentResult = { score, label, confidence, positiveCount, negativeCount };
  sentimentCache.set(text, result);
  return result;
}

// ── Target Level Helpers ─────────────────────────────────────────────────────

/** Map a target level to expected days between interactions */
export function targetLevelToDays(level: TargetLevel): number {
  switch (level) {
    case 'daily': return 1;
    case 'weekly': return 7;
    case 'biweekly': return 14;
    case 'monthly': return 30;
    case 'quarterly': return 90;
    case 'semiannually': return 182;
    case 'annually': return 365;
    case 'biannually': return 730;
    case 'none': return Infinity;
  }
}

/** Human-readable label for a target level */
export function targetLevelLabel(level: TargetLevel): string {
  switch (level) {
    case 'daily': return 'Every day';
    case 'weekly': return 'Weekly';
    case 'biweekly': return 'Every 2 weeks';
    case 'monthly': return 'Monthly';
    case 'quarterly': return 'Quarterly';
    case 'semiannually': return 'Semi-annually';
    case 'annually': return 'Annually';
    case 'biannually': return 'Bi-annually (2 yrs)';
    case 'none': return 'No target';
  }
}

/** All available target levels for picker */
export const TARGET_LEVELS: TargetLevel[] = [
  'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannually', 'annually', 'biannually', 'none',
];

// ── Relationship Health Calculator ───────────────────────────────────────────

interface EntryForHealth {
  entry_date: string;
  raw_text: string;
}

/**
 * Calculate the overall relationship health for a contact.
 *
 * Health score (0-100) is a weighted composite of:
 *   - Recency (40%): How recently the last interaction occurred
 *   - Frequency vs Target (30%): Are interactions meeting the set target?
 *   - Sentiment (20%): Average emotional tone of interactions
 *   - Consistency (10%): How evenly spaced are the interactions?
 */
export function calculateRelationshipHealth(
  entries: EntryForHealth[],
  targetLevel: TargetLevel,
  now: Date = new Date()
): RelationshipHealth {
  if (entries.length === 0) {
    return {
      score: 0,
      status: 'new',
      avgSentiment: 0,
      trend: 'stable',
      daysSinceLastContact: Infinity,
      onTarget: false,
      targetDays: targetLevelToDays(targetLevel),
      targetCompletion: 0,
      sentimentHistory: [],
    };
  }

  // Pre-calculate timestamps to avoid O(N log N) or O(N) Date object creations
  const entriesWithTs = entries.map(e => ({
    ...e,
    ts: new Date(e.entry_date).getTime()
  }));

  // Sort entries by date (newest first) using numeric timestamps
  const sorted = [...entriesWithTs].sort((a, b) => b.ts - a.ts);

  // ── Sentiment analysis per entry ──
  const sentimentHistory = sorted.map(e => {
    const result = analyzeSentiment(e.raw_text);
    return { date: e.entry_date, score: result.score, label: result.label, ts: e.ts };
  });

  const avgSentiment = sentimentHistory.reduce((sum, s) => sum + s.score, 0) / sentimentHistory.length;

  // ── Sentiment trend (compare recent half vs older half) ──
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (sentimentHistory.length >= 3) {
    const mid = Math.floor(sentimentHistory.length / 2);
    const recentAvg = sentimentHistory.slice(0, mid).reduce((s, e) => s + e.score, 0) / mid;
    const olderAvg = sentimentHistory.slice(mid).reduce((s, e) => s + e.score, 0) / (sentimentHistory.length - mid);
    const diff = recentAvg - olderAvg;
    if (diff > 0.15) trend = 'improving';
    else if (diff < -0.15) trend = 'declining';
  }

  // ── Recency ──
  const nowTs = now.getTime();
  const lastTs = sorted[0].ts;
  const daysSinceLastContact = Math.floor((nowTs - lastTs) / 86400000);

  // ── Target comparison ──
  const targetDays = targetLevelToDays(targetLevel);

  // Calculate actual average frequency over the last 90 days
  const ninetyDaysAgoTs = nowTs - 90 * 86400000;
  const recentEntries = sorted.filter(e => e.ts >= ninetyDaysAgoTs);
  const actualFrequency = recentEntries.length > 0
    ? 90 / recentEntries.length
    : Infinity; // days per interaction

  const onTarget = targetLevel === 'none' || actualFrequency <= targetDays * 1.5;
  const targetCompletion = targetLevel === 'none'
    ? 100
    : Math.min(200, Math.round((targetDays / Math.max(1, actualFrequency)) * 100));

  // ── Consistency score ──
  let consistencyScore = 50; // default for < 3 entries
  if (sorted.length >= 3) {
    const gaps: number[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = (sorted[i].ts - sorted[i + 1].ts) / 86400000;
      gaps.push(gap);
    }
    const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const variance = gaps.reduce((s, g) => s + Math.pow(g - avgGap, 2), 0) / gaps.length;
    const stdDev = Math.sqrt(variance);
    // Lower coefficient of variation = more consistent
    const cv = avgGap > 0 ? stdDev / avgGap : 0;
    consistencyScore = Math.max(0, Math.min(100, 100 - cv * 50));
  }

  // ── Composite Score ──
  // Recency (40%): exponential decay based on target
  const recencyRef = targetLevel === 'none' ? 30 : targetDays;
  const recencyRatio = daysSinceLastContact / recencyRef;
  const recencyScore = Math.max(0, Math.min(100, 100 * Math.exp(-recencyRatio * 0.7)));

  // Frequency (30%): how well we meet the target
  const frequencyScore = Math.min(100, targetCompletion);

  // Sentiment (20%): map -1..+1 to 0..100
  const sentimentScore = Math.max(0, Math.min(100, (avgSentiment + 1) * 50));

  // Consistency (10%)
  const score = Math.round(
    recencyScore * 0.40 +
    frequencyScore * 0.30 +
    sentimentScore * 0.20 +
    consistencyScore * 0.10
  );

  // ── Status label ──
  let status: RelationshipHealth['status'];
  if (entries.length <= 1) status = 'new';
  else if (score >= 75) status = 'thriving';
  else if (score >= 50) status = 'healthy';
  else if (score >= 25) status = 'fading';
  else status = 'neglected';

  return {
    score,
    status,
    avgSentiment,
    trend,
    daysSinceLastContact,
    onTarget,
    targetDays,
    targetCompletion,
    sentimentHistory,
  };
}

// ── Color helpers for UI ─────────────────────────────────────────────────────

/**
 * Get the appropriate color for a health score.
 * Accepts optional theme to return colors optimized for each background.
 */
export function healthScoreColor(score: number, theme?: 'light' | 'dark'): string {
  if (theme === 'light') {
    // Deeper, richer colors readable on white/light backgrounds
    if (score >= 75) return '#16A34A'; // green-600
    if (score >= 50) return '#2563EB'; // blue-600
    if (score >= 25) return '#D97706'; // amber-600
    return '#DC2626'; // red-600
  }
  // Dark mode: brighter colors for contrast against dark backgrounds
  if (score >= 75) return '#4ADE80'; // green-400
  if (score >= 50) return '#38BDF8'; // sky-400
  if (score >= 25) return '#FBBF24'; // amber-400
  return '#F87171'; // red-400
}

/**
 * Get the appropriate color for a sentiment score.
 * Accepts optional theme to return colors optimized for each background.
 */
export function sentimentColor(score: number, theme?: 'light' | 'dark'): string {
  if (theme === 'light') {
    // Deeper hues for light backgrounds
    if (score > 0.3) return '#16A34A';  // green-600
    if (score > 0.1) return '#22C55E';  // green-500
    if (score > -0.1) return '#64748B'; // slate-500
    if (score > -0.3) return '#D97706'; // amber-600
    return '#DC2626'; // red-600
  }
  // Dark mode: original bright colors
  if (score > 0.3) return '#4ADE80';
  if (score > 0.1) return '#86EFAC';
  if (score > -0.1) return '#94A3B8';
  if (score > -0.3) return '#FBBF24';
  return '#F87171';
}

/** Get an emoji for a health status */
export function healthStatusEmoji(status: RelationshipHealth['status']): string {
  switch (status) {
    case 'thriving': return '💚';
    case 'healthy': return '💙';
    case 'fading': return '💛';
    case 'neglected': return '❤️‍🩹';
    case 'new': return '🆕';
  }
}

/** Get an emoji for a sentiment label */
export function sentimentEmoji(label: SentimentLabel): string {
  switch (label) {
    case 'positive': return '😊';
    case 'neutral': return '😐';
    case 'negative': return '😔';
  }
}

/** Trend arrow */
export function trendArrow(trend: RelationshipHealth['trend']): string {
  switch (trend) {
    case 'improving': return '↗';
    case 'stable': return '→';
    case 'declining': return '↘';
  }
}
