/**
 * Markdown-based entry parser for WWLO PRM.
 *
 * Parses journal entries written in markdown with YAML frontmatter.
 * This replaces the hledger-style parser with a more intuitive format
 * that users already know.
 *
 * Entry format:
 *   ---
 *   date: 2025-07-01
 *   contact: John Smith
 *   location: Coffee Shop
 *   with: Sarah, Mike
 *   tags: work, catch-up
 *   ---
 *
 *   # Quick catch-up over coffee
 *
 *   Discussed Q3 plans. He's excited about the new project...
 *
 * This is a pure TypeScript module — no platform dependencies.
 */

import { generateSecureId } from './idUtils';

// ── Types ────────────────────────────────────────────────────────────────────

/** Recognized interaction channels */
export type InteractionType =
  | 'phone'
  | 'email'
  | 'text'
  | 'meeting'
  | 'event'
  | 'linkedin'
  | 'voicemail'
  | 'video'
  | 'in-person'
  | 'project'
  | 'reflection'
  | 'shower-thought'
  | 'journal'
  | 'other';

/** Structured frontmatter fields */
export interface EntryFrontmatter {
  /** Date of interaction (YYYY-MM-DD) */
  date: string;
  /** Primary contact this entry is about */
  contact: string;
  /** Location or communication channel */
  location: string;
  /** Interaction type, inferred from location or explicit */
  type?: InteractionType;
  /** Sender (for emails/messages) */
  from?: string;
  /** Recipient (for emails/messages) */
  to?: string;
  /** Other people involved (comma-separated in source) */
  with?: string[];
  /** Tags (comma-separated in source) */
  tags?: string[];
  /** Subject line (for emails) */
  subject?: string;
  /** Duration of interaction */
  duration?: string;
  /** Link to a photo or gallery for this entry */
  photo?: string;
}

/** A fully parsed markdown journal entry */
export interface MarkdownEntry {
  /** Parsed frontmatter fields */
  frontmatter: EntryFrontmatter;
  /** Entry title (from # heading), if present */
  title: string;
  /** The markdown body content (everything after frontmatter and title) */
  body: string;
  /** The complete raw text of the entry */
  raw: string;
}

// ── Interaction Type Inference ───────────────────────────────────────────────

const LOCATION_TYPE_MAP: Record<string, InteractionType> = {
  'phone': 'phone',
  'phone call': 'phone',
  'call': 'phone',
  'email': 'email',
  'text': 'text',
  'sms': 'text',
  'text/sms': 'text',
  'imessage': 'text',
  'meeting': 'meeting',
  'zoom': 'video',
  'teams': 'video',
  'google meet': 'video',
  'facetime': 'video',
  'video call': 'video',
  'video': 'video',
  'event': 'event',
  'conference': 'event',
  'linkedin': 'linkedin',
  'voicemail': 'voicemail',
  'in person': 'in-person',
  'in-person': 'in-person',
  'project': 'project',
  'reflection': 'reflection',
  'shower thought': 'shower-thought',
  'shower-thought': 'shower-thought',
  'journal': 'journal',
};

/**
 * Infer the interaction type from a location string.
 * Returns undefined if the location looks like a physical place.
 */
export function inferInteractionType(location: string): InteractionType | undefined {
  const lower = location.toLowerCase().trim();
  return LOCATION_TYPE_MAP[lower];
}

// ── Parser ──────────────────────────────────────────────────────────────────

/**
 * Parse YAML-ish frontmatter from between --- delimiters.
 * Handles simple key: value pairs, not full YAML spec.
 */
function parseFrontmatter(block: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = block.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '---') continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0) {
      const key = trimmed.substring(0, colonIdx).trim().toLowerCase();
      const value = trimmed.substring(colonIdx + 1).trim();
      if (value) {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * Split a comma-separated string into trimmed, non-empty parts.
 */
function splitList(value: string): string[] {
  // Strip YAML-style square brackets if present: [a, b] -> a, b
  let cleaned = value.trim();
  if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
    cleaned = cleaned.slice(1, -1);
  }
  // Also handle partial brackets from malformed input
  cleaned = cleaned.replace(/^\[|\]$/g, '');
  return cleaned
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Parse a markdown journal entry with YAML frontmatter.
 *
 * Accepts the format defined in template_entry.md:
 *   ---
 *   date: 2025-07-01
 *   contact: John Smith
 *   location: Phone Call
 *   ---
 *   # Catch-up call
 *   We discussed the project timeline...
 */
export function parseMarkdownEntry(raw: string): MarkdownEntry {
  const trimmed = raw.trim();

  let frontmatterBlock = '';
  let content = trimmed;

  // Extract frontmatter between --- delimiters
  if (trimmed.startsWith('---')) {
    const endIdx = trimmed.indexOf('---', 3);
    if (endIdx > 0) {
      frontmatterBlock = trimmed.substring(3, endIdx);
      content = trimmed.substring(endIdx + 3).trim();
    }
  }

  // Parse frontmatter fields
  const rawFm = parseFrontmatter(frontmatterBlock);

  const frontmatter: EntryFrontmatter = {
    date: rawFm.date || '',
    contact: rawFm.contact || '',
    location: rawFm.location || '',
    type: (rawFm.type as InteractionType) || inferInteractionType(rawFm.location || ''),
    from: rawFm.from || undefined,
    to: rawFm.to || undefined,
    with: rawFm.with ? splitList(rawFm.with) : undefined,
    tags: rawFm.tags ? splitList(rawFm.tags) : undefined,
    subject: rawFm.subject || undefined,
    duration: rawFm.duration || undefined,
    photo: rawFm.photo || undefined,
  };

  // Extract title from first # heading
  let title = '';
  let body = content;

  const titleMatch = content.match(/^#\s+(.+?)[\r\n]/);
  if (titleMatch) {
    title = titleMatch[1].trim();
    body = content.substring(titleMatch[0].length).trim();
  } else {
    // Also handle a heading at the very end (no newline after)
    const eofTitleMatch = content.match(/^#\s+(.+)$/);
    if (eofTitleMatch) {
      title = eofTitleMatch[1].trim();
      body = '';
    }
  }

  return { frontmatter, title, body, raw: trimmed };
}

// ── Formatter ───────────────────────────────────────────────────────────────

/**
 * Format a MarkdownEntry back into a markdown string with frontmatter.
 */
export function formatMarkdownEntry(entry: MarkdownEntry): string {
  const fm = entry.frontmatter;
  const lines: string[] = ['---'];

  // Required fields
  lines.push(`date: ${fm.date}`);
  lines.push(`contact: ${fm.contact}`);
  lines.push(`location: ${fm.location}`);

  // Optional fields — only include if present
  if (fm.type) lines.push(`type: ${fm.type}`);
  if (fm.from) lines.push(`from: ${fm.from}`);
  if (fm.to) lines.push(`to: ${fm.to}`);
  if (fm.with && fm.with.length > 0) lines.push(`with: ${fm.with.join(', ')}`);
  if (fm.tags && fm.tags.length > 0) lines.push(`tags: ${fm.tags.join(', ')}`);
  if (fm.subject) lines.push(`subject: ${fm.subject}`);
  if (fm.duration) lines.push(`duration: ${fm.duration}`);
  if (fm.photo) lines.push(`photo: ${fm.photo}`);

  lines.push('---');
  lines.push('');

  // Title
  if (entry.title) {
    lines.push(`# ${entry.title}`);
    lines.push('');
  }

  // Body
  if (entry.body) {
    lines.push(entry.body);
  }

  return lines.join('\n');
}

// ── Conversion: Markdown ↔ SampleEntry ──────────────────────────────────────

/**
 * Convert a MarkdownEntry to the app's SampleEntry shape.
 * This bridges the new markdown format with the existing data layer.
 */
export function markdownToSampleEntry(
  md: MarkdownEntry,
  id: string = generateSecureId(9)
): {
  id: string;
  entry_date: string;
  contact_name: string;
  location: string;
  raw_text: string;
  tags: string[];
} {
  return {
    id,
    entry_date: md.frontmatter.date,
    contact_name: md.frontmatter.contact,
    location: md.frontmatter.location,
    raw_text: md.raw,
    tags: md.frontmatter.tags || [],
  };
}

/**
 * Convert a SampleEntry raw_text back to a MarkdownEntry.
 * Handles both new markdown format and legacy hledger format.
 */
export function sampleEntryToMarkdown(entry: {
  entry_date: string;
  contact_name: string;
  location: string;
  raw_text: string;
  tags: string[];
}): MarkdownEntry {
  // If raw_text starts with ---, it's already markdown format
  if (entry.raw_text.trim().startsWith('---')) {
    return parseMarkdownEntry(entry.raw_text);
  }

  // Legacy hledger format → convert to markdown
  // Extract body from hledger: skip header line, strip indentation
  const lines = entry.raw_text.split(/\r?\n/);
  const bodyLines = lines.slice(1)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith(';') && !/^\w+:\w+\s+\$?[-\d,.]+$/.test(l));

  return {
    frontmatter: {
      date: entry.entry_date,
      contact: entry.contact_name,
      location: entry.location,
      tags: entry.tags.length > 0 ? entry.tags : undefined,
    },
    title: '',
    body: bodyLines.join('\n'),
    raw: entry.raw_text,
  };
}

// ── Tag Extraction ──────────────────────────────────────────────────────────

/**
 * Extract inline #hashtags from the markdown body, in addition to
 * any tags declared in frontmatter.
 */
export function extractAllTags(entry: MarkdownEntry): string[] {
  const fmTags = entry.frontmatter.tags || [];

  // Find #hashtags in body (but not in code blocks or headings)
  const hashtagPattern = /(?:^|\s)#([a-zA-Z][\w-]*)/g;
  const bodyTags: string[] = [];
  let match;
  while ((match = hashtagPattern.exec(entry.body)) !== null) {
    bodyTags.push(match[1].toLowerCase());
  }

  // Deduplicate
  const seen = new Set<string>();
  const all: string[] = [];
  for (const tag of [...fmTags, ...bodyTags]) {
    const lower = tag.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      all.push(lower);
    }
  }

  return all;
}
