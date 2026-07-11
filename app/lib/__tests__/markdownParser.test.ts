/**
 * Unit tests for the markdown-based entry parser.
 *
 * Tests cover:
 *   - Frontmatter parsing (required & optional fields)
 *   - Title extraction from # headings
 *   - Body content preservation
 *   - Interaction type inference from location
 *   - Tag extraction (frontmatter + inline #hashtags)
 *   - Round-trip formatting (parse → format → parse)
 *   - Conversion to/from SampleEntry (backward compat)
 *   - Legacy hledger format detection
 *   - Edge cases
 */

import {
  parseMarkdownEntry,
  formatMarkdownEntry,
  inferInteractionType,
  extractAllTags,
  markdownToSampleEntry,
  sampleEntryToMarkdown,
} from '../markdownParser';
import type { MarkdownEntry } from '../markdownParser';

// ── Frontmatter Parsing ─────────────────────────────────────────────────────

describe('parseMarkdownEntry – frontmatter', () => {
  it('parses required fields (date, contact, location)', () => {
    const entry = parseMarkdownEntry(`---
date: 2025-07-01
contact: John Smith
location: Coffee Shop
---

# Quick catch-up

We talked about the project.`);

    expect(entry.frontmatter.date).toBe('2025-07-01');
    expect(entry.frontmatter.contact).toBe('John Smith');
    expect(entry.frontmatter.location).toBe('Coffee Shop');
  });

  it('parses optional from/to fields (email use case)', () => {
    const entry = parseMarkdownEntry(`---
date: 2025-07-01
contact: Sarah Chen
location: Email
from: sarah@example.com
to: me@example.com
subject: Q3 Budget Review
---

# RE: Q3 Budget Review

Sarah flagged two concerns about the vendor costs.`);

    expect(entry.frontmatter.from).toBe('sarah@example.com');
    expect(entry.frontmatter.to).toBe('me@example.com');
    expect(entry.frontmatter.subject).toBe('Q3 Budget Review');
  });

  it('parses with field as comma-separated list', () => {
    const entry = parseMarkdownEntry(`---
date: 2025-07-01
contact: Mike
location: Meeting
with: Sarah, Alex, Lisa
---

# Team standup

Discussed sprint progress.`);

    expect(entry.frontmatter.with).toEqual(['Sarah', 'Alex', 'Lisa']);
  });

  it('parses tags from frontmatter', () => {
    const entry = parseMarkdownEntry(`---
date: 2025-07-01
contact: John
location: Phone Call
tags: work, catch-up, project-alpha
---

Quick status update.`);

    expect(entry.frontmatter.tags).toEqual(['work', 'catch-up', 'project-alpha']);
  });

  it('parses duration field', () => {
    const entry = parseMarkdownEntry(`---
date: 2025-07-01
contact: John
location: Phone Call
duration: 30 minutes
---

# Status call`);

    expect(entry.frontmatter.duration).toBe('30 minutes');
  });

  it('parses explicit type field', () => {
    const entry = parseMarkdownEntry(`---
date: 2025-07-01
contact: John
location: Starbucks on Main St
type: in-person
---

# Coffee meeting`);

    expect(entry.frontmatter.type).toBe('in-person');
    expect(entry.frontmatter.location).toBe('Starbucks on Main St');
  });

  it('returns empty strings for missing required fields', () => {
    const entry = parseMarkdownEntry(`---
date: 2025-07-01
---

Some body text.`);

    expect(entry.frontmatter.contact).toBe('');
    expect(entry.frontmatter.location).toBe('');
  });

  it('returns undefined for missing optional fields', () => {
    const entry = parseMarkdownEntry(`---
date: 2025-07-01
contact: John
location: Office
---

Body text.`);

    expect(entry.frontmatter.from).toBeUndefined();
    expect(entry.frontmatter.to).toBeUndefined();
    expect(entry.frontmatter.with).toBeUndefined();
    expect(entry.frontmatter.tags).toBeUndefined();
    expect(entry.frontmatter.subject).toBeUndefined();
    expect(entry.frontmatter.duration).toBeUndefined();
  });
});

// ── Title Extraction ────────────────────────────────────────────────────────

describe('parseMarkdownEntry – title', () => {
  it('extracts title from # heading', () => {
    const entry = parseMarkdownEntry(`---
date: 2025-07-01
contact: John
location: Park
---

# Evening walk and brainstorm

We walked the trail and discussed startup ideas.`);

    expect(entry.title).toBe('Evening walk and brainstorm');
  });

  it('handles entries without a title', () => {
    const entry = parseMarkdownEntry(`---
date: 2025-07-01
contact: John
location: Park
---

Just a quick note, no title needed.`);

    expect(entry.title).toBe('');
    expect(entry.body).toBe('Just a quick note, no title needed.');
  });

  it('handles title-only entries (no body)', () => {
    const entry = parseMarkdownEntry(`---
date: 2025-07-01
contact: John
location: Office
---

# Brief meeting, nothing notable`);

    expect(entry.title).toBe('Brief meeting, nothing notable');
    expect(entry.body).toBe('');
  });
});

// ── Body Content ────────────────────────────────────────────────────────────

describe('parseMarkdownEntry – body', () => {
  it('preserves markdown formatting in body', () => {
    const entry = parseMarkdownEntry(`---
date: 2025-07-01
contact: Sarah
location: Email
---

# Project update

She mentioned:
- **Budget** is approved
- Timeline shifted to *August*
- Need to follow up with [Mike](mailto:mike@co.com)

> "Let's aim for the 15th" — Sarah`);

    expect(entry.body).toContain('- **Budget** is approved');
    expect(entry.body).toContain('- Timeline shifted to *August*');
    expect(entry.body).toContain('> "Let\'s aim for the 15th" — Sarah');
  });

  it('preserves multi-paragraph body', () => {
    const entry = parseMarkdownEntry(`---
date: 2025-07-01
contact: Mom
location: Phone Call
---

# Weekly check-in

She's doing well. Dad's birthday is coming up.

We need to plan something special this year — maybe a surprise dinner at that Italian place she mentioned.

Reminder: send flowers on the 14th.`);

    const paragraphs = entry.body.split('\n\n');
    expect(paragraphs.length).toBeGreaterThanOrEqual(3);
  });
});

// ── Interaction Type Inference ───────────────────────────────────────────────

describe('inferInteractionType', () => {
  it('infers phone types', () => {
    expect(inferInteractionType('Phone')).toBe('phone');
    expect(inferInteractionType('Phone Call')).toBe('phone');
    expect(inferInteractionType('call')).toBe('phone');
  });

  it('infers email type', () => {
    expect(inferInteractionType('Email')).toBe('email');
  });

  it('infers text/sms types', () => {
    expect(inferInteractionType('Text')).toBe('text');
    expect(inferInteractionType('SMS')).toBe('text');
    expect(inferInteractionType('Text/SMS')).toBe('text');
    expect(inferInteractionType('iMessage')).toBe('text');
  });

  it('infers video call types', () => {
    expect(inferInteractionType('Zoom')).toBe('video');
    expect(inferInteractionType('Teams')).toBe('video');
    expect(inferInteractionType('Google Meet')).toBe('video');
    expect(inferInteractionType('FaceTime')).toBe('video');
    expect(inferInteractionType('Video Call')).toBe('video');
  });

  it('infers meeting and event types', () => {
    expect(inferInteractionType('Meeting')).toBe('meeting');
    expect(inferInteractionType('Event')).toBe('event');
    expect(inferInteractionType('Conference')).toBe('event');
  });

  it('infers social platform types', () => {
    expect(inferInteractionType('LinkedIn')).toBe('linkedin');
    expect(inferInteractionType('Voicemail')).toBe('voicemail');
  });

  it('returns undefined for physical locations', () => {
    expect(inferInteractionType('Coffee Shop')).toBeUndefined();
    expect(inferInteractionType('Central Park')).toBeUndefined();
    expect(inferInteractionType('123 Main St')).toBeUndefined();
  });

  it('is case-insensitive', () => {
    expect(inferInteractionType('PHONE')).toBe('phone');
    expect(inferInteractionType('email')).toBe('email');
    expect(inferInteractionType('ZOOM')).toBe('video');
  });
});

// ── Tag Extraction ──────────────────────────────────────────────────────────

describe('extractAllTags', () => {
  it('extracts tags from frontmatter', () => {
    const entry = parseMarkdownEntry(`---
date: 2025-07-01
contact: John
location: Office
tags: work, catch-up
---

Body text.`);

    const tags = extractAllTags(entry);
    expect(tags).toContain('work');
    expect(tags).toContain('catch-up');
  });

  it('extracts inline #hashtags from body', () => {
    const entry = parseMarkdownEntry(`---
date: 2025-07-01
contact: John
location: Office
---

Met to discuss #project-alpha and #budget concerns.`);

    const tags = extractAllTags(entry);
    expect(tags).toContain('project-alpha');
    expect(tags).toContain('budget');
  });

  it('deduplicates tags across frontmatter and body', () => {
    const entry = parseMarkdownEntry(`---
date: 2025-07-01
contact: John
location: Office
tags: work, budget
---

Discussed the #budget for Q3 and #work priorities.`);

    const tags = extractAllTags(entry);
    const budgetCount = tags.filter((t) => t === 'budget').length;
    expect(budgetCount).toBe(1);
  });

  it('returns empty array when no tags exist', () => {
    const entry = parseMarkdownEntry(`---
date: 2025-07-01
contact: John
location: Park
---

Just a walk, no tags.`);

    const tags = extractAllTags(entry);
    expect(tags).toEqual([]);
  });

  it('ignores # in headings (not hashtags)', () => {
    const entry = parseMarkdownEntry(`---
date: 2025-07-01
contact: John
location: Office
---

## Meeting Notes

This is a heading, not a tag. But #real-tag is one.`);

    const tags = extractAllTags(entry);
    expect(tags).not.toContain('meeting');
    expect(tags).toContain('real-tag');
  });
});

// ── formatMarkdownEntry ─────────────────────────────────────────────────────

describe('formatMarkdownEntry', () => {
  it('formats a complete entry', () => {
    const entry: MarkdownEntry = {
      frontmatter: {
        date: '2025-07-01',
        contact: 'John Smith',
        location: 'Coffee Shop',
        tags: ['catch-up', 'personal'],
      },
      title: 'Morning coffee',
      body: 'Great conversation about his new garden project.',
      raw: '',
    };

    const formatted = formatMarkdownEntry(entry);
    expect(formatted).toContain('---');
    expect(formatted).toContain('date: 2025-07-01');
    expect(formatted).toContain('contact: John Smith');
    expect(formatted).toContain('location: Coffee Shop');
    expect(formatted).toContain('tags: catch-up, personal');
    expect(formatted).toContain('# Morning coffee');
    expect(formatted).toContain('Great conversation');
  });

  it('omits optional fields when absent', () => {
    const entry: MarkdownEntry = {
      frontmatter: {
        date: '2025-07-01',
        contact: 'John',
        location: 'Office',
      },
      title: '',
      body: 'Quick chat.',
      raw: '',
    };

    const formatted = formatMarkdownEntry(entry);
    expect(formatted).not.toContain('from:');
    expect(formatted).not.toContain('to:');
    expect(formatted).not.toContain('with:');
    expect(formatted).not.toContain('tags:');
  });

  it('formats with field as comma-separated', () => {
    const entry: MarkdownEntry = {
      frontmatter: {
        date: '2025-07-01',
        contact: 'Mike',
        location: 'Meeting Room A',
        with: ['Sarah', 'Alex'],
      },
      title: 'Sprint planning',
      body: '',
      raw: '',
    };

    const formatted = formatMarkdownEntry(entry);
    expect(formatted).toContain('with: Sarah, Alex');
  });
});

// ── Round-Trip ──────────────────────────────────────────────────────────────

describe('parseMarkdownEntry ↔ formatMarkdownEntry round-trip', () => {
  it('preserves structure through parse → format → parse cycle', () => {
    const original = `---
date: 2025-07-01
contact: Sarah Chen
location: Zoom
type: video
with: Mike, Lisa
tags: work, quarterly-review
duration: 45 minutes
---

# Q3 Planning Session

Discussed the roadmap for next quarter.
Sarah is taking the lead on the new initiative.`;

    const parsed1 = parseMarkdownEntry(original);
    const formatted = formatMarkdownEntry(parsed1);
    const parsed2 = parseMarkdownEntry(formatted);

    expect(parsed2.frontmatter.date).toBe(parsed1.frontmatter.date);
    expect(parsed2.frontmatter.contact).toBe(parsed1.frontmatter.contact);
    expect(parsed2.frontmatter.location).toBe(parsed1.frontmatter.location);
    expect(parsed2.frontmatter.type).toBe(parsed1.frontmatter.type);
    expect(parsed2.frontmatter.with).toEqual(parsed1.frontmatter.with);
    expect(parsed2.frontmatter.tags).toEqual(parsed1.frontmatter.tags);
    expect(parsed2.title).toBe(parsed1.title);
    expect(parsed2.body).toBe(parsed1.body);
  });
});

// ── SampleEntry Conversion ──────────────────────────────────────────────────

describe('markdownToSampleEntry', () => {
  it('converts a markdown entry to SampleEntry shape', () => {
    const md = parseMarkdownEntry(`---
date: 2025-07-01
contact: John
location: Coffee Shop
tags: friend, catch-up
---

# Quick coffee

Great talk about his garden.`);

    const sample = markdownToSampleEntry(md, 'test-id');

    expect(sample.id).toBe('test-id');
    expect(sample.entry_date).toBe('2025-07-01');
    expect(sample.contact_name).toBe('John');
    expect(sample.location).toBe('Coffee Shop');
    expect(sample.tags).toEqual(['friend', 'catch-up']);
  });

  it('generates an ID if none provided', () => {
    const md = parseMarkdownEntry(`---
date: 2025-07-01
contact: John
location: Office
---`);

    const sample = markdownToSampleEntry(md);
    expect(sample.id).toBeTruthy();
    expect(sample.id.length).toBeGreaterThan(0);
  });
});

describe('sampleEntryToMarkdown', () => {
  it('converts a markdown-format SampleEntry', () => {
    const rawText = `---
date: 2025-07-01
contact: John
location: Park
tags: outdoors
---

# Walk

We walked the trail.`;

    const result = sampleEntryToMarkdown({
      entry_date: '2025-07-01',
      contact_name: 'John',
      location: 'Park',
      raw_text: rawText,
      tags: ['outdoors'],
    });

    expect(result.frontmatter.date).toBe('2025-07-01');
    expect(result.frontmatter.contact).toBe('John');
    expect(result.title).toBe('Walk');
    expect(result.body).toBe('We walked the trail.');
  });

  it('converts a legacy hledger-format SampleEntry', () => {
    const rawText = `2025-07-01 John | Coffee Shop
    We talked about potatoes and his new job  ; relationship:friend
    He mentioned wanting to start a garden
    equity:start            $-10`;

    const result = sampleEntryToMarkdown({
      entry_date: '2025-07-01',
      contact_name: 'John',
      location: 'Coffee Shop',
      raw_text: rawText,
      tags: ['relationship:friend'],
    });

    expect(result.frontmatter.date).toBe('2025-07-01');
    expect(result.frontmatter.contact).toBe('John');
    expect(result.frontmatter.location).toBe('Coffee Shop');
    // Body should contain the description lines, without hledger comments/postings
    expect(result.body).toContain('We talked about potatoes');
    expect(result.body).toContain('He mentioned wanting to start a garden');
    // Should not include the posting line
    expect(result.body).not.toContain('$-10');
  });
});

// ── Edge Cases ──────────────────────────────────────────────────────────────

describe('parseMarkdownEntry – edge cases', () => {
  it('handles entry with no frontmatter', () => {
    const entry = parseMarkdownEntry('Just some text without frontmatter');
    expect(entry.frontmatter.date).toBe('');
    expect(entry.frontmatter.contact).toBe('');
    expect(entry.body).toBe('Just some text without frontmatter');
  });

  it('handles entry with empty frontmatter', () => {
    const entry = parseMarkdownEntry(`---
---

Some body text.`);

    expect(entry.frontmatter.date).toBe('');
    expect(entry.body).toBe('Some body text.');
  });

  it('handles empty string', () => {
    const entry = parseMarkdownEntry('');
    expect(entry.frontmatter.date).toBe('');
    expect(entry.title).toBe('');
    expect(entry.body).toBe('');
  });

  it('handles Windows-style line endings (\\r\\n)', () => {
    const entry = parseMarkdownEntry('---\r\ndate: 2025-07-01\r\ncontact: John\r\nlocation: Office\r\n---\r\n\r\n# Title\r\n\r\nBody text.');
    expect(entry.frontmatter.date).toBe('2025-07-01');
    expect(entry.frontmatter.contact).toBe('John');
    expect(entry.title).toBe('Title');
  });

  it('preserves the raw text', () => {
    const raw = `---
date: 2025-07-01
contact: John
location: Office
---

# Meeting

Notes here.`;

    const entry = parseMarkdownEntry(raw);
    expect(entry.raw).toBe(raw);
  });

  it('handles colons in frontmatter values', () => {
    const entry = parseMarkdownEntry(`---
date: 2025-07-01
contact: John
location: Office
subject: RE: Meeting at 3:30 PM
---

Body.`);

    expect(entry.frontmatter.subject).toBe('RE: Meeting at 3:30 PM');
  });
});

// ── Realistic Entry Examples ────────────────────────────────────────────────

describe('realistic entry examples', () => {
  it('parses a phone call entry', () => {
    const entry = parseMarkdownEntry(`---
date: 2025-07-15
contact: Harold Hughes
location: Phone Call
duration: 25 minutes
tags: business, funding, follow-up
---

# Catalyst Labs funding update

Harold shared that the Series A is tracking well. He expects to close by end of August.

Key points:
- Lead investor confirmed at $2M
- Looking for one more strategic partner
- Wants to discuss board composition next week

**Action:** Send intro to potential strategic partner by Friday.`);

    expect(entry.frontmatter.contact).toBe('Harold Hughes');
    expect(entry.frontmatter.type).toBe('phone');
    expect(entry.frontmatter.duration).toBe('25 minutes');
    expect(entry.title).toBe('Catalyst Labs funding update');
    expect(entry.body).toContain('Series A is tracking well');
    expect(entry.body).toContain('**Action:**');
  });

  it('parses an email entry', () => {
    const entry = parseMarkdownEntry(`---
date: 2025-08-01
contact: Jasmine Browner
location: Email
from: jasmine@zealvc.co
subject: Deal flow for August
tags: vc, deal-flow
---

# August deal flow from Zeal VC

Jasmine shared 3 companies in the climate-tech space. Two look promising:

1. **SolarGrid** — distributed solar microgrids, pre-seed
2. **CarbonTrace** — supply chain carbon tracking, seed round

Will review decks this weekend.`);

    expect(entry.frontmatter.type).toBe('email');
    expect(entry.frontmatter.from).toBe('jasmine@zealvc.co');
    expect(entry.frontmatter.subject).toBe('Deal flow for August');
  });

  it('parses a meeting entry with multiple attendees', () => {
    const entry = parseMarkdownEntry(`---
date: 2025-07-20
contact: Mike Reynolds
location: Meeting
with: Sarah Chen, Alex Park, Lisa Wong
duration: 1 hour
tags: work, sprint-planning
---

# Sprint 14 planning

Team agreed on:
- Prioritize auth migration
- Defer analytics dashboard to Sprint 15
- Alex owns the performance audit`);

    expect(entry.frontmatter.with).toEqual(['Sarah Chen', 'Alex Park', 'Lisa Wong']);
    expect(entry.frontmatter.type).toBe('meeting');
  });
});
