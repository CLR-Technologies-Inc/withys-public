import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColors } from '@/lib/ThemeProvider';
// @ts-ignore — JSON import for build-time version
import appJson from '../app.json';

// ── Example Entry ────────────────────────────────────────────────────────────

const EXAMPLE_ENTRY = `---
date: 2026-05-10
contact: Sarah Chen
location: Riverdale Coffee House
type: in-person
from:
to:
with: Mike Torres, Lisa Park
tags: catch-up, startup, follow-up
subject: Q3 planning and new venture
duration: 1.5 hours
photo: https://photos.app/shared/abc123
---

# Catch-up over coffee — Q3 planning

Great energy today. Sarah is excited about the new logistics
startup she's been sketching out. She asked if I'd be open to
an advisory role — need to think about bandwidth.

Mike brought up the conference in September. We should
coordinate travel. Lisa mentioned she knows the keynote speaker
and could get us backstage passes. #networking

**Action items:**
- Send Sarah the pitch deck template I used last year
- Book flights for the September conference
- Intro Lisa to @David-Kim for the panel discussion`;

// ── Help Sections ────────────────────────────────────────────────────────────

interface HelpSection {
  title: string;
  icon: string;
  content: string;
}

const HELP_SECTIONS: HelpSection[] = [
  {
    title: 'What is WWLO PRM?',
    icon: 'book',
    content:
      'A personal relationship management tool for tracking interactions with the people in your life. ' +
      'Each entry records who you met, where, when, and what you discussed \u2014 building a searchable history of your relationships.',
  },
  {
    title: 'Entry Format',
    icon: 'file-text-o',
    content:
      'Entries use Markdown with YAML frontmatter. The frontmatter block (between --- lines) holds structured metadata. ' +
      'Below it, a # heading serves as the title, followed by your freeform notes.\n\n' +
      'Required fields: date, contact, location.\n' +
      'Optional fields: type, from, to, with, tags, subject, duration, photo.',
  },
  {
    title: 'Interaction Types',
    icon: 'exchange',
    content:
      'phone \u00b7 email \u00b7 text \u00b7 meeting \u00b7 event \u00b7 video \u00b7 linkedin \u00b7 voicemail \u00b7 in-person \u00b7 project \u00b7 other\n\n' +
      'Self-contacts (your own journal) get: reflection \u00b7 shower-thought \u00b7 journal \u00b7 event \u00b7 project \u00b7 other',
  },
  {
    title: 'Tags & Search',
    icon: 'tag',
    content:
      'Add tags in frontmatter (tags: work, catch-up) or inline with #hashtags in the body. ' +
      'Tags auto-populate the Categories tab and can be used to filter the journal.\n\n' +
      'Use @mentions in the body to link other contacts (e.g., @David-Kim). These appear in the Social Graph.',
  },
  {
    title: 'Vault Encryption',
    icon: 'shield',
    content:
      'Protect sensitive data with AES-256-GCM encryption. Set up a passphrase in Settings > Vault.\n\n' +
      'Entries: Tap the lock icon next to "New Entry" to encrypt before saving. Encrypted entries are stored as opaque blobs — not searchable, not readable by AI.\n\n' +
      'Contact Notes: In the contact edit screen, tap "Encrypt" next to the Notes field. Only the notes text is encrypted — name, relationship, and other fields stay searchable.\n\n' +
      'Note: Sentiment analysis, AI features, and search cannot process encrypted entries. The trade-off for vault security is that these entries are invisible to analytics.\n\n' +
      'Your passphrase is never stored — only a verification hash. If you forget it, encrypted data cannot be recovered.\n\n' +
      'Tip: The lock icon appears grey when the vault is locked. Unlock it in Settings first.',
  },
  {
    title: 'Importing Data',
    icon: 'upload',
    content:
      'Settings > Import: paste markdown entries separated by blank lines.\n\n' +
      'Email ingestion: drop .eml or .msg files into the mailprocess/requested/ folder. ' +
      'Markdown notes go in the same folder. The processor extracts contacts and creates pending entries for review.',
  },
  {
    title: 'Tips',
    icon: 'lightbulb-o',
    content:
      '\u2022 Use the voice recorder (microphone icon) to dictate entries \u2014 AI transcribes to markdown.\n' +
      '\u2022 Template buttons (Catch-up, Meeting) pre-fill common entry patterns.\n' +
      '\u2022 Set target interaction levels per contact to track when relationships need attention.\n' +
      '\u2022 The Social Graph visualizes connections between your contacts through shared entries and @mentions.',
  },
  {
    title: 'AI Features & Privacy',
    icon: 'magic',
    content:
      'WWLO PRM uses AI to enhance features like sentiment analysis and transcription. You can opt out at any time in Settings.\n\n' +
      'Privacy Policy: For end-to-end encrypted entries, even with AI features turned on, you must explicitly opt in to have those entries read or processed by AI. Your private vault data stays on your device by default.',
  },
  {
    title: 'Simple & Advanced Mode',
    icon: 'sliders',
    content:
      'Toggle between Simple and Advanced mode in Settings > Appearance.\n\n' +
      'Simple Mode hides the Categories, Trends, and Graph tabs for a streamlined experience. The Home tab is labeled "Home".\n\n' +
      'Advanced Mode shows all tabs and renames the Home tab to "Dashboard" with an effort tracking meter.',
  },
  {
    title: 'Effort Meter',
    icon: 'tachometer',
    content:
      'The Dashboard (Advanced mode) shows a Monthly Effort card comparing your estimated interactions against actual entries.\n\n' +
      'Estimated effort is calculated from each contact\'s target interaction level (e.g., a "weekly" contact = ~4 interactions/month).\n\n' +
      'The progress bar turns green (≥80%), amber (≥40%), or red (<40%) to show how you\'re tracking.',
  },
  {
    title: 'Billing & Usage',
    icon: 'credit-card',
    content:
      'Check your current usage and next month\'s estimated bill in Settings > Billing & Usage. You can access the detailed usage report from there.\n\n' +
      'The estimate includes a base sync fee plus usage charges for entries and contacts. If you enable Offline Mode, cloud sync is paused and you will not incur usage charges.',
  },
  {
    title: 'Your Data Responsibility',
    icon: 'exclamation-triangle',
    content:
      'WWLO PRM is a personal relationship journal \u2014 not a secure vault for regulated data.\n\n' +
      '\u26A0\uFE0F Avoid storing in plain-text entries: Social Security numbers, medical or health records, bank account numbers, tax information, or legal case details.\n\n' +
      'If you need to record sensitive information, always use the Vault encryption feature (Settings > Vault). Encrypted entries are stored as opaque blobs that cannot be read even by CLR Technologies.\n\n' +
      'Remember: you are responsible for any information you record about other people. Respect their privacy and applicable laws in your jurisdiction.',
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function AboutScreen() {
  const Colors = useColors();
  const styles = useStyles(Colors);

  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [showExample, setShowExample] = useState(false);

  const toggleSection = (index: number) => {
    setExpandedSection(expandedSection === index ? null : index);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.iconCircle}>
          <FontAwesome name="book" size={28} color={Colors.secondaryAccent} />
        </View>
        <Text style={styles.heroTitle}>WWLO PRM</Text>
        <Text style={styles.heroVersion}>v{appJson.expo.version}</Text>
        <Text style={styles.heroTagline}>
          Personal Relationship Management
        </Text>
      </View>

      {/* Example Entry */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.exampleHeader}
          onPress={() => setShowExample(!showExample)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Toggle example entry"
        >
          <View style={styles.exampleHeaderLeft}>
            <FontAwesome name="code" size={14} color={Colors.secondaryAccent} />
            <Text style={styles.exampleHeaderText}>Example Entry</Text>
          </View>
          <FontAwesome
            name={showExample ? 'chevron-up' : 'chevron-down'}
            size={12}
            color={Colors.textMuted}
          />
        </TouchableOpacity>

        {showExample && (
          <View style={styles.codeBlock}>
            <Text style={styles.codeText} selectable>
              {EXAMPLE_ENTRY}
            </Text>
          </View>
        )}

        {!showExample && (
          <Text style={styles.exampleHint}>
            Tap to see a fully featured markdown entry with all frontmatter fields.
          </Text>
        )}
      </View>

      {/* Help Sections */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>HELP</Text>
        {HELP_SECTIONS.map((section, i) => (
          <View key={i}>
            <TouchableOpacity
              style={[
                styles.helpRow,
                i === 0 && styles.helpRowFirst,
                i === HELP_SECTIONS.length - 1 && !expandedSection && styles.helpRowLast,
              ]}
              onPress={() => toggleSection(i)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Help: ${section.title}`}
            >
              <FontAwesome
                name={section.icon as any}
                size={15}
                color={Colors.secondaryAccent}
                style={styles.helpIcon}
              />
              <Text style={styles.helpTitle}>{section.title}</Text>
              <FontAwesome
                name={expandedSection === i ? 'chevron-up' : 'chevron-down'}
                size={11}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
            {expandedSection === i && (
              <View style={styles.helpContent}>
                <Text style={styles.helpText}>{section.content}</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Built with Expo \u00b7 Local Storage \u00b7 Tauri
        </Text>
        <Text style={styles.footerMuted}>
          \u00a9 2026 CLRTech \u00b7 Open Source
        </Text>
      </View>
    </ScrollView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

function useStyles(Colors: any) {
  return React.useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 20, paddingBottom: 40 },

    // Hero
    hero: {
      alignItems: 'center',
      paddingVertical: 28,
      gap: 6,
    },
    iconCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: Colors.primaryAccent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: Colors.textPrimary,
    },
    heroVersion: {
      fontSize: 13,
      color: Colors.secondaryAccent,
      fontWeight: '600',
    },
    heroTagline: {
      fontSize: 14,
      color: Colors.textMuted,
      marginTop: 2,
    },

    // Sections
    section: {
      marginTop: 20,
    },
    sectionLabel: {
      color: Colors.secondaryAccent,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      marginBottom: 8,
      marginLeft: 4,
    },

    // Example entry
    exampleHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: Colors.surfaceCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: 14,
    },
    exampleHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    exampleHeaderText: {
      color: Colors.textPrimary,
      fontSize: 15,
      fontWeight: '600',
    },
    exampleHint: {
      color: Colors.textMuted,
      fontSize: 12,
      marginTop: 6,
      marginLeft: 4,
    },
    codeBlock: {
      backgroundColor: 'rgba(15, 77, 146, 0.08)',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: 14,
      marginTop: 8,
    },
    codeText: {
      color: Colors.textSecondary,
      fontSize: 12,
      fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
      lineHeight: 18,
    },

    // Help accordion
    helpRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.surfaceCard,
      padding: 14,
      borderWidth: 1,
      borderColor: Colors.border,
      borderBottomWidth: 0,
    },
    helpRowFirst: {
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    },
    helpRowLast: {
      borderBottomWidth: 1,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
    },
    helpIcon: {
      width: 24,
    },
    helpTitle: {
      flex: 1,
      color: Colors.textPrimary,
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 8,
    },
    helpContent: {
      backgroundColor: 'rgba(15, 77, 146, 0.06)',
      padding: 14,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: Colors.border,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
    },
    helpText: {
      color: Colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
    },

    // Footer
    footer: {
      alignItems: 'center',
      paddingVertical: 28,
      gap: 4,
    },
    footerText: {
      color: Colors.textMuted,
      fontSize: 12,
    },
    footerMuted: {
      color: 'rgba(255,255,255,0.25)',
      fontSize: 11,
    },
  }), [Colors]);
}
