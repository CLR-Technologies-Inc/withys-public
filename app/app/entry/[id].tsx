import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColors } from '@/lib/ThemeProvider';
import { useJournalStore } from '@/lib/store';
import { useEntries, useContacts, useTags, useUpdateEntry, useDeleteEntry, useToggleEntryVault, queryKeys } from '@/lib/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { parseMarkdownEntry, formatMarkdownEntry, inferInteractionType, extractAllTags } from '@/lib/markdownParser';
import type { InteractionType, MarkdownEntry } from '@/lib/markdownParser';
import { isEncryptedEntry, encrypt, serializeEncrypted } from '@/lib/vault';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/lib/ToastProvider';
import { openSafeExternalURL } from '@/lib/urlUtils';

// ── Interaction Type Metadata ─────────────────────────────────────────────

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

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const Colors = useColors();
  const styles = useMemo(() => useStyles(Colors), [Colors]);
  const router = useRouter();
  const { data: entries = [] } = useEntries();
  const { data: contacts = [] } = useContacts();
  const updateEntryMutation = useUpdateEntry();
  const deleteEntryMutation = useDeleteEntry();
  const toggleVaultMutation = useToggleEntryVault();
  const { toggleEntryVault, decryptEntry, vaultUnlocked, vaultPassphrase } = useJournalStore();
  const entry = entries.find((e) => e.id === id);
  const [isEditing, setIsEditing] = useState(false);
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [isMasked, setIsMasked] = useState(false);
  const [isTogglingVault, setIsTogglingVault] = useState(false);
  const queryClient = useQueryClient();

  // ── Edit state for frontmatter form ──
  const [editDate, setEditDate] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editType, setEditType] = useState<InteractionType | ''>('');
  const [editFrom, setEditFrom] = useState('');
  const [editTo, setEditTo] = useState('');
  const [editWith, setEditWith] = useState('');
  const [editTags, setEditTags] = useState('');
  const [tagFocused, setTagFocused] = useState(false);
  const [contactFocused, setContactFocused] = useState(false);


  const { data: allAvailableTags = [] } = useTags();

  const lastTag = useMemo(() => {
    const parts = editTags.split(',');
    return parts[parts.length - 1].trim().toLowerCase();
  }, [editTags]);

  const tagSuggestions = lastTag.length >= 1 && tagFocused
    ? allAvailableTags.filter(t => t.name.toLowerCase().includes(lastTag)).slice(0, 10)
    : [];

  const contactSuggestions = editContact.trim().length >= 1 && contactFocused
    ? contacts.filter(c => c.name.toLowerCase().includes(editContact.toLowerCase())).slice(0, 5)
    : [];

  const insertTag = (name: string) => {
    const existing = editTags.split(',').map((s) => s.trim()).filter(Boolean);
    existing.pop();
    existing.push(name);
    setEditTags(existing.join(', '));
  };

  const insertContact = (name: string) => {
    setEditContact(name);
    setContactFocused(false);
  };
  const [editSubject, setEditSubject] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [optionalExpanded, setOptionalExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const toast = useToast();

  // Determine if the currently entered contact is a "Self" contact
  const isSelfContact = React.useMemo(() => {
    if (!editContact.trim()) return false;
    if (editContact.toLowerCase() === 'me') return true;
    const c = contacts.find(c => c.name.toLowerCase() === editContact.toLowerCase());
    return c ? !!c.is_self : false;
  }, [editContact, contacts]);

  const availableTypes: InteractionType[] = isSelfContact
    ? ['reflection', 'shower-thought', 'event', 'journal', 'project', 'other']
    : ['phone', 'email', 'text', 'meeting', 'event', 'video', 'linkedin', 'voicemail', 'in-person', 'project', 'other'];

  const encrypted = entry ? isEncryptedEntry(entry.raw_text) : false;

  // Auto-decrypt when vault is unlocked
  useEffect(() => {
    if (encrypted && vaultUnlocked && entry) {
      setIsDecrypting(true);
      decryptEntry(entry.id)
        .then((text) => { setDecryptedText(text); setVaultError(null); })
        .catch(() => setVaultError('Decryption failed'))
        .finally(() => setIsDecrypting(false));
    } else if (!encrypted && entry) {
      setDecryptedText(null);
    }
  }, [encrypted, vaultUnlocked, entry?.id]);

  // Use decrypted text for display if available, otherwise raw
  const displayText = encrypted ? (decryptedText || entry?.raw_text || '') : (entry?.raw_text || '');
  const canParse = !encrypted || decryptedText !== null;

  // Parse the entry (supports both markdown frontmatter and legacy hledger)
  const parsed: MarkdownEntry | null = useMemo(() => {
    if (!canParse || !displayText || isEncryptedEntry(displayText)) return null;
    try {
      return parseMarkdownEntry(displayText);
    } catch {
      return null;
    }
  }, [displayText, canParse]);

  const interactionType = parsed?.frontmatter.type || inferInteractionType(parsed?.frontmatter.location || '');
  const allTags = parsed ? extractAllTags(parsed) : [];

  // Populate edit fields from parsed entry

  const startEditing = () => {
    if (!parsed) return;
    const fm = parsed.frontmatter;
    setEditDate(fm.date);
    setEditContact(fm.contact);
    setEditLocation(fm.location);
    setEditType(fm.type || '');
    setEditFrom(fm.from || '');
    setEditTo(fm.to || '');
    setEditWith(fm.with?.join(', ') || '');
    setEditTags(fm.tags?.join(', ') || '');
    setEditSubject(fm.subject || '');
    setEditDuration(fm.duration || '');
    setEditPhoto(fm.photo || '');
    setEditTitle(parsed.title);
    setEditBody(parsed.body);
    setIsEditing(true);
  };

  const canSave = Boolean(editDate && editContact && editLocation);

  const handleSave = async () => {
    if (!canSave) return;

    const updated: MarkdownEntry = {
      frontmatter: {
        date: editDate,
        contact: editContact,
        location: editLocation,
        type: (editType as InteractionType) || undefined,
        from: editFrom || undefined,
        to: editTo || undefined,
        with: editWith ? editWith.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        tags: (() => {
          const arr = editTags ? editTags.split(',').map((s) => s.trim()).filter(Boolean) : [];
          const todayLocal = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
          if (editDate.trim() > todayLocal && !arr.includes('to-do')) {
            arr.push('to-do');
          }
          return arr.length > 0 ? arr : undefined;
        })(),
        subject: editSubject || undefined,
        duration: editDuration || undefined,
        photo: editPhoto || undefined,
      },
      title: editTitle,
      body: editBody,
      raw: '',
    };
    let rawText = formatMarkdownEntry(updated);
    
    // Re-encrypt if it was previously encrypted
    if (encrypted) {
      if (!vaultPassphrase) {
        setVaultError('Vault must be unlocked to save edits to an encrypted entry.');
        return;
      }
      setIsTogglingVault(true);
      try {
        const payload = await encrypt(rawText, vaultPassphrase);
        rawText = serializeEncrypted(payload);
      } catch (e: any) {
        setVaultError('Failed to encrypt updated entry: ' + e.message);
        setIsTogglingVault(false);
        return;
      }
      setIsTogglingVault(false);
    }
    
    updateEntryMutation.mutate({ id: entry!.id, raw_text: rawText }, {
      onSuccess: () => {
        if (encrypted) {
          // Keep decrypted view up to date with new edits
          setDecryptedText(formatMarkdownEntry(updated));
        }
      }
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    if (!entry) return;
    deleteEntryMutation.mutate(entry.id);
    toast.push({ kind: 'success', message: 'Entry deleted.' });
    router.back();
  };

  const handleToggleVault = async () => {
    if (!entry) return;
    if (!vaultUnlocked) {
      setVaultError('Unlock vault in Settings first');
      return;
    }
    try {
      setIsTogglingVault(true);
      await toggleVaultMutation.mutateAsync({ id: entry.id, currentRawText: entry.raw_text });
      setVaultError(null);
      const updated = useJournalStore.getState().entries.find(e => e.id === entry.id);
      if (updated && isEncryptedEntry(updated.raw_text)) {
        setIsDecrypting(true);
        const text = await decryptEntry(entry.id);
        setDecryptedText(text);
        setIsDecrypting(false);
      } else {
        setDecryptedText(null);
      }
    } catch (e: any) {
      setVaultError(e.message || 'Vault operation failed');
    } finally {
      setIsTogglingVault(false);
    }
  };

  const headerOptions = {
    headerBackVisible: true,
    headerLeft: ({ canGoBack }: { canGoBack?: boolean }) => {
      const showBack = canGoBack || router.canGoBack();
      return (
        <TouchableOpacity 
          onPress={() => showBack ? router.back() : router.replace('/(tabs)/journal' as any)} 
          style={{ padding: 8, paddingRight: 16, marginLeft: Platform.OS === 'web' ? 0 : -8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <FontAwesome name="chevron-left" size={18} color={Colors.textPrimary} />
            <Text style={{ color: Colors.textPrimary, fontSize: 16, fontWeight: '500' }}>Back</Text>
          </View>
        </TouchableOpacity>
      );
    }
  };

  if (!entry) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={headerOptions} />
        <Text style={styles.notFound}>Entry not found</Text>
      </View>
    );
  }

  // ── Edit Mode ────────────────────────────────────────────────────────────

  if (isEditing) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Stack.Screen options={headerOptions} />
        <View style={styles.editHeader}>
          <TouchableOpacity onPress={() => setIsEditing(false)} accessibilityRole="button" accessibilityLabel="Cancel">
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.editHeaderTitle}>Edit Entry</Text>
          <TouchableOpacity
            style={[styles.saveBtn, (!canSave || updateEntryMutation.isPending) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave || updateEntryMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Save Entry"
            accessibilityState={{ disabled: !canSave || updateEntryMutation.isPending }}
          >
            {updateEntryMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.textPrimary} />
            ) : (
              <FontAwesome name="check" size={14} color={Colors.textPrimary} />
            )}
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.editorScroll} contentContainerStyle={{ paddingBottom: 150 }} keyboardShouldPersistTaps="handled">
          {/* ── Frontmatter Form ── */}
          <View style={styles.fmSection}>
            <Text style={[styles.fmSectionTitle, { marginBottom: 12 }]}>Entry Details</Text>

            <View style={styles.fmRow}>
              <Text style={styles.fmLabel}>Date *</Text>
              <TextInput style={styles.fmInput} value={editDate} onChangeText={setEditDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted} accessibilityLabel="Date" />
            </View>

            <View style={styles.fmRow}>
              <Text style={styles.fmLabel}>Contact *</Text>
              <TextInput style={styles.fmInput} value={editContact} onChangeText={setEditContact} placeholder="Contact name" placeholderTextColor={Colors.textMuted} accessibilityLabel="Contact" onFocus={() => setContactFocused(true)} onBlur={() => setTimeout(() => setContactFocused(false), 200)} />
              {contactSuggestions.length > 0 && (
                <View style={styles.suggestionsRow}>
                  {contactSuggestions.map((c) => (
                    <TouchableOpacity key={c.id} style={styles.suggestionChip} onPress={() => insertContact(c.name)} accessibilityRole="button" accessibilityLabel={`Select contact: ${c.name}`}>
                      <FontAwesome name="user" size={10} color={Colors.textMuted} />
                      <Text style={styles.suggestionText}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.fmRow}>
              <Text style={styles.fmLabel}>Location *</Text>
              <TextInput style={styles.fmInput} value={editLocation} onChangeText={setEditLocation} placeholder="Place or channel (Phone, Email, ...)" placeholderTextColor={Colors.textMuted} accessibilityLabel="Location" />
            </View>

            <View style={styles.fmRow}>
              <Text style={styles.fmLabel}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                {availableTypes.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, editType === t && styles.typeChipActive]}
                    onPress={() => setEditType(editType === t ? '' : t)}
                    accessibilityRole="button"
                    accessibilityLabel={`Interaction type: ${INTERACTION_LABELS[t]}`}
                    accessibilityState={{ selected: editType === t }}
                  >
                    <FontAwesome name={INTERACTION_ICONS[t] as any} size={11} color={editType === t ? Colors.textPrimary : Colors.textMuted} />
                    <Text style={[styles.typeChipText, editType === t && styles.typeChipTextActive]}>{INTERACTION_LABELS[t]}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.fmSection}>
            <TouchableOpacity style={styles.fmSectionHeader} onPress={() => setOptionalExpanded(!optionalExpanded)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Toggle Optional Details">
              <Text style={styles.fmSectionTitle}>Optional Details</Text>
              <FontAwesome name={optionalExpanded ? 'chevron-up' : 'chevron-down'} size={12} color={Colors.textMuted} />
            </TouchableOpacity>

            {optionalExpanded && (
              <View>
                <View style={styles.fmRow}>
                  <Text style={styles.fmLabel}>From</Text>
                  <TextInput style={styles.fmInput} value={editFrom} onChangeText={setEditFrom} placeholder="Sender (email, message)" placeholderTextColor={Colors.textMuted} accessibilityLabel="Sender" />
                </View>

                <View style={styles.fmRow}>
                  <Text style={styles.fmLabel}>To</Text>
                  <TextInput style={styles.fmInput} value={editTo} onChangeText={setEditTo} placeholder="Recipient" placeholderTextColor={Colors.textMuted} accessibilityLabel="Recipient" />
                </View>

                <View style={styles.fmRow}>
                  <Text style={styles.fmLabel}>With</Text>
                  <TextInput style={styles.fmInput} value={editWith} onChangeText={setEditWith} placeholder="Other people (comma-separated)" placeholderTextColor={Colors.textMuted} accessibilityLabel="Other people" />
                </View>

                <View style={styles.fmRow}>
                  <Text style={styles.fmLabel}>Subject</Text>
                  <TextInput style={styles.fmInput} value={editSubject} onChangeText={setEditSubject} placeholder="Email subject, topic" placeholderTextColor={Colors.textMuted} accessibilityLabel="Subject" />
                </View>

                <View style={styles.fmRow}>
                  <Text style={styles.fmLabel}>Duration</Text>
                  <TextInput style={styles.fmInput} value={editDuration} onChangeText={setEditDuration} placeholder="e.g. 30 minutes" placeholderTextColor={Colors.textMuted} accessibilityLabel="Duration" />
                </View>

                <View style={styles.fmRow}>
                  <Text style={styles.fmLabel}>Photo Link</Text>
                  <TextInput style={styles.fmInput} value={editPhoto} onChangeText={setEditPhoto} placeholder="URL to photo or gallery" placeholderTextColor={Colors.textMuted} accessibilityLabel="Photo Link" autoCapitalize="none" keyboardType="url" />
                </View>

                <View style={styles.fmRow}>
                  <Text style={styles.fmLabel}>Tags</Text>
                  <TextInput style={styles.fmInput} value={editTags} onChangeText={setEditTags} placeholder="work, catch-up, follow-up" placeholderTextColor={Colors.textMuted} accessibilityLabel="Tags" onFocus={() => setTagFocused(true)} onBlur={() => setTimeout(() => setTagFocused(false), 200)} />
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

          {/* ── Title + Body ── */}
          <View style={styles.fmSection}>
            <Text style={[styles.fmSectionTitle, { marginBottom: 12 }]}>Entry Content</Text>

            <View style={styles.fmRow}>
              <Text style={styles.fmLabel}>Title</Text>
              <TextInput style={styles.fmInput} value={editTitle} onChangeText={setEditTitle} placeholder="Optional title / summary" placeholderTextColor={Colors.textMuted} accessibilityLabel="Entry Title" />
            </View>

            <View style={styles.fmRow}>
              <Text style={styles.fmLabel}>Notes</Text>
              <TextInput
                style={[styles.fmInput, styles.fmTextArea]}
                value={editBody}
                onChangeText={setEditBody}
                placeholder="Write your journal entry here..."
                placeholderTextColor={Colors.textMuted}
                multiline
                textAlignVertical="top"
                accessibilityLabel="Entry Notes"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── View Mode ────────────────────────────────────────────────────────────

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={headerOptions} />
      {/* Vault Banner */}
      {encrypted && (
        <View style={styles.vaultBanner}>
          <FontAwesome name="lock" size={14} color={Colors.vaultAccent} />
          <Text style={styles.vaultBannerText}>
            {vaultUnlocked ? 'End-to-End Encrypted (Unlocked)' : 'End-to-End Encrypted (Locked)'}
          </Text>
          {isDecrypting && <ActivityIndicator size="small" color={Colors.vaultAccent} />}
          {vaultUnlocked && decryptedText && (
            <TouchableOpacity 
              onPress={() => setIsMasked(!isMasked)} 
              style={{ padding: 4, marginLeft: 'auto' }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <FontAwesome name={isMasked ? "eye-slash" : "eye"} size={16} color={Colors.vaultAccent} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Error Banner */}
      {vaultError && (
        <View style={styles.errorBanner}>
          <FontAwesome name="exclamation-triangle" size={12} color={Colors.danger} />
          <Text style={styles.errorText}>{vaultError}</Text>
        </View>
      )}

      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {interactionType && (
            <View style={styles.typeBadge}>
              <FontAwesome name={INTERACTION_ICONS[interactionType] as any} size={11} color={Colors.secondaryAccent} />
              <Text style={styles.typeBadgeText}>{INTERACTION_LABELS[interactionType]}</Text>
            </View>
          )}
          <Text style={styles.date}>{parsed?.frontmatter.date || entry.entry_date}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleToggleVault} style={[styles.vaultBtn, encrypted && styles.vaultBtnActive]} disabled={isTogglingVault} accessibilityRole="button" accessibilityLabel={encrypted ? "Unlock entry" : "Lock entry"}>
            {isTogglingVault ? (
              <ActivityIndicator size="small" color={encrypted ? Colors.vaultAccent : Colors.textMuted} />
            ) : (
              <FontAwesome name={encrypted ? 'lock' : 'unlock-alt'} size={13} color={encrypted ? Colors.vaultAccent : Colors.textMuted} />
            )}
          </TouchableOpacity>
          {(!encrypted || (decryptedText && !isMasked)) && (
            <TouchableOpacity onPress={startEditing} style={styles.editBtn} accessibilityRole="button" accessibilityLabel="Edit Entry">
              <FontAwesome name="pencil" size={14} color={Colors.secondaryAccent} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} accessibilityRole="button" accessibilityLabel="Delete Entry">
            <FontAwesome name="trash" size={14} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Frontmatter Card ── */}
      {parsed && (!encrypted || !isMasked) && (
        <View style={styles.fmCard}>
          {/* Contact */}
          <View style={styles.fmDetailRow}>
            <FontAwesome name="user" size={13} color={Colors.secondaryAccent} />
            <Text style={styles.fmDetailLabel}>Contact</Text>
            <Text style={styles.fmDetailValue}>{parsed.frontmatter.contact}</Text>
          </View>

          {/* Location */}
          {parsed.frontmatter.location ? (
            <View style={styles.fmDetailRow}>
              <FontAwesome name={interactionType ? (INTERACTION_ICONS[interactionType] as any) : 'map-marker'} size={13} color={Colors.textMuted} />
              <Text style={styles.fmDetailLabel}>Location</Text>
              <Text style={styles.fmDetailValue}>{parsed.frontmatter.location}</Text>
            </View>
          ) : null}

          {/* From / To */}
          {parsed.frontmatter.from && (
            <View style={styles.fmDetailRow}>
              <FontAwesome name="arrow-right" size={11} color={Colors.textMuted} />
              <Text style={styles.fmDetailLabel}>From</Text>
              <Text style={styles.fmDetailValue}>{parsed.frontmatter.from}</Text>
            </View>
          )}
          {parsed.frontmatter.to && (
            <View style={styles.fmDetailRow}>
              <FontAwesome name="arrow-left" size={11} color={Colors.textMuted} />
              <Text style={styles.fmDetailLabel}>To</Text>
              <Text style={styles.fmDetailValue}>{parsed.frontmatter.to}</Text>
            </View>
          )}

          {/* With */}
          {parsed.frontmatter.with && parsed.frontmatter.with.length > 0 && (
            <View style={styles.fmDetailRow}>
              <FontAwesome name="users" size={12} color={Colors.textMuted} />
              <Text style={styles.fmDetailLabel}>With</Text>
              <Text style={styles.fmDetailValue}>{parsed.frontmatter.with.join(', ')}</Text>
            </View>
          )}

          {/* Subject */}
          {parsed.frontmatter.subject && (
            <View style={styles.fmDetailRow}>
              <FontAwesome name="bookmark" size={12} color={Colors.textMuted} />
              <Text style={styles.fmDetailLabel}>Subject</Text>
              <Text style={styles.fmDetailValue}>{parsed.frontmatter.subject}</Text>
            </View>
          )}

          {/* Duration */}
          {parsed.frontmatter.duration && (
            <View style={styles.fmDetailRow}>
              <FontAwesome name="clock-o" size={13} color={Colors.textMuted} />
              <Text style={styles.fmDetailLabel}>Duration</Text>
              <Text style={styles.fmDetailValue}>{parsed.frontmatter.duration}</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Photo / Gallery ── */}
      {parsed?.frontmatter.photo && (!encrypted || (encrypted && !isMasked)) && (
        <TouchableOpacity
          style={styles.photoCard}
          onPress={() => openSafeExternalURL(parsed.frontmatter.photo!)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open Attached Media"
        >
          {parsed.frontmatter.photo.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i) ? (
            <Image
              source={{ uri: parsed.frontmatter.photo }}
              style={styles.photoImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.photoLinkContainer}>
              <FontAwesome name="picture-o" size={20} color={Colors.primaryAccent} />
              <View style={styles.photoLinkTextContainer}>
                <Text style={styles.photoLinkTitle}>View Attached Media</Text>
                <Text style={styles.photoLinkUrl} numberOfLines={1}>{parsed.frontmatter.photo}</Text>
              </View>
              <FontAwesome name="external-link" size={14} color={Colors.textMuted} />
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* ── Title ── */}
      {parsed?.title && (!encrypted || (encrypted && !isMasked)) ? (
        <Text style={styles.entryTitle}>{parsed.title}</Text>
      ) : null}

      {/* ── Body Content ── */}
      {encrypted && !decryptedText && !isDecrypting ? (
        <View style={styles.lockedCard}>
          <FontAwesome name="lock" size={28} color={Colors.vaultAccent} />
          <Text style={styles.lockedTitle}>Vault Entry</Text>
          <Text style={styles.lockedSubtext}>Unlock vault in Settings to view this entry</Text>
        </View>
      ) : encrypted && isMasked ? (
        <View style={styles.lockedCard}>
          <FontAwesome name="eye-slash" size={28} color={Colors.vaultAccent} />
          <Text style={styles.lockedTitle}>Content Hidden</Text>
          <Text style={styles.lockedSubtext}>Tap the eye icon above to reveal</Text>
        </View>
      ) : parsed?.body ? (
        <View style={styles.bodyCard}>
          <Text style={styles.bodyText}>{parsed.body}</Text>
        </View>
      ) : null}

      {/* ── Tags ── */}
      {allTags.length > 0 && (
        <View style={styles.tagsRow}>
          {allTags.map((tag, i) => (
            <View key={i} style={styles.tagChip}>
              <FontAwesome name="tag" size={9} color={Colors.secondaryAccent} />
              <Text style={styles.tagChipText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Raw Text (collapsed) ── */}
      <Text style={styles.rawLabel}>{encrypted ? 'Encrypted Data' : 'Raw Entry'}</Text>
      <View style={[styles.rawBox, encrypted && styles.rawBoxEncrypted]}>
        {encrypted && (!decryptedText || isMasked) ? (
          <Text style={styles.rawTextEncrypted} numberOfLines={4}>
            {entry.raw_text.substring(0, 120)}…
          </Text>
        ) : (
          <Text style={styles.rawText}>{displayText}</Text>
        )}
      </View>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete entry?"
        body="This journal entry will be removed permanently. This action can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </ScrollView>
  );
}

const useStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  notFound: { color: Colors.textMuted, fontSize: 16, textAlign: 'center', marginTop: 60 },

  // Vault banner
  vaultBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.vaultSurface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: Colors.vaultBorder },
  vaultBannerText: { color: Colors.vaultAccent, fontSize: 13, fontWeight: '600', flex: 1 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(248,113,113,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)' },
  errorText: { color: Colors.danger, fontSize: 13 },

  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerLeft: { gap: 6 },
  headerActions: { flexDirection: 'row', gap: 8 },
  date: { color: Colors.syntaxDate, fontSize: 18, fontFamily: 'SpaceMono', fontWeight: '700' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(15, 77, 146, 0.25)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  typeBadgeText: { color: Colors.secondaryAccent, fontSize: 11, fontWeight: '600' },

  vaultBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceCard, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  vaultBtnActive: { borderColor: Colors.vaultBorder, backgroundColor: Colors.vaultSurface },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surfaceCard, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  editBtnText: { color: Colors.secondaryAccent, fontSize: 13, fontWeight: '600' },
  deleteBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceCard, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(248, 113, 113, 0.3)' },

  // Frontmatter card (view mode)
  fmCard: { backgroundColor: Colors.surfaceCard, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 16, gap: 10 },
  fmDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fmDetailLabel: { color: Colors.textMuted, fontSize: 12, minWidth: 80, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  fmDetailValue: { color: Colors.textPrimary, fontSize: 14, flex: 1 },

  // Title
  entryTitle: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 12, lineHeight: 28 },

  // Photo
  photoCard: { backgroundColor: Colors.surfaceCard, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  photoImage: { width: '100%', aspectRatio: 4 / 3, backgroundColor: 'rgba(0,0,0,0.2)' },
  photoLinkContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  photoLinkTextContainer: { flex: 1, gap: 2 },
  photoLinkTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  photoLinkUrl: { color: Colors.textMuted, fontSize: 12 },

  // Locked card
  lockedCard: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.vaultSurface, borderRadius: 14, padding: 32, borderWidth: 1, borderColor: Colors.vaultBorder, marginBottom: 24, gap: 10 },
  lockedTitle: { color: Colors.vaultAccent, fontSize: 17, fontWeight: '700' },
  lockedSubtext: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },

  // Body card
  bodyCard: { backgroundColor: Colors.surfaceCard, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  bodyText: { color: Colors.textPrimary, fontSize: 15, lineHeight: 24 },

  // Tags row
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(15, 77, 146, 0.25)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  tagChipText: { color: Colors.secondaryAccent, fontSize: 12, fontWeight: '500' },

  // Raw text
  rawLabel: { color: Colors.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  rawBox: { backgroundColor: Colors.surfaceCard, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: Colors.border },
  rawBoxEncrypted: { borderColor: Colors.vaultBorder },
  rawText: { color: Colors.textSecondary, fontSize: 13, fontFamily: 'SpaceMono', lineHeight: 20 },
  rawTextEncrypted: { color: Colors.textMuted, fontSize: 11, fontFamily: 'SpaceMono', lineHeight: 16 },

  // Editor (edit mode)
  editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  editHeaderTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '600' },
  cancelText: { color: Colors.secondaryAccent, fontSize: 15 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryAccent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  editorScroll: { flex: 1 },

  // Frontmatter form (edit mode)
  fmSection: { marginHorizontal: 16, marginTop: 20, backgroundColor: Colors.surfaceCard, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border },
  fmSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  fmSectionTitle: { color: Colors.secondaryAccent, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  fmRow: { marginBottom: 14 },
  fmLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  fmInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: Colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: Colors.borderSubtle },
  fmTextArea: { minHeight: 160, textAlignVertical: 'top', lineHeight: 22 },

  // Type selector (edit mode)
  typeScroll: { marginTop: 4 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginRight: 6, borderWidth: 1, borderColor: Colors.borderSubtle },
  typeChipActive: { backgroundColor: Colors.primaryAccent, borderColor: Colors.primaryAccent },
  typeChipText: { color: Colors.textMuted, fontSize: 12, fontWeight: '500' },
  typeChipTextActive: { color: '#FFFFFF' },

  // Suggestions
  suggestionsRow: { flexDirection: 'row', paddingTop: 8, gap: 6, flexWrap: 'wrap' },
  suggestionChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceCard, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.primaryAccent, gap: 6 },
  suggestionText: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  suggestionMeta: { color: Colors.textMuted, fontSize: 11, textTransform: 'capitalize' },
});
