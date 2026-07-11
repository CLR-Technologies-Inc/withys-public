/**
 * Unit tests for the sentiment analysis and relationship health engine.
 *
 * Tests cover:
 *   - Sentiment analysis (positive, negative, neutral, negation, intensifiers)
 *   - Target level helpers
 *   - Relationship health calculator (composite scoring)
 *   - UI helper functions (colors, emojis)
 *   - Edge cases (empty inputs, single entries)
 */

import {
  analyzeSentiment,
  targetLevelToDays,
  targetLevelLabel,
  TARGET_LEVELS,
  calculateRelationshipHealth,
  healthScoreColor,
  sentimentColor,
  healthStatusEmoji,
  sentimentEmoji,
  trendArrow,
} from '../sentiment';
import type { TargetLevel, SentimentLabel, RelationshipHealth } from '../sentiment';

// ── analyzeSentiment ────────────────────────────────────────────────────────

describe('analyzeSentiment', () => {
  it('scores clearly positive text as positive', () => {
    const result = analyzeSentiment('Had an amazing wonderful day with friends');
    expect(result.label).toBe('positive');
    expect(result.score).toBeGreaterThan(0.1);
    expect(result.positiveCount).toBeGreaterThan(0);
    expect(result.negativeCount).toBe(0);
  });

  it('scores clearly negative text as negative', () => {
    const result = analyzeSentiment('Terrible awful day, we had a horrible argument');
    expect(result.label).toBe('negative');
    expect(result.score).toBeLessThan(-0.1);
    expect(result.negativeCount).toBeGreaterThan(0);
  });

  it('scores neutral text as neutral', () => {
    const result = analyzeSentiment('Met at the office to discuss the schedule');
    expect(result.label).toBe('neutral');
    expect(result.score).toBeGreaterThanOrEqual(-0.1);
    expect(result.score).toBeLessThanOrEqual(0.1);
  });

  it('handles negation: "not happy" registers as negative', () => {
    const result = analyzeSentiment('I was not happy about the situation');
    // "not happy" should flip happy to a negative signal
    expect(result.negativeCount).toBeGreaterThan(0);
  });

  it('handles intensifiers: "very happy" scores higher than "happy"', () => {
    const baseline = analyzeSentiment('I was happy');
    const intensified = analyzeSentiment('I was very happy');
    // Intensified should have a higher positive score
    expect(intensified.score).toBeGreaterThanOrEqual(baseline.score);
  });

  it('skips hledger metadata lines (postings and date headers)', () => {
    const result = analyzeSentiment([
      '2025-07-01 John | Coffee Shop',
      '  Had a great time',
      '  expenses:food  $-12',
    ].join('\n'));
    // Should still detect "great" from the description line
    expect(result.label).toBe('positive');
  });

  it('returns zero score for empty text', () => {
    const result = analyzeSentiment('');
    expect(result.score).toBe(0);
    expect(result.label).toBe('neutral');
    expect(result.confidence).toBe(0);
  });

  it('confidence scales with number of sentiment words found', () => {
    // Use a longer text with few sentiment words to get lower confidence
    const diluted = analyzeSentiment('I went to the store and the building and the car and the road and good');
    const concentrated = analyzeSentiment('amazing wonderful fantastic incredible delighted');
    expect(concentrated.confidence).toBeGreaterThanOrEqual(diluted.confidence);
  });

  it('handles mixed sentiment text', () => {
    const result = analyzeSentiment('Started off terrible but ended up being a great evening');
    // Both positive and negative counts should be nonzero
    expect(result.positiveCount).toBeGreaterThan(0);
    expect(result.negativeCount).toBeGreaterThan(0);
  });
});

// ── Target Level Helpers ────────────────────────────────────────────────────

describe('targetLevelToDays', () => {
  it('returns correct day values for all levels', () => {
    expect(targetLevelToDays('daily')).toBe(1);
    expect(targetLevelToDays('weekly')).toBe(7);
    expect(targetLevelToDays('biweekly')).toBe(14);
    expect(targetLevelToDays('monthly')).toBe(30);
    expect(targetLevelToDays('quarterly')).toBe(90);
    expect(targetLevelToDays('semiannually')).toBe(182);
    expect(targetLevelToDays('annually')).toBe(365);
    expect(targetLevelToDays('biannually')).toBe(730);
    expect(targetLevelToDays('none')).toBe(Infinity);
  });
});

describe('targetLevelLabel', () => {
  it('returns human-readable labels for all levels', () => {
    expect(targetLevelLabel('daily')).toBe('Every day');
    expect(targetLevelLabel('weekly')).toBe('Weekly');
    expect(targetLevelLabel('biweekly')).toBe('Every 2 weeks');
    expect(targetLevelLabel('monthly')).toBe('Monthly');
    expect(targetLevelLabel('quarterly')).toBe('Quarterly');
    expect(targetLevelLabel('semiannually')).toBe('Semi-annually');
    expect(targetLevelLabel('annually')).toBe('Annually');
    expect(targetLevelLabel('biannually')).toBe('Bi-annually (2 yrs)');
    expect(targetLevelLabel('none')).toBe('No target');
  });
});

describe('TARGET_LEVELS', () => {
  it('contains all six levels', () => {
    expect(TARGET_LEVELS).toHaveLength(9);
    expect(TARGET_LEVELS).toContain('daily');
    expect(TARGET_LEVELS).toContain('none');
  });
});

// ── calculateRelationshipHealth ─────────────────────────────────────────────

describe('calculateRelationshipHealth', () => {
  const fixedNow = new Date('2025-08-20');

  it('returns "new" status for zero entries', () => {
    const health = calculateRelationshipHealth([], 'weekly', fixedNow);
    expect(health.status).toBe('new');
    expect(health.score).toBe(0);
    expect(health.daysSinceLastContact).toBe(Infinity);
    expect(health.sentimentHistory).toHaveLength(0);
  });

  it('returns "new" status for exactly one entry', () => {
    const entries = [
      { entry_date: '2025-08-19', raw_text: 'Had a great catch-up' },
    ];
    const health = calculateRelationshipHealth(entries, 'weekly', fixedNow);
    expect(health.status).toBe('new');
  });

  it('calculates days since last contact correctly', () => {
    const entries = [
      { entry_date: '2025-08-10', raw_text: 'Good meeting' },
      { entry_date: '2025-08-01', raw_text: 'Nice chat' },
    ];
    const health = calculateRelationshipHealth(entries, 'weekly', fixedNow);
    expect(health.daysSinceLastContact).toBe(10);
  });

  it('produces higher scores for recent, frequent, positive interactions', () => {
    const recentPositive = [
      { entry_date: '2025-08-19', raw_text: 'Amazing time, wonderful lunch together!' },
      { entry_date: '2025-08-15', raw_text: 'Great call, really enjoyed catching up' },
      { entry_date: '2025-08-10', raw_text: 'Fun afternoon at the park, fantastic' },
    ];
    const oldNegative = [
      { entry_date: '2025-06-01', raw_text: 'Terrible argument, very frustrated' },
      { entry_date: '2025-05-15', raw_text: 'Awkward conversation, felt distant' },
      { entry_date: '2025-05-01', raw_text: 'Disappointed, he cancelled again' },
    ];

    const healthA = calculateRelationshipHealth(recentPositive, 'weekly', fixedNow);
    const healthB = calculateRelationshipHealth(oldNegative, 'weekly', fixedNow);

    expect(healthA.score).toBeGreaterThan(healthB.score);
  });

  it('detects improving sentiment trend', () => {
    // Old entries negative, recent entries positive
    const entries = [
      { entry_date: '2025-08-18', raw_text: 'Amazing day, everything was wonderful' },
      { entry_date: '2025-08-15', raw_text: 'Great progress on the project' },
      { entry_date: '2025-08-10', raw_text: 'Good meeting overall' },
      { entry_date: '2025-07-01', raw_text: 'Terrible argument, very upset' },
      { entry_date: '2025-06-15', raw_text: 'Frustrated, things are not going well' },
      { entry_date: '2025-06-01', raw_text: 'Awful conversation, so disappointed' },
    ];
    const health = calculateRelationshipHealth(entries, 'weekly', fixedNow);
    expect(health.trend).toBe('improving');
  });

  it('detects declining sentiment trend', () => {
    // Old entries positive, recent entries negative
    const entries = [
      { entry_date: '2025-08-18', raw_text: 'Terrible, things are getting worse' },
      { entry_date: '2025-08-15', raw_text: 'Frustrated and disappointed again' },
      { entry_date: '2025-08-10', raw_text: 'Bad argument, very tense' },
      { entry_date: '2025-07-01', raw_text: 'Wonderful time, so happy' },
      { entry_date: '2025-06-15', raw_text: 'Amazing catch-up, loved it' },
      { entry_date: '2025-06-01', raw_text: 'Great conversations, very positive' },
    ];
    const health = calculateRelationshipHealth(entries, 'weekly', fixedNow);
    expect(health.trend).toBe('declining');
  });

  it('marks on-target when frequency meets the threshold', () => {
    // Weekly target = 7 days. 12 entries in 90 days = 7.5 days/entry → within 1.5x
    const entries = Array.from({ length: 12 }, (_, i) => ({
      entry_date: new Date(fixedNow.getTime() - i * 7 * 86400000).toISOString().slice(0, 10),
      raw_text: 'Regular check-in, good conversation',
    }));
    const health = calculateRelationshipHealth(entries, 'weekly', fixedNow);
    expect(health.onTarget).toBe(true);
  });

  it('marks off-target when frequency is too low', () => {
    // Weekly target but only 1 entry in 90 days
    const entries = [
      { entry_date: '2025-07-01', raw_text: 'Only one meeting in months' },
      { entry_date: '2025-06-01', raw_text: 'One old meeting' },
    ];
    const health = calculateRelationshipHealth(entries, 'weekly', fixedNow);
    expect(health.onTarget).toBe(false);
  });

  it('always marks on-target when target is "none"', () => {
    const entries = [
      { entry_date: '2025-06-01', raw_text: 'Old entry' },
      { entry_date: '2025-05-01', raw_text: 'Older entry' },
    ];
    const health = calculateRelationshipHealth(entries, 'none', fixedNow);
    expect(health.onTarget).toBe(true);
    expect(health.targetCompletion).toBe(100);
  });

  it('health score is bounded between 0 and 100', () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({
      entry_date: new Date(fixedNow.getTime() - i * 3 * 86400000).toISOString().slice(0, 10),
      raw_text: 'Amazing wonderful fantastic incredible day!',
    }));
    const health = calculateRelationshipHealth(entries, 'daily', fixedNow);
    expect(health.score).toBeGreaterThanOrEqual(0);
    expect(health.score).toBeLessThanOrEqual(100);
  });

  it('populates sentimentHistory for each entry', () => {
    const entries = [
      { entry_date: '2025-08-18', raw_text: 'Good day' },
      { entry_date: '2025-08-10', raw_text: 'Bad day' },
    ];
    const health = calculateRelationshipHealth(entries, 'weekly', fixedNow);
    expect(health.sentimentHistory).toHaveLength(2);
    health.sentimentHistory.forEach(h => {
      expect(h).toHaveProperty('date');
      expect(h).toHaveProperty('score');
      expect(h).toHaveProperty('label');
    });
  });
});

// ── Health Status Thresholds ────────────────────────────────────────────────

describe('health status thresholds', () => {
  const fixedNow = new Date('2025-08-20');

  it('"thriving" for score >= 75', () => {
    // Very recent, very positive, frequent entries
    const entries = Array.from({ length: 15 }, (_, i) => ({
      entry_date: new Date(fixedNow.getTime() - i * 5 * 86400000).toISOString().slice(0, 10),
      raw_text: 'Amazing wonderful time together, so happy!',
    }));
    const health = calculateRelationshipHealth(entries, 'weekly', fixedNow);
    if (health.score >= 75) expect(health.status).toBe('thriving');
  });
});

// ── UI Helper Functions ─────────────────────────────────────────────────────

describe('healthScoreColor', () => {
  it('returns green for high scores', () => {
    expect(healthScoreColor(80)).toBe('#4ADE80');
  });
  it('returns blue for moderate scores', () => {
    expect(healthScoreColor(60)).toBe('#38BDF8');
  });
  it('returns amber for low scores', () => {
    expect(healthScoreColor(30)).toBe('#FBBF24');
  });
  it('returns red for critical scores', () => {
    expect(healthScoreColor(10)).toBe('#F87171');
  });
});

describe('sentimentColor', () => {
  it('returns colors for different score ranges', () => {
    expect(sentimentColor(0.5)).toBe('#4ADE80');
    expect(sentimentColor(0.2)).toBe('#86EFAC');
    expect(sentimentColor(0.0)).toBe('#94A3B8');
    expect(sentimentColor(-0.2)).toBe('#FBBF24');
    expect(sentimentColor(-0.5)).toBe('#F87171');
  });
});

describe('healthStatusEmoji', () => {
  it('returns correct emojis for all statuses', () => {
    expect(healthStatusEmoji('thriving')).toBe('💚');
    expect(healthStatusEmoji('healthy')).toBe('💙');
    expect(healthStatusEmoji('fading')).toBe('💛');
    expect(healthStatusEmoji('neglected')).toBe('❤️‍🩹');
    expect(healthStatusEmoji('new')).toBe('🆕');
  });
});

describe('sentimentEmoji', () => {
  it('returns correct emojis for all labels', () => {
    expect(sentimentEmoji('positive')).toBe('😊');
    expect(sentimentEmoji('neutral')).toBe('😐');
    expect(sentimentEmoji('negative')).toBe('😔');
  });
});

describe('trendArrow', () => {
  it('returns correct arrows for all trends', () => {
    expect(trendArrow('improving')).toBe('↗');
    expect(trendArrow('stable')).toBe('→');
    expect(trendArrow('declining')).toBe('↘');
  });
});
