/**
 * hledger-style entry parser for WWLO PRM.
 *
 * Converts raw journal text into structured objects and back.
 * This is a pure TypeScript module — no platform dependencies.
 */

// --- Types ---

export interface ParsedTag {
  name: string;   // lowercased
  value?: string;
}

export interface ParsedLine {
  type: 'description' | 'posting' | 'comment';
  content: string;
  account?: string;
  amount?: number;
  currency?: string;
  tags?: ParsedTag[];
}

export interface ParsedEntry {
  date: string;
  status?: string;
  contact: string;
  location?: string;
  lines: ParsedLine[];
  raw: string;
}

// --- Parser ---

/**
 * Parse inline tags from a line fragment after a semicolon.
 * Tags look like: ; tag:value, othertag:othervalue
 */
function parseTags(fragment: string): ParsedTag[] {
  const tags: ParsedTag[] = [];
  const parts = fragment.split(',').map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx > 0) {
      tags.push({
        name: part.substring(0, colonIdx).trim().toLowerCase(),
        value: part.substring(colonIdx + 1).trim() || undefined,
      });
    } else if (part.length > 0) {
      tags.push({ name: part.trim().toLowerCase() });
    }
  }
  return tags;
}

/**
 * Parse a single hledger-style entry block.
 *
 * Format:
 *   YYYY-MM-DD [status] Contact [| Location]
 *       Description text  ; tag:value
 *       account:sub    $amount
 */
export function parseEntry(raw: string): ParsedEntry {
  const trimmed = raw.trim();
  const lineStrings = trimmed.split(/\r?\n/);

  // --- Header line ---
  const headerLine = lineStrings[0] || '';

  // Extract date (YYYY-MM-DD)
  const dateMatch = headerLine.match(/^(\d{4}-\d{2}-\d{2})/);
  const date = dateMatch ? dateMatch[1] : '';

  let rest = headerLine.substring(date.length).trim();

  // Optional status character (single non-alpha char like * or !)
  let status: string | undefined;
  if (rest.length > 0 && /^[*!?]/.test(rest)) {
    status = rest[0];
    rest = rest.substring(1).trim();
  }

  // Contact | Location
  let contact = rest;
  let location: string | undefined;
  const pipeIdx = rest.indexOf('|');
  if (pipeIdx >= 0) {
    contact = rest.substring(0, pipeIdx).trim();
    location = rest.substring(pipeIdx + 1).trim() || undefined;
  }

  // --- Body lines ---
  const lines: ParsedLine[] = [];
  for (let i = 1; i < lineStrings.length; i++) {
    const line = lineStrings[i];
    const stripped = line.trim();
    if (!stripped) continue;

    // Check for standalone comment (starts with ;)
    if (stripped.startsWith(';')) {
      const commentContent = stripped.substring(1).trim();
      const tags = parseTags(commentContent);
      lines.push({
        type: 'comment',
        content: commentContent,
        tags: tags.length > 0 ? tags : undefined,
      });
      continue;
    }

    // Check for posting: indented line with account and optional amount
    // Pattern: account:sub    $amount  or  account:sub    amount
    const postingMatch = stripped.match(
      /^([\w:.\-/]+(?::[\w:.\-/]+))\s+(\$?)([-\d,.]+)\s*$/
    );
    if (postingMatch) {
      const account = postingMatch[1];
      const currencySign = postingMatch[2];
      const amountStr = postingMatch[3].replace(/,/g, '');
      lines.push({
        type: 'posting',
        content: stripped,
        account,
        amount: parseFloat(amountStr),
        currency: currencySign || '$',
      });
      continue;
    }

    // Otherwise it's a description line, possibly with inline tags
    let content = stripped;
    let tags: ParsedTag[] | undefined;
    const semiIdx = stripped.indexOf(';');
    if (semiIdx >= 0) {
      content = stripped.substring(0, semiIdx).trim();
      tags = parseTags(stripped.substring(semiIdx + 1));
      if (tags.length === 0) tags = undefined;
    }

    lines.push({
      type: 'description',
      content,
      tags,
    });
  }

  return { date, status, contact, location, lines, raw: trimmed };
}

/**
 * Format a ParsedEntry back into hledger-style text.
 */
export function formatEntry(entry: ParsedEntry): string {
  let header = entry.date;
  if (entry.status) header += ` ${entry.status}`;
  header += ` ${entry.contact}`;
  if (entry.location) header += ` | ${entry.location}`;

  const bodyLines = entry.lines.map((line) => {
    if (line.type === 'comment') {
      const tagStr = line.tags
        ? line.tags.map((t) => (t.value ? `${t.name}:${t.value}` : t.name)).join(', ')
        : line.content;
      return `    ; ${tagStr}`;
    }
    if (line.type === 'posting') {
      const amt = `${line.currency || '$'}${line.amount}`;
      return `    ${line.account}            ${amt}`;
    }
    // description
    let desc = `    ${line.content}`;
    if (line.tags && line.tags.length > 0) {
      const tagStr = line.tags.map((t) => (t.value ? `${t.name}:${t.value}` : t.name)).join(', ');
      desc += `  ; ${tagStr}`;
    }
    return desc;
  });

  return [header, ...bodyLines].join('\n');
}

/**
 * Extract all unique tag names from an entry.
 */
export function extractTags(entry: ParsedEntry): ParsedTag[] {
  const seen = new Set<string>();
  const tags: ParsedTag[] = [];
  for (const line of entry.lines) {
    if (line.tags) {
      for (const tag of line.tags) {
        if (!seen.has(tag.name)) {
          seen.add(tag.name);
          tags.push(tag);
        }
      }
    }
  }
  return tags;
}
