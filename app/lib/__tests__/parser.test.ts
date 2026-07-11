/**
 * Unit tests for the hledger-style entry parser.
 *
 * Tests cover:
 *   - Header parsing (date, status, contact, location)
 *   - Body line classification (description, posting, comment)
 *   - Inline tag extraction
 *   - Round-trip formatting (parse → format → parse)
 *   - Edge cases and malformed inputs
 */

import { parseEntry, formatEntry, extractTags } from '../parser';
import type { ParsedEntry } from '../parser';

// ── Header Parsing ──────────────────────────────────────────────────────────

describe('parseEntry – header line', () => {
  it('parses a simple date + contact', () => {
    const result = parseEntry('2025-07-01 John');
    expect(result.date).toBe('2025-07-01');
    expect(result.contact).toBe('John');
    expect(result.status).toBeUndefined();
    expect(result.location).toBeUndefined();
  });

  it('parses contact with location after pipe', () => {
    const result = parseEntry('2025-07-01 John | Coffee Shop');
    expect(result.contact).toBe('John');
    expect(result.location).toBe('Coffee Shop');
  });

  it('parses status character (*)', () => {
    const result = parseEntry('2025-07-01 * John | Office');
    expect(result.status).toBe('*');
    expect(result.contact).toBe('John');
    expect(result.location).toBe('Office');
  });

  it('parses status character (!)', () => {
    const result = parseEntry('2025-07-01 ! Sarah');
    expect(result.status).toBe('!');
    expect(result.contact).toBe('Sarah');
  });

  it('parses status character (?)', () => {
    const result = parseEntry('2025-07-01 ? Unknown Person');
    expect(result.status).toBe('?');
    expect(result.contact).toBe('Unknown Person');
  });

  it('handles empty location after pipe gracefully', () => {
    const result = parseEntry('2025-07-01 John |');
    expect(result.contact).toBe('John');
    expect(result.location).toBeUndefined();
  });

  it('handles multi-word contact names', () => {
    const result = parseEntry('2025-07-01 Dr. Patel | Clinic');
    expect(result.contact).toBe('Dr. Patel');
  });

  it('handles missing date gracefully', () => {
    const result = parseEntry('No date here');
    expect(result.date).toBe('');
    expect(result.contact).toBe('No date here');
  });

  it('preserves the raw text', () => {
    const raw = '2025-07-01 John | Office\n    Did some work';
    const result = parseEntry(raw);
    expect(result.raw).toBe(raw);
  });
});

// ── Body Line Parsing ───────────────────────────────────────────────────────

describe('parseEntry – body lines', () => {
  it('parses description lines', () => {
    const result = parseEntry(
      '2025-07-01 John\n    We talked about potatoes'
    );
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].type).toBe('description');
    expect(result.lines[0].content).toBe('We talked about potatoes');
  });

  it('parses description lines with inline tags', () => {
    const result = parseEntry(
      '2025-07-01 John\n    Had lunch  ; topic:food, mood:happy'
    );
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].type).toBe('description');
    expect(result.lines[0].content).toBe('Had lunch');
    expect(result.lines[0].tags).toEqual([
      { name: 'topic', value: 'food' },
      { name: 'mood', value: 'happy' },
    ]);
  });

  it('parses standalone comment lines', () => {
    const result = parseEntry(
      '2025-07-01 John\n    ; relationship:friend'
    );
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].type).toBe('comment');
    expect(result.lines[0].tags).toEqual([
      { name: 'relationship', value: 'friend' },
    ]);
  });

  it('parses posting lines with dollar amounts', () => {
    const result = parseEntry(
      '2025-07-01 John\n    expenses:coffee $8'
    );
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].type).toBe('posting');
    expect(result.lines[0].account).toBe('expenses:coffee');
    expect(result.lines[0].amount).toBe(8);
    expect(result.lines[0].currency).toBe('$');
  });

  it('parses posting lines with negative amounts', () => {
    const result = parseEntry(
      '2025-07-01 John\n    expenses:food $-15'
    );
    expect(result.lines[0].amount).toBe(-15);
  });

  it('parses posting lines without currency sign', () => {
    const result = parseEntry(
      '2025-07-01 John\n    equity:start 100'
    );
    expect(result.lines[0].type).toBe('posting');
    expect(result.lines[0].account).toBe('equity:start');
    expect(result.lines[0].amount).toBe(100);
  });

  it('handles multiple body line types in one entry', () => {
    const raw = [
      '2025-07-01 John | Park',
      '    We went for a walk  ; mood:great',
      '    ; relationship:friend',
      '    expenses:food  $-12',
    ].join('\n');
    const result = parseEntry(raw);
    expect(result.lines).toHaveLength(3);
    expect(result.lines[0].type).toBe('description');
    expect(result.lines[1].type).toBe('comment');
    expect(result.lines[2].type).toBe('posting');
  });

  it('skips blank lines in the body', () => {
    const raw = '2025-07-01 John\n\n    Line one\n\n    Line two';
    const result = parseEntry(raw);
    expect(result.lines).toHaveLength(2);
  });
});

// ── Tag Parsing ─────────────────────────────────────────────────────────────

describe('parseEntry – tag parsing', () => {
  it('parses tags without values', () => {
    const result = parseEntry('2025-07-01 John\n    ; important');
    expect(result.lines[0].tags).toEqual([{ name: 'important' }]);
  });

  it('lowercases tag names', () => {
    const result = parseEntry('2025-07-01 John\n    ; Topic:Work');
    expect(result.lines[0].tags).toEqual([{ name: 'topic', value: 'Work' }]);
  });

  it('handles multiple comma-separated tags', () => {
    const result = parseEntry(
      '2025-07-01 John\n    ; mood:happy, event:birthday, important'
    );
    expect(result.lines[0].tags).toHaveLength(3);
    expect(result.lines[0].tags![0]).toEqual({ name: 'mood', value: 'happy' });
    expect(result.lines[0].tags![1]).toEqual({ name: 'event', value: 'birthday' });
    expect(result.lines[0].tags![2]).toEqual({ name: 'important' });
  });

  it('handles tags with colons in values', () => {
    // This tests "url:https://example.com" → name="url", value="https://example.com"
    // Due to indexOf finding first colon, this should work
    const result = parseEntry('2025-07-01 John\n    ; note:contains:colons');
    expect(result.lines[0].tags![0].name).toBe('note');
    expect(result.lines[0].tags![0].value).toBe('contains:colons');
  });
});

// ── extractTags ─────────────────────────────────────────────────────────────

describe('extractTags', () => {
  it('extracts unique tags from all lines', () => {
    const entry = parseEntry([
      '2025-07-01 John',
      '    Line one  ; mood:happy, topic:work',
      '    ; mood:happy',
      '    Line two  ; event:meeting',
    ].join('\n'));

    const tags = extractTags(entry);
    expect(tags).toHaveLength(3); // mood, topic, event (no dupes)
    expect(tags.map(t => t.name)).toEqual(['mood', 'topic', 'event']);
  });

  it('returns empty array for entries with no tags', () => {
    const entry = parseEntry('2025-07-01 John\n    Just a plain description');
    const tags = extractTags(entry);
    expect(tags).toHaveLength(0);
  });
});

// ── formatEntry ─────────────────────────────────────────────────────────────

describe('formatEntry', () => {
  it('formats a simple entry', () => {
    const entry: ParsedEntry = {
      date: '2025-07-01',
      contact: 'John',
      lines: [
        { type: 'description', content: 'Had lunch' },
      ],
      raw: '',
    };
    expect(formatEntry(entry)).toBe('2025-07-01 John\n    Had lunch');
  });

  it('includes status and location in the header', () => {
    const entry: ParsedEntry = {
      date: '2025-07-01',
      status: '*',
      contact: 'Sarah',
      location: 'Cafe',
      lines: [],
      raw: '',
    };
    expect(formatEntry(entry)).toBe('2025-07-01 * Sarah | Cafe');
  });

  it('formats comment lines with tags', () => {
    const entry: ParsedEntry = {
      date: '2025-07-01',
      contact: 'John',
      lines: [
        { type: 'comment', content: 'relationship:friend', tags: [{ name: 'relationship', value: 'friend' }] },
      ],
      raw: '',
    };
    const formatted = formatEntry(entry);
    expect(formatted).toContain('; relationship:friend');
  });

  it('formats posting lines', () => {
    const entry: ParsedEntry = {
      date: '2025-07-01',
      contact: 'John',
      lines: [
        { type: 'posting', content: 'expenses:food $12', account: 'expenses:food', amount: 12, currency: '$' },
      ],
      raw: '',
    };
    const formatted = formatEntry(entry);
    expect(formatted).toContain('expenses:food');
    expect(formatted).toContain('$12');
  });

  it('formats description lines with inline tags', () => {
    const entry: ParsedEntry = {
      date: '2025-07-01',
      contact: 'John',
      lines: [
        { type: 'description', content: 'Had lunch', tags: [{ name: 'mood', value: 'happy' }] },
      ],
      raw: '',
    };
    const formatted = formatEntry(entry);
    expect(formatted).toContain('Had lunch  ; mood:happy');
  });
});

// ── Round-Trip ──────────────────────────────────────────────────────────────

describe('parseEntry ↔ formatEntry round-trip', () => {
  it('preserves structure through parse → format → parse cycle', () => {
    const original = [
      '2025-07-01 * John | Coffee Shop',
      '    Caught up over lattes  ; mood:happy',
      '    ; relationship:friend',
      '    expenses:coffee            $8',
    ].join('\n');

    const parsed1 = parseEntry(original);
    const formatted = formatEntry(parsed1);
    const parsed2 = parseEntry(formatted);

    // Core fields should survive the round-trip
    expect(parsed2.date).toBe(parsed1.date);
    expect(parsed2.status).toBe(parsed1.status);
    expect(parsed2.contact).toBe(parsed1.contact);
    expect(parsed2.location).toBe(parsed1.location);
    expect(parsed2.lines.length).toBe(parsed1.lines.length);

    // Line types preserved
    expect(parsed2.lines.map(l => l.type)).toEqual(parsed1.lines.map(l => l.type));
  });
});

// ── Edge Cases ──────────────────────────────────────────────────────────────

describe('parseEntry – edge cases', () => {
  it('handles an entry with only a header (no body)', () => {
    const result = parseEntry('2025-07-01 John');
    expect(result.lines).toHaveLength(0);
    expect(result.contact).toBe('John');
  });

  it('handles empty string', () => {
    const result = parseEntry('');
    expect(result.date).toBe('');
    expect(result.contact).toBe('');
    expect(result.lines).toHaveLength(0);
  });

  it('handles Windows-style line endings (\\r\\n)', () => {
    const raw = '2025-07-01 John | Park\r\n    Nice walk\r\n    expenses:food $5';
    const result = parseEntry(raw);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].type).toBe('description');
    expect(result.lines[1].type).toBe('posting');
  });

  it('trims leading/trailing whitespace from entry', () => {
    const raw = '   \n  2025-07-01 John  \n    Hello  \n  ';
    const result = parseEntry(raw);
    expect(result.date).toBe('2025-07-01');
  });

  it('handles commas in posting amounts', () => {
    const result = parseEntry('2025-07-01 John\n    expenses:rent $1,200');
    expect(result.lines[0].type).toBe('posting');
    expect(result.lines[0].amount).toBe(1200);
  });
});
