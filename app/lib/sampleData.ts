/**
 * Sample data for development and demo purposes.
 * Provides realistic journal entries so the app looks populated on first run.
 * Enhanced with extended contact fields (Phase 6) and multi-month data.
 */

import type { TargetLevel } from './sentiment';

export type EntrySource = 'manual' | 'email' | 'sms' | 'telegram' | 'whatsapp' | 'imessage' | 'share';
export type EntryStatus = 'approved' | 'pending' | 'rejected';

export interface SampleEntry {
  id: string;
  entry_date: string;
  contact_name: string;
  location: string;
  raw_text: string;
  tags: string[];
  source: EntrySource;
  status: EntryStatus;
}

export interface SampleContact {
  id: string;
  name: string;
  nickname?: string;
  relationship: string;
  entry_count: number;
  last_entry: string | null;
  emails?: { address: string; tag: string; is_preferred: boolean }[];
  phone?: string;
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  notes?: string;
  is_self?: boolean;
  targetLevel: TargetLevel;
  significant_other?: string;
  significant_other_relationship?: string;
  birthday?: string;
  children?: string;
  pets?: string;
  pet_status?: string;
  how_we_met?: string;
  dietary_preferences?: string;
  relationship_tags?: { category: string; value: string }[];
  is_archived?: boolean;
  preferences?: { category: string; value: string }[];
}

export interface SampleTag {
  id: string;
  name: string;
  entry_count: number;
}

export const SAMPLE_ENTRIES: SampleEntry[] = [];

export const SAMPLE_CONTACTS: SampleContact[] = [];

export const SAMPLE_TAGS: SampleTag[] = [];

