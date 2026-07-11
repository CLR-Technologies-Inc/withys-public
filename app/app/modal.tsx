import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColors } from '@/lib/ThemeProvider';
import { useContacts, useTags, useAddEntry } from '@/lib/hooks';
import { formatMarkdownEntry, extractAllTags, parseMarkdownEntry } from '@/lib/markdownParser';
import type { MarkdownEntry, InteractionType } from '@/lib/markdownParser';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { parseAudioToMarkdown } from '@/lib/gemini';
import { useJournalStore } from '@/lib/store';

// ── Interaction Type Metadata ──────────────────────────────────────────────

const INTERACTION_ICONS: Record<InteractionType | 'default', string> = {
  'phone': 'phone',
  'email': 'envelope',
  'text': 'comment',
  'meeting': 'users',
  'event': 'calendar',
  'linkedin': 'linkedin',
  'voicemail': 'microphone',
  'video': 'video-camera',
  'in-person': 'map-marker',
  'project': 'folder',
  'reflection': 'lightbulb-o',
  'shower-thought': 'cloud',
  'journal': 'book',
  'other': 'ellipsis-h',
  'default': 'map-marker',
};

const INTERACTION_LABELS: Record<InteractionType, string> = {
  'phone': 'Phone Call',
  'email': 'Email',
  'text': 'Text / SMS',
  'meeting': 'Meeting',
  'event': 'Event',
  'linkedin': 'LinkedIn',
  'voicemail': 'Voicemail',
  'video': 'Video Call',
  'in-person': 'In Person',
  'project': 'Project',
  'reflection': 'Reflection',
  'shower-thought': 'Shower Thought',
  'journal': 'Journal',
  'other': 'Other',
};

export default function NewEntryModal() {
  const Colors = useColors();
  const styles = useStyles(Colors);
  const router = useRouter();
  const params = useLocalSearchParams<{
    prefillContact?: string;
    prefillType?: string;
    prefillLocation?: string;
    prefillDate?: string;
    prefillTitle?: string;
    prefillBody?: string;
  }>();
  const { data: contacts = [] } = useContacts();
  const { data: tags = [] } = useTags();
  const addEntryMutation = useAddEntry();
  const today = new Date().toISOString().split('T')[0];

  // ── Frontmatter form state (with prefill support) ──
  const [fmDate, setFmDate] = useState(params.prefillDate || today);
  const [fmContact, setFmContact] = useState(params.prefillContact || '');
  const [fmLocation, setFmLocation] = useState(params.prefillLocation || '');
  const [fmType, setFmType] = useState<InteractionType | ''>((params.prefillType as InteractionType) || '');
  const [fmFrom, setFmFrom] = useState('');
  const [fmTo, setFmTo] = useState('');
  const [fmWith, setFmWith] = useState('');
  const [fmTags, setFmTags] = useState('');
  const [fmSubject, setFmSubject] = useState('');
  const [fmDuration, setFmDuration] = useState('');
  const [fmPhoto, setFmPhoto] = useState('');
  const [fmTitle, setFmTitle] = useState(params.prefillTitle || '');
  const [bodyText, setBodyText] = useState(params.prefillBody || '');

  // Audio recording
  const [optionalExpanded, setOptionalExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Vault encryption state
  const vaultUnlocked = useJournalStore((s) => s.vaultUnlocked);
  const vaultConfigured = useJournalStore((s) => s.vaultConfigured);
  const [encryptOnSave, setEncryptOnSave] = useState(false);
  const [showEncryptHelp, setShowEncryptHelp] = useState(false);

  // Template overwrite confirmation
  const [showTemplateConfirm, setShowTemplateConfirm] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<{ title: string; body: string; tags: string; type?: InteractionType } | null>(null);

  // Contact auto-suggest
  const [contactFocused, setContactFocused] = useState(false);
  const contactSuggestions = fmContact.length >= 2 && contactFocused
    ? contacts.filter((c) => c.name.toLowerCase().includes(fmContact.toLowerCase())).slice(0, 5)
    : [];

  // Tag auto-suggest
  const [tagFocused, setTagFocused] = useState(false);
  const lastTag = fmTags.split(',').pop()?.trim() || '';
  const tagSuggestions = lastTag.length >= 1 && tagFocused
    ? tags.filter((t) => t.name.toLowerCase().includes(lastTag.toLowerCase())).slice(0, 5)
    : [];

  async function startRecording() {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) return;
      await recorder.record();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    if (!isRecording) return;
    setIsRecording(false);
    setIsProcessingAudio(true);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        const base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
        const result = await parseAudioToMarkdown(base64Audio);
        // Try to parse the AI output and populate the form
        const trimmed = result.trim();
        if (trimmed.startsWith('---')) {
          const parsed = parseMarkdownEntry(trimmed);
          if (parsed.frontmatter.date) setFmDate(parsed.frontmatter.date);
          if (parsed.frontmatter.contact) setFmContact(parsed.frontmatter.contact);
          if (parsed.frontmatter.location) setFmLocation(parsed.frontmatter.location);
          if (parsed.frontmatter.tags) setFmTags(parsed.frontmatter.tags.join(', '));
          if (parsed.title) setFmTitle(parsed.title);
          setBodyText(parsed.body);
        } else {
          setBodyText(trimmed);
        }
      }
    } catch (err) {
      console.error('Failed to parse audio', err);
    } finally {
      setIsProcessingAudio(false);
    }
  }

  const insertContact = (name: string) => {
    setFmContact(name);
    setContactFocused(false);
  };

  const insertTag = (name: string) => {
    const existing = fmTags.split(',').map((s) => s.trim()).filter(Boolean);
    // Replace the partial last tag with the full one
    existing.pop();
    existing.push(name);
    setFmTags(existing.join(', '));
  };

  // Types that represent a communication channel (location auto-fills)
  const CHANNEL_TYPES: InteractionType[] = ['phone', 'email', 'text', 'video', 'linkedin', 'voicemail'];

  const isChannelType = (type: InteractionType): boolean => CHANNEL_TYPES.includes(type);

  // Determine if the currently entered contact is a "Self" contact
  const isSelfContact = React.useMemo(() => {
    if (!fmContact.trim()) return false;
    if (fmContact.toLowerCase() === 'me') return true;
    const c = contacts.find(c => c.name.toLowerCase() === fmContact.toLowerCase());
    return c ? !!c.is_self : false;
  }, [fmContact, contacts]);

  const availableTypes: InteractionType[] = isSelfContact
    ? ['reflection', 'shower-thought', 'event', 'journal', 'project', 'other']
    : ['phone', 'email', 'text', 'meeting', 'event', 'video', 'linkedin', 'voicemail', 'in-person', 'project', 'other'];

  const handleTypeSelect = (type: InteractionType) => {
    if (fmType === type) {
      // Deselecting — clear type and location if it was auto-filled
      setFmType('');
      if (isChannelType(type) && fmLocation === INTERACTION_LABELS[type]) {
        setFmLocation('');
      }
    } else {
      setFmType(type);
      if (isChannelType(type)) {
        setFmLocation(INTERACTION_LABELS[type]);
      } else {
        // Non-channel type: only clear if it was previously auto-filled from another channel
        const previousWasChannel = fmType && isChannelType(fmType as InteractionType);
        if (previousWasChannel && fmLocation === INTERACTION_LABELS[fmType as InteractionType]) {
          setFmLocation('');
        }
      }
    }
  };

  const doApplyTemplate = (title: string, body: string, tags: string, type?: InteractionType) => {
    setFmTitle(title);
    setBodyText(body);
    setFmTags(tags);
    if (type) handleTypeSelect(type);
  };

  const applyTemplate = (title: string, body: string, tags: string, type?: InteractionType) => {
    // If user has typed content, confirm before overwriting
    if (bodyText.trim() || fmTitle.trim()) {
      setPendingTemplate({ title, body, tags, type });
      setShowTemplateConfirm(true);
    } else {
      doApplyTemplate(title, body, tags, type);
    }
  };

  const canSave = fmDate.trim().length > 0 && fmContact.trim().length > 0;

  const handleSave = () => {
    if (!canSave || addEntryMutation.isPending) return;

    const entry: MarkdownEntry = {
      frontmatter: {
        date: fmDate.trim(),
        contact: fmContact.trim(),
        location: fmLocation.trim(),
        type: (fmType as InteractionType) || undefined,
        from: fmFrom.trim() || undefined,
        to: fmTo.trim() || undefined,
        with: fmWith ? fmWith.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        tags: (() => {
          const arr = fmTags ? fmTags.split(',').map((s) => s.trim()).filter(Boolean) : [];
          const todayLocal = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
          if (fmDate.trim() > todayLocal && !arr.includes('to-do')) {
            arr.push('to-do');
          }
          return arr.length > 0 ? arr : undefined;
        })(),
        subject: fmSubject.trim() || undefined,
        duration: fmDuration.trim() || undefined,
        photo: fmPhoto.trim() || undefined,
      },
      title: fmTitle.trim(),
      body: bodyText.trim(),
      raw: '',
    };

    const rawText = formatMarkdownEntry(entry);
    const allTags = extractAllTags(parseMarkdownEntry(rawText));
    const id = String(Date.now());

    addEntryMutation.mutate(
      {
        entry: {
          id,
          entry_date: fmDate.trim(),
          contact_name: fmContact.trim(),
          location: fmLocation.trim(),
          raw_text: rawText,
          tags: allTags,
          source: 'manual',
          status: 'approved',
        },
        encryptOnSave: encryptOnSave && vaultUnlocked,
      },
      {
        onSuccess: () => {
          router.back();
        },
      }
    );
  };

  const isSaving = addEntryMutation.isPending;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Cancel">
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>New Entry</Text>
          <TouchableOpacity
            onPress={() => {
              if (!vaultConfigured) {
                setShowEncryptHelp(true);
              } else if (!vaultUnlocked) {
                setShowEncryptHelp(true);
              } else {
                setEncryptOnSave(!encryptOnSave);
              }
            }}
            onLongPress={() => setShowEncryptHelp(true)}
            style={[
              styles.lockBtn,
              encryptOnSave && vaultUnlocked && styles.lockBtnActive,
            ]}
            accessibilityRole="button"
            accessibilityLabel={encryptOnSave ? 'Encryption enabled' : 'Enable encryption'}
          >
            <FontAwesome
              name={encryptOnSave && vaultUnlocked ? 'lock' : 'unlock-alt'}
              size={13}
              color={
                encryptOnSave && vaultUnlocked
                  ? Colors.vaultAccent
                  : !vaultConfigured || !vaultUnlocked
                    ? Colors.textMuted
                    : Colors.secondaryAccent
              }
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          onPress={handleSave} 
          style={[styles.headerBtn, styles.saveBtn, (!canSave || isSaving) && styles.saveBtnDisabled]} 
          disabled={!canSave || isSaving} 
          accessibilityRole="button" 
          accessibilityLabel="Save Entry" 
          accessibilityState={{ disabled: !canSave || isSaving }}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={Colors.textPrimary} />
          ) : (
            <FontAwesome name="check" size={14} color={canSave ? Colors.textPrimary : Colors.textMuted} />
          )}
          <Text style={[styles.saveText, (!canSave || isSaving) && { color: Colors.textMuted }]}>
            {isSaving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Encryption help tooltip */}
      {showEncryptHelp && (
        <TouchableOpacity style={styles.encryptHelp} onPress={() => setShowEncryptHelp(false)} activeOpacity={0.95}>
          <View style={styles.encryptHelpCard}>
            <FontAwesome name="shield" size={16} color={Colors.vaultAccent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.encryptHelpTitle}>
                {!vaultConfigured
                  ? 'Vault Not Set Up'
                  : !vaultUnlocked
                    ? 'Vault Is Locked'
                    : encryptOnSave
                      ? 'Encryption Enabled'
                      : 'Encrypt This Entry?'}
              </Text>
              <Text style={styles.encryptHelpText}>
                {!vaultConfigured
                  ? 'Set up the Vault in Settings to encrypt entries with AES-256. Your passphrase never leaves this device.'
                  : !vaultUnlocked
                    ? 'Unlock the Vault in Settings to enable encryption. Entries cannot be encrypted while the vault is locked.'
                    : encryptOnSave
                      ? 'This entry will be saved encrypted. Only you can read it with your vault passphrase.'
                      : 'Tap the lock icon to encrypt this entry before saving. Encrypted entries are stored as opaque blobs — not searchable.'}
              </Text>
            </View>
            <FontAwesome name="times" size={14} color={Colors.textMuted} />
          </View>
        </TouchableOpacity>
      )}

      <ScrollView style={styles.scrollContainer} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">

        {/* ── Entry Details (Required) ── */}
        <View style={styles.fmSection}>
          <Text style={[styles.fmSectionTitle, { marginBottom: 12 }]}>Entry Details</Text>

          <View style={styles.fmRow}>
            <Text style={styles.fmLabel}>Date *</Text>
            <TextInput
              style={styles.fmInput}
              value={fmDate}
              onChangeText={setFmDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              accessibilityLabel="Date"
            />
          </View>

          <View style={styles.fmRow}>
            <Text style={styles.fmLabel}>Contact *</Text>
            <TextInput
              style={styles.fmInput}
              value={fmContact}
              onChangeText={setFmContact}
              onFocus={() => setContactFocused(true)}
              onBlur={() => setTimeout(() => setContactFocused(false), 200)}
              placeholder="Who is this entry about?"
              placeholderTextColor={Colors.textMuted}
              accessibilityLabel="Contact"
            />
            {contactSuggestions.length > 0 && (
              <View style={styles.suggestionsRow}>
                {contactSuggestions.map((c) => (
                  <TouchableOpacity key={c.id} style={styles.suggestionChip} onPress={() => insertContact(c.name)} accessibilityRole="button" accessibilityLabel={`Select contact: ${c.name}`}>
                    <Text style={styles.suggestionText}>{c.name}</Text>
                    <Text style={styles.suggestionMeta}>{c.relationship}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.fmRow}>
            <Text style={styles.fmLabel}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
              {availableTypes.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, fmType === t && styles.typeChipActive]}
                  onPress={() => handleTypeSelect(t)}
                  accessibilityRole="button"
                  accessibilityLabel={`Interaction type: ${INTERACTION_LABELS[t]}`}
                  accessibilityState={{ selected: fmType === t }}
                >
                  <FontAwesome name={INTERACTION_ICONS[t] as any} size={11} color={fmType === t ? Colors.textPrimary : Colors.textMuted} />
                  <Text style={[styles.typeChipText, fmType === t && styles.typeChipTextActive]}>{INTERACTION_LABELS[t]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.fmRow}>
            <Text style={styles.fmLabel}>Location *</Text>
            <TextInput
              style={styles.fmInput}
              value={fmLocation}
              onChangeText={setFmLocation}
              placeholder={fmType && isChannelType(fmType as InteractionType) ? 'Auto-filled from type' : 'Where did this happen?'}
              placeholderTextColor={Colors.textMuted}
              accessibilityLabel="Location"
            />
          </View>
        </View>

        {/* ── Optional Details (Collapsible) ── */}
        <View style={styles.fmSection}>
          <TouchableOpacity style={styles.fmSectionHeader} onPress={() => setOptionalExpanded(!optionalExpanded)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Toggle Optional Details">
            <Text style={styles.fmSectionTitle}>Optional Details</Text>
            <FontAwesome name={optionalExpanded ? 'chevron-up' : 'chevron-down'} size={12} color={Colors.textMuted} />
          </TouchableOpacity>

          {optionalExpanded && (
            <View>
              <View style={styles.fmRow}>
                <Text style={styles.fmLabel}>From</Text>
                <TextInput style={styles.fmInput} value={fmFrom} onChangeText={setFmFrom} placeholder="Sender (for email/messages)" placeholderTextColor={Colors.textMuted} accessibilityLabel="Sender" />
              </View>

              <View style={styles.fmRow}>
                <Text style={styles.fmLabel}>To</Text>
                <TextInput style={styles.fmInput} value={fmTo} onChangeText={setFmTo} placeholder="Recipient" placeholderTextColor={Colors.textMuted} accessibilityLabel="Recipient" />
              </View>

              <View style={styles.fmRow}>
                <Text style={styles.fmLabel}>With</Text>
                <TextInput style={styles.fmInput} value={fmWith} onChangeText={setFmWith} placeholder="Other people (comma-separated)" placeholderTextColor={Colors.textMuted} accessibilityLabel="Other people" />
              </View>

              <View style={styles.fmRow}>
                <Text style={styles.fmLabel}>Subject</Text>
                <TextInput style={styles.fmInput} value={fmSubject} onChangeText={setFmSubject} placeholder="Email subject, meeting topic" placeholderTextColor={Colors.textMuted} accessibilityLabel="Subject" />
              </View>

              <View style={styles.fmRow}>
                <Text style={styles.fmLabel}>Duration</Text>
                <TextInput style={styles.fmInput} value={fmDuration} onChangeText={setFmDuration} placeholder="e.g. 30 minutes, 1 hour" placeholderTextColor={Colors.textMuted} accessibilityLabel="Duration" />
              </View>

              <View style={styles.fmRow}>
                <Text style={styles.fmLabel}>Photo Link</Text>
                <TextInput style={styles.fmInput} value={fmPhoto} onChangeText={setFmPhoto} placeholder="URL to photo or gallery" placeholderTextColor={Colors.textMuted} accessibilityLabel="Photo Link" autoCapitalize="none" keyboardType="url" />
              </View>

              <View style={styles.fmRow}>
                <Text style={styles.fmLabel}>Tags</Text>
                <TextInput
                  style={styles.fmInput}
                  value={fmTags}
                  onChangeText={setFmTags}
                  onFocus={() => setTagFocused(true)}
                  onBlur={() => setTimeout(() => setTagFocused(false), 200)}
                  placeholder="work, catch-up, follow-up"
                  placeholderTextColor={Colors.textMuted}
                  accessibilityLabel="Tags"
                />
                {tagSuggestions.length > 0 && (
                  <View style={styles.suggestionsRow}>
                    {tagSuggestions.map((t) => (
                      <TouchableOpacity key={t.id} style={styles.suggestionChip} onPress={() => insertTag(t.name)} accessibilityRole="button" accessibilityLabel={`Select tag: ${t.name}`}>
                        <FontAwesome name="tag" size={10} color={Colors.textMuted} />
                        <Text style={styles.suggestionText}>{t.name}</Text>
                        <Text style={styles.suggestionMeta}>{t.entry_count}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* ── Entry Content ── */}
        <View style={styles.fmSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.fmSectionTitle}>Entry Content</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                style={styles.templateBtn}
                onPress={() => applyTemplate('Quick Catch-up', "We grabbed coffee and talked about life. Everything's going well.", 'catch-up', 'in-person')}
                accessibilityRole="button"
                accessibilityLabel="Apply Catch-up Template"
              >
                <FontAwesome name="coffee" size={10} color={Colors.secondaryAccent} />
                <Text style={styles.templateBtnText}>Catch-up</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.templateBtn}
                onPress={() => applyTemplate('Meeting Notes', "- Discussed: \n- Decided: \n- Next steps: ", 'work', 'meeting')}
                accessibilityRole="button"
                accessibilityLabel="Apply Meeting Template"
              >
                <FontAwesome name="briefcase" size={10} color={Colors.secondaryAccent} />
                <Text style={styles.templateBtnText}>Meeting</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fmRow}>
            <Text style={styles.fmLabel}>Title</Text>
            <TextInput
              style={styles.fmInput}
              value={fmTitle}
              onChangeText={setFmTitle}
              placeholder="Optional summary / title"
              placeholderTextColor={Colors.textMuted}
              accessibilityLabel="Entry Title"
            />
          </View>

          <View style={styles.fmRow}>
            <View style={styles.notesLabelRow}>
              <Text style={styles.fmLabel}>Notes</Text>
              <TouchableOpacity
                style={[styles.micBtn, isRecording ? styles.micBtnRecording : null]}
                onPress={isRecording ? stopRecording : startRecording}
                accessibilityRole="button"
                accessibilityLabel={isRecording ? "Stop Recording" : "Start Voice Recording"}
              >
                <FontAwesome name={isRecording ? 'stop' : 'microphone'} size={12} color={isRecording ? '#FFF' : Colors.textMuted} />
                {isProcessingAudio && <Text style={styles.processingDot}>…</Text>}
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.fmInput, styles.fmTextArea]}
              value={bodyText}
              onChangeText={setBodyText}
              placeholder="Write your journal entry here. Use markdown for rich formatting..."
              placeholderTextColor={Colors.textMuted}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Entry Notes"
            />
          </View>
        </View>
      </ScrollView>

      {/* Template overwrite confirmation */}
      <ConfirmDialog
        open={showTemplateConfirm}
        title="Replace current content?"
        body="This will replace your title, notes, and tags with the template."
        confirmLabel="Replace"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          if (pendingTemplate) {
            doApplyTemplate(pendingTemplate.title, pendingTemplate.body, pendingTemplate.tags, pendingTemplate.type);
          }
          setPendingTemplate(null);
          setShowTemplateConfirm(false);
        }}
        onCancel={() => {
          setPendingTemplate(null);
          setShowTemplateConfirm(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

function useStyles(Colors: any) {
  return useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContainer: { flex: 1 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerBtn: { padding: 8 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '600' },
  cancelText: { color: Colors.secondaryAccent, fontSize: 15 },
  lockBtn: { padding: 6, borderRadius: 6, borderWidth: 1, borderColor: Colors.borderSubtle },
  lockBtnActive: { borderColor: Colors.vaultAccent, backgroundColor: 'rgba(168, 85, 247, 0.12)' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryAccent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  saveBtnDisabled: { backgroundColor: 'rgba(15, 77, 146, 0.3)' },

  // Encryption help
  encryptHelp: { paddingHorizontal: 16, paddingTop: 8 },
  encryptHelpCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(168, 85, 247, 0.08)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.2)' },
  encryptHelpTitle: { color: Colors.vaultAccent, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  encryptHelpText: { color: Colors.textSecondary, fontSize: 12, lineHeight: 17 },
  saveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  // Suggestions
  suggestionsRow: { flexDirection: 'row', paddingTop: 8, gap: 6, flexWrap: 'wrap' },
  suggestionChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceCard, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.primaryAccent, gap: 6 },
  suggestionText: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  suggestionMeta: { color: Colors.textMuted, fontSize: 11, textTransform: 'capitalize' },

  // Form sections
  fmSection: { marginHorizontal: 16, marginTop: 20, backgroundColor: Colors.surfaceCard, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border },
  fmSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  fmSectionTitle: { color: Colors.secondaryAccent, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  fmRow: { marginBottom: 14 },
  fmLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  fmInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: Colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: Colors.borderSubtle },
  fmTextArea: { minHeight: 180, textAlignVertical: 'top', lineHeight: 22 },

  // Notes label row (with mic button)
  notesLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  micBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceCard, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border, gap: 3 },
  micBtnRecording: { backgroundColor: '#FF4444', borderColor: '#FF0000' },
  processingDot: { color: Colors.textMuted, fontSize: 10 },

  // Type selector
  typeScroll: { marginTop: 4 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginRight: 6, borderWidth: 1, borderColor: Colors.borderSubtle },
  typeChipActive: { backgroundColor: Colors.primaryAccent, borderColor: Colors.primaryAccent },
  typeChipText: { color: Colors.textMuted, fontSize: 12, fontWeight: '500' },
  typeChipTextActive: { color: '#FFFFFF' },

  templateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(15, 77, 146, 0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(15, 77, 146, 0.3)' },
  templateBtnText: { color: Colors.secondaryAccent, fontSize: 10, fontWeight: '600' },
  }), [Colors]);
}
