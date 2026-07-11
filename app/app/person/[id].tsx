import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, Switch, Alert, Platform } from 'react-native';
import { useResponsive } from '@/lib/useResponsive';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColors, useTheme } from '@/lib/ThemeProvider';
import { useJournalStore } from '@/lib/store';
import { useContacts, useEntries, useUpdateContact, useAddContact, useAddEntry, useDeleteContact } from '@/lib/hooks';
import { RelationshipHealthCard } from '@/components/RelationshipHealthCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { generateBriefing } from '@/lib/gemini';
import { parseMarkdownEntry, formatMarkdownEntry, extractAllTags } from '@/lib/markdownParser';
import type { MarkdownEntry } from '@/lib/markdownParser';
import type { SampleContact } from '@/lib/sampleData';
import { openSafeExternalURL } from '@/lib/urlUtils';
import { isEncryptedEntry, encrypt, decrypt, serializeEncrypted, deserializeEncrypted } from '@/lib/vault';
import {
  calculateRelationshipHealth,
  analyzeSentiment,
  targetLevelLabel,
  healthScoreColor,
  healthStatusEmoji,
  sentimentColor,
  sentimentEmoji,
  trendArrow,
  TARGET_LEVELS,
} from '@/lib/sentiment';
import type { TargetLevel, RelationshipHealth as HealthType } from '@/lib/sentiment';

export default function PersonDetailScreen() {
  const Colors = useColors();
  const { resolvedTheme } = useTheme();
  const styles = useMemo(() => useStyles(Colors), [Colors]);

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: contacts = [] } = useContacts();
  const { data: entries = [] } = useEntries();
  const updateContactMutation = useUpdateContact();
  const addContactMutation = useAddContact();
  const addEntryMutation = useAddEntry();
  const deleteContactMutation = useDeleteContact();
  
  const isNew = id === 'new';
  const contact = isNew
    ? { id: 'new', name: '', nickname: undefined, relationship: 'acquaintance', emails: [], phone: '', company: '', city: '', state: '', country: '', zip_code: '', notes: '', is_self: false, targetLevel: 'annually' as TargetLevel, entry_count: 0, last_entry: null, preferences: [], significant_other: undefined, significant_other_relationship: undefined, birthday: undefined, children: undefined, pets: undefined, pet_status: undefined, how_we_met: undefined, dietary_preferences: undefined, is_archived: false }
    : contacts.find((c) => c.id === id);

  const [isEditing, setIsEditing] = useState(isNew);
  const [editForm, setEditForm] = useState<Partial<SampleContact>>({ ...contact });
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);

  // Quick Log state
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [quickLogText, setQuickLogText] = useState('');

  // WNH Quick-Add state
  const [showWNHAdd, setShowWNHAdd] = useState(false);
  const [wnhCategory, setWnhCategory] = useState<'want' | 'need' | 'nice-to-have'>('want');
  const [wnhValue, setWnhValue] = useState('');

  // Vault and AI settings
  const aiEnabled = useJournalStore((s) => s.aiEnabled);
  const vaultUnlocked = useJournalStore((s) => s.vaultUnlocked);
  const vaultConfigured = useJournalStore((s) => s.vaultConfigured);
  const vaultPassphrase = useJournalStore((s) => s.vaultPassphrase);
  const [encryptNotes, setEncryptNotes] = useState(false);
  const [decryptedNotes, setDecryptedNotes] = useState<string | null>(null);
  const notesAreEncrypted = contact?.notes ? isEncryptedEntry(contact.notes) : false;

  // Decrypt notes on mount if vault is unlocked
  React.useEffect(() => {
    if (notesAreEncrypted && vaultPassphrase && contact?.notes) {
      decrypt(deserializeEncrypted(contact.notes), vaultPassphrase)
        .then(setDecryptedNotes)
        .catch(() => setDecryptedNotes(null));
    } else {
      setDecryptedNotes(null);
    }
  }, [notesAreEncrypted, vaultPassphrase, contact?.notes]);

  // When entering edit mode, populate notes field with decrypted text
  React.useEffect(() => {
    if (isEditing && notesAreEncrypted && decryptedNotes) {
      setEditForm((f) => f ? { ...f, notes: decryptedNotes } : f);
      setEncryptNotes(true); // Preserve encryption on re-save
    }
  }, [isEditing, notesAreEncrypted, decryptedNotes]);

  // ── Copy to Clipboard ───────────────────────────────────────────────────
  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    // In a real app we might show a toast, but Alert is okay for now as per Micro-UX standards
    // or just let it be silent if it's a quick action.
  };

  // ── Phone Call Handler ──────────────────────────────────────────────────
  const handlePhoneCall = (phoneNumber: string, contactName: string) => {
    // Initiate the phone call - sanitize but keep standard phone characters
    const sanitized = phoneNumber.replace(/[^0-9+*#]/g, '');
    const telUrl = `tel:${sanitized}`;
    openSafeExternalURL(telUrl);

    // After a brief delay, prompt to log the interaction
    setTimeout(() => {
      Alert.alert(
        'Log Phone Call?',
        `Record this call with ${contactName}?`,
        [
          { text: 'Skip', style: 'cancel' },
          {
            text: 'Quick Log',
            onPress: () => {
              const today = new Date().toISOString().split('T')[0];
              const entry: MarkdownEntry = {
                frontmatter: {
                  date: today,
                  contact: contactName,
                  location: 'Phone Call',
                  type: 'phone',
                },
                title: `Phone call with ${contactName}`,
                body: '',
                raw: '',
              };
              const rawText = formatMarkdownEntry(entry);
              const allTags = extractAllTags(parseMarkdownEntry(rawText));
              addEntryMutation.mutate({ entry: {
                id: String(Date.now()),
                entry_date: today,
                contact_name: contactName,
                location: 'Phone Call',
                raw_text: rawText,
                tags: allTags,
                source: 'manual',
                status: 'approved',
              } });
            },
          },
          {
            text: 'Add Notes',
            style: 'default',
            onPress: () => {
              const today = new Date().toISOString().split('T')[0];
              router.push({
                pathname: '/modal',
                params: {
                  prefillContact: contactName,
                  prefillType: 'phone',
                  prefillLocation: 'Phone Call',
                  prefillDate: today,
                  prefillTitle: `Phone call with ${contactName}`,
                },
              } as any);
            },
          },
        ],
      );
    }, 500);
  };

  if (!contact) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Person not found</Text>
      </View>
    );
  }

  const personEntries = useMemo(() =>
    entries
      .filter((e) => contact.name && e.contact_name.toLowerCase() === contact.name.toLowerCase())
      .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()),
    [entries, contact.name]
  );

  // Calculate health
  const health = useMemo(() =>
    calculateRelationshipHealth(personEntries, contact.targetLevel),
    [personEntries, contact.targetLevel]
  );

  const handleSave = async () => {
    if (editForm) {
      let formToSave = { ...editForm } as SampleContact;

      // Encrypt notes if the lock is active and vault is unlocked
      if (encryptNotes && vaultPassphrase && formToSave.notes) {
        try {
          const payload = await encrypt(formToSave.notes, vaultPassphrase);
          formToSave.notes = serializeEncrypted(payload);
        } catch (err) {
          console.error('Notes encryption failed', err);
        }
      }

      if (isNew) {
        if (!formToSave.name) {
          alert('Name is required');
          return;
        }
        addContactMutation.mutate(formToSave, {
          onSuccess: () => {
            router.back();
          }
        });
      } else {
        updateContactMutation.mutate({ id: contact.id, updates: formToSave });
        setIsEditing(false);
      }
    }
  };

  const handleTargetChange = (level: TargetLevel) => {
    updateContactMutation.mutate({ id: contact.id, updates: { targetLevel: level } });
    setShowTargetPicker(false);
  };

  const confirmArchive = () => {
    const newVal = !contact.is_archived;
    updateContactMutation.mutate({
      id: contact.id,
      updates: { is_archived: newVal } as any,
    });
    setShowArchiveConfirm(false);
  };

  const confirmDelete = () => {
    deleteContactMutation.mutate(contact.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        router.replace('/(tabs)/people' as any);
      }
    });
  };

  const handleGenerateBriefing = async () => {
    if (personEntries.length === 0) return;
    setIsBriefingLoading(true);
    try {
      const text = await generateBriefing(contact.name, personEntries);
      setBriefing(text);
    } catch (err: any) {
      console.error('Briefing generation failed:', err);
      Alert.alert('AI Briefing Failed', err.message || 'Ensure your Gemini API key is configured in Settings.');
    } finally {
      setIsBriefingLoading(false);
    }
  };

  const CustomBackButton = () => (
    <TouchableOpacity
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)/people' as any);
        }
      }}
      style={{ padding: 8, paddingRight: 16, marginLeft: Platform.OS === 'web' ? 0 : -8 }}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <FontAwesome name="chevron-left" size={18} color={Colors.textPrimary} />
        <Text style={{ color: Colors.textPrimary, fontSize: 16, fontWeight: '500' }}>Back</Text>
      </View>
    </TouchableOpacity>
  );

  const CustomRightHeader = () => (
    <TouchableOpacity
      onPress={() => {
        const today = new Date().toISOString().split('T')[0];
        router.push({
          pathname: '/modal',
          params: { prefillContact: contact?.name, prefillDate: today },
        } as any);
      }}
      style={{ padding: 8, paddingLeft: 16, marginRight: Platform.OS === 'web' ? 0 : -8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
      accessibilityRole="button"
      accessibilityLabel="New Entry"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <FontAwesome name="plus" size={14} color={Colors.primaryAccent} />
      <Text style={{ color: Colors.primaryAccent, fontSize: 16, fontWeight: '600' }}>New Entry</Text>
    </TouchableOpacity>
  );

  const responsive = useResponsive();
  const wrapperStyle = { maxWidth: responsive.maxContentWidth, alignSelf: 'center' as const, width: '100%' as const, paddingHorizontal: responsive.contentPadding };

  if (isEditing) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.editContent, wrapperStyle]}>
        <Stack.Screen options={{ headerLeft: CustomBackButton }} />
        <View style={styles.editHeader}>
          <TouchableOpacity onPress={() => setIsEditing(false)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.editTitle}>Edit Contact</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <FontAwesome name="check" size={14} color={Colors.textPrimary} />
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <EditField label="Name" value={editForm?.name} onChange={(v) => setEditForm((f) => f ? { ...f, name: v } : f)} />
        <EditField label="Nickname" value={editForm?.nickname} onChange={(v) => setEditForm((f) => f ? { ...f, nickname: v } : f)} />
        <EditField label="Relationship" value={editForm?.relationship} onChange={(v) => setEditForm((f) => f ? { ...f, relationship: v } : f)} />
        <EditEmailsField emails={editForm?.emails || []} onChange={(v) => setEditForm((f) => f ? { ...f, emails: v } : f)} />
        <EditField label="Phone" value={editForm?.phone} onChange={(v) => setEditForm((f) => f ? { ...f, phone: v } : f)} keyboardType="phone-pad" />
        
        {/* Extended Details */}
        <EditField label="Significant Other" value={editForm?.significant_other} onChange={(v) => setEditForm((f) => f ? { ...f, significant_other: v } : f)} />
        <EditField label="SO Relationship" value={editForm?.significant_other_relationship} onChange={(v) => setEditForm((f) => f ? { ...f, significant_other_relationship: v } : f)} placeholder="e.g. Dating, Married, Separated" />
        <EditField label="Birthday" value={editForm?.birthday} onChange={(v) => setEditForm((f) => f ? { ...f, birthday: v } : f)} placeholder="YYYY-MM-DD" />
        <EditField label="Age" value={editForm?.birthday ? String(new Date().getFullYear() - new Date(editForm.birthday).getFullYear()) : ''} onChange={(v) => {
          if (!v || isNaN(Number(v))) return;
          const birthYear = new Date().getFullYear() - Number(v);
          setEditForm((f) => f ? { ...f, birthday: `${birthYear}-01-01` } : f);
        }} keyboardType="number-pad" placeholder="Will estimate birth year" />
        <EditField label="Children" value={editForm?.children} onChange={(v) => setEditForm((f) => f ? { ...f, children: v } : f)} />
        <EditField label="Pets" value={editForm?.pets} onChange={(v) => setEditForm((f) => f ? { ...f, pets: v } : f)} />
        <EditField label="Pet Status" value={editForm?.pet_status} onChange={(v) => setEditForm((f) => f ? { ...f, pet_status: v } : f)} placeholder="Living, Deceased" />
        <EditField label="Dietary Preferences" value={editForm?.dietary_preferences} onChange={(v) => setEditForm((f) => f ? { ...f, dietary_preferences: v } : f)} placeholder="e.g. Vegan, Gluten-free, Peanut allergy" />
        <EditField label="How We Met" value={editForm?.how_we_met} onChange={(v) => setEditForm((f) => f ? { ...f, how_we_met: v } : f)} multiline placeholder="Introduction or first meeting story" />

        <EditField label="Company" value={editForm?.company} onChange={(v) => setEditForm((f) => f ? { ...f, company: v } : f)} />
        <EditField label="City" value={editForm?.city} onChange={(v) => setEditForm((f) => f ? { ...f, city: v } : f)} />
        <EditField label="State" value={editForm?.state} onChange={(v) => setEditForm((f) => f ? { ...f, state: v } : f)} />
        <EditField label="Country" value={editForm?.country} onChange={(v) => setEditForm((f) => f ? { ...f, country: v } : f)} />
        <EditField label="Zip Code" value={editForm?.zip_code} onChange={(v) => setEditForm((f) => f ? { ...f, zip_code: v } : f)} />

        <View style={styles.editField}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <Text style={styles.editLabel}>Notes</Text>
            <TouchableOpacity
              onPress={() => {
                if (!vaultConfigured || !vaultUnlocked) {
                  Alert.alert(
                    'Vault Required',
                    !vaultConfigured
                      ? 'Set up the Vault in Settings to encrypt contact notes.'
                      : 'Unlock the Vault in Settings to encrypt contact notes.'
                  );
                } else {
                  setEncryptNotes(!encryptNotes);
                }
              }}
              style={[
                styles.notesLockBtn,
                encryptNotes && vaultUnlocked && styles.notesLockBtnActive,
              ]}
            >
              <FontAwesome
                name={encryptNotes && vaultUnlocked ? 'lock' : 'unlock-alt'}
                size={11}
                color={
                  encryptNotes && vaultUnlocked
                    ? Colors.vaultAccent
                    : Colors.textMuted
                }
              />
              <Text style={[
                styles.notesLockText,
                encryptNotes && vaultUnlocked && { color: Colors.vaultAccent },
              ]}>
                {encryptNotes && vaultUnlocked ? 'Encrypted' : 'Encrypt'}
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.editInput, { minHeight: 80, textAlignVertical: 'top' }]}
            value={editForm?.notes}
            onChangeText={(v) => setEditForm((f) => f ? { ...f, notes: v } : f)}
            multiline
            placeholder="Private notes about this contact..."
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <EditPreferencesField
          preferences={editForm?.preferences || []}
          onChange={(v) => setEditForm((f) => f ? { ...f, preferences: v } : f)}
        />
        
        <View style={styles.editField}>
          <Text style={styles.editLabel}>Self Profile</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surfaceCard, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border }}>
            <Text style={{ color: Colors.textPrimary, fontSize: 15 }}>This is me</Text>
            <Switch
              value={editForm?.is_self || false}
              onValueChange={(v) => setEditForm((f) => f ? { ...f, is_self: v } : f)}
              trackColor={{ false: Colors.border, true: Colors.primaryAccent }}
            />
          </View>
        </View>

        {!isNew && (
          <View style={[styles.editField, { marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: Colors.borderSubtle }]}>
            <Text style={[styles.editLabel, { color: Colors.danger }]}>Danger Zone</Text>
            <TouchableOpacity
              style={[{ borderColor: Colors.danger, backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: 14, borderRadius: 12, borderWidth: 1, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 }]}
              onPress={() => setShowDeleteConfirm(true)}
            >
              <FontAwesome name="trash" size={16} color={Colors.danger} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.danger, fontSize: 15, fontWeight: '600' }}>Delete Contact</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 12 }}>Permanently remove this person and all associated entries.</Text>
              </View>
              <FontAwesome name="chevron-right" size={12} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        )}

        <ConfirmDialog
          open={showDeleteConfirm}
          title={`Delete ${contact.name}?`}
          body="This will permanently remove this contact and all their journal entries. This action cannot be undone."
          confirmLabel="Delete"
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerLeft: CustomBackButton, headerRight: CustomRightHeader }} />
      <ScrollView contentContainerStyle={[{ paddingBottom: 40 }, wrapperStyle]}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{contact.name.charAt(0)}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.name}>{contact.name}</Text>
            {contact.nickname && (
              <Text style={{ fontSize: 18, color: Colors.textMuted, fontStyle: 'italic' }}>({contact.nickname})</Text>
            )}
            {contact.is_self && (
              <View style={styles.selfBadge}>
                <Text style={styles.selfBadgeText}>ME</Text>
              </View>
            )}
          </View>
          <Text style={styles.relationship}>{contact.is_self ? 'Personal Profile' : contact.relationship}</Text>

          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TouchableOpacity style={styles.editContactBtn} onPress={() => setIsEditing(true)}>
              <FontAwesome name="pencil" size={12} color={Colors.secondaryAccent} />
              <Text style={styles.editContactText}>Edit</Text>
            </TouchableOpacity>

            {!contact.is_self && (
              <TouchableOpacity
                style={[styles.editContactBtn, contact.is_archived && { borderColor: Colors.warning, backgroundColor: 'rgba(251,191,36,0.08)' }]}
                onPress={() => setShowArchiveConfirm(true)}
              >
                <FontAwesome
                  name="archive"
                  size={12}
                  color={contact.is_archived ? Colors.warning : Colors.textMuted}
                />
                <Text style={[styles.editContactText, { color: contact.is_archived ? Colors.warning : Colors.textMuted }]}>
                  {contact.is_archived ? 'Unarchive' : 'Archive'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Archived banner */}
          {contact.is_archived && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(251,191,36,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 8 }}>
              <FontAwesome name="archive" size={11} color={Colors.warning} />
              <Text style={{ color: Colors.warning, fontSize: 12, fontWeight: '600' }}>This contact is archived</Text>
            </View>
          )}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{personEntries.length}</Text>
              <Text style={styles.statLbl}>{contact.is_self ? 'journal entries' : 'entries'}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{contact.last_entry || '—'}</Text>
              <Text style={styles.statLbl}>{contact.is_self ? 'last entry' : 'last seen'}</Text>
            </View>
          </View>

          {/* Contact Details */}
          <View style={styles.detailsGrid}>
            {(contact.emails || []).map((e, i) => (
              <DetailItem 
                key={`email-${i}`} 
                icon={e.is_preferred ? "star" : "envelope"} 
                label={`Email (${e.tag})`} 
                value={e.address} 
                onPress={() => copyToClipboard(e.address)}
              />
            ))}
            {contact.phone && (
              <TouchableOpacity
                style={styles.phoneCallItem}
                onPress={() => handlePhoneCall(contact.phone!, contact.name)}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel={`Call ${contact.name} at ${contact.phone}`}
              >
                <View style={styles.phoneIconCircle}>
                  <FontAwesome name="phone" size={14} color={Colors.success} />
                </View>
                <View>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.phoneValue}>{contact.phone}</Text>
                </View>
                <FontAwesome name="chevron-right" size={10} color={Colors.textMuted} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            )}
            {contact.company && <DetailItem icon="building" label="Company" value={contact.company} />}
            {contact.city && <DetailItem icon="map-marker" label="City" value={contact.city} />}
            {contact.state && <DetailItem icon="map-o" label="State" value={contact.state} />}
            {contact.country && <DetailItem icon="globe" label="Country" value={contact.country} />}
            {contact.zip_code && <DetailItem icon="envelope-o" label="Zip Code" value={contact.zip_code} />}
          </View>

          {/* Extended Details */}
          {(contact.significant_other || contact.birthday || contact.children || contact.pets) && (
            <View style={[styles.detailsGrid, { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.borderSubtle }]}>
              {contact.significant_other && <DetailItem icon="heart" label={`Partner${contact.significant_other_relationship ? ` (${contact.significant_other_relationship})` : ''}`} value={contact.significant_other} />}
              {contact.birthday && <DetailItem icon="birthday-cake" label={`Birthday${contact.birthday ? ` (Age: ${new Date().getFullYear() - new Date(contact.birthday).getFullYear()})` : ''}`} value={contact.birthday} />}
              {contact.children && <DetailItem icon="child" label="Children" value={contact.children} />}
              {contact.pets && <DetailItem icon="paw" label={`Pets${contact.pet_status ? ` (${contact.pet_status})` : ''}`} value={contact.pets} />}
            </View>
          )}

          {contact.dietary_preferences && (
            <View style={styles.notesCard}>
              <Text style={styles.notesLabel}>Dietary Preferences</Text>
              <Text style={styles.notesText}>{contact.dietary_preferences}</Text>
            </View>
          )}

          {contact.how_we_met && (
            <View style={styles.notesCard}>
              <Text style={styles.notesLabel}>How we met / Introduction</Text>
              <Text style={styles.notesText}>{contact.how_we_met}</Text>
            </View>
          )}

          {contact.notes && (
            <View style={[styles.notesCard, notesAreEncrypted && { borderColor: Colors.vaultBorder }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={styles.notesLabel}>Notes</Text>
                {notesAreEncrypted && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <FontAwesome name="lock" size={10} color={Colors.vaultAccent} />
                    <Text style={{ color: Colors.vaultAccent, fontSize: 10, fontWeight: '600' }}>ENCRYPTED</Text>
                  </View>
                )}
              </View>
              <Text style={styles.notesText}>
                {notesAreEncrypted
                  ? (decryptedNotes || '🔒 Unlock vault to view')
                  : contact.notes}
              </Text>
            </View>
          )}
        </View>



        {/* ── Sections only for NON-SELF contacts ── */}
        {!contact.is_self && (
          <>
            {/* ── AI Wingman Briefing ── */}
            {aiEnabled && (
              <View style={styles.briefingSection}>
                <View style={styles.briefingHeader}>
                  <Text style={styles.sectionTitle}>AI Wingman Briefing</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Generate AI briefing"
                    style={styles.briefingBtn}
                    onPress={handleGenerateBriefing}
                    disabled={isBriefingLoading || personEntries.length === 0}
                  >
                    {isBriefingLoading ? (
                      <Text style={styles.briefingBtnText}>Thinking...</Text>
                    ) : (
                      <>
                        <FontAwesome name="magic" size={12} color={Colors.secondaryAccent} />
                        <Text style={styles.briefingBtnText}>Generate</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                {briefing ? (
                  <View style={styles.briefingCard}>
                    <Text style={styles.briefingText}>{briefing}</Text>
                  </View>
                ) : (
                  <Text style={styles.briefingPlaceholder}>
                    {personEntries.length > 0
                      ? 'Get an AI-powered summary of your history to prepare for your next meeting.'
                      : 'No entries yet to generate a briefing.'}
                  </Text>
                )}
              </View>
            )}

            {/* ── Relationship Health Card ── */}
            <RelationshipHealthCard
              health={health}
              targetLevel={contact.targetLevel}
              showTargetPicker={showTargetPicker}
              onTogglePicker={() => setShowTargetPicker(!showTargetPicker)}
              onChangeTarget={handleTargetChange}
            />

            {/* Preferences (Wants / Needs / Nice-to-Have) */}
            <View style={styles.preferencesSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.sectionTitle}>Wants / Needs / Nice-to-Have</Text>
                  <TouchableOpacity
                    onPress={() => setShowWNHAdd(!showWNHAdd)}
                    style={[styles.editContactBtn, { paddingVertical: 4, paddingHorizontal: 10 }]}
                    accessibilityRole="button"
                    accessibilityLabel={showWNHAdd ? 'Close quick add' : 'Quick add preference'}
                  >
                    <FontAwesome name={showWNHAdd ? 'times' : 'plus'} size={11} color={Colors.secondaryAccent} />
                    <Text style={styles.editContactText}>{showWNHAdd ? 'Close' : 'Add'}</Text>
                  </TouchableOpacity>
                </View>

                {/* WNH Quick-Add inline form */}
                {showWNHAdd && (
                  <View style={{ backgroundColor: Colors.surfaceCard, borderRadius: 12, padding: 14, marginTop: 10, borderWidth: 1, borderColor: Colors.border }}>
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                      {(['want', 'need', 'nice-to-have'] as const).map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setWnhCategory(cat)}
                          style={[
                            styles.targetOption,
                            wnhCategory === cat && styles.targetOptionActive,
                            { paddingVertical: 6, paddingHorizontal: 12 },
                          ]}
                        >
                          <Text style={[
                            styles.targetOptionText,
                            wnhCategory === cat && styles.targetOptionTextActive,
                            { fontSize: 12 },
                          ]}>{cat}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        style={{ flex: 1, color: Colors.textPrimary, fontSize: 14, backgroundColor: Colors.surfaceContainerLow, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border }}
                        placeholder={`Add a ${wnhCategory}…`}
                        placeholderTextColor={Colors.textMuted}
                        value={wnhValue}
                        onChangeText={setWnhValue}
                        onSubmitEditing={() => {
                          if (!wnhValue.trim()) return;
                          const prefs = [...(contact.preferences || []), { category: wnhCategory, value: wnhValue.trim() }];
                          updateContactMutation.mutate({ id: contact.id, updates: { preferences: prefs } });
                          setWnhValue('');
                        }}
                        returnKeyType="done"
                      />
                      <TouchableOpacity
                        style={[styles.saveBtn, { opacity: wnhValue.trim() ? 1 : 0.4 }]}
                        disabled={!wnhValue.trim()}
                        onPress={() => {
                          if (!wnhValue.trim()) return;
                          const prefs = [...(contact.preferences || []), { category: wnhCategory, value: wnhValue.trim() }];
                          updateContactMutation.mutate({ id: contact.id, updates: { preferences: prefs } });
                          setWnhValue('');
                        }}
                      >
                        <FontAwesome name="check" size={14} color={Colors.textPrimary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {contact.preferences && contact.preferences.length > 0 && (
                <View style={styles.preferencesGrid}>
                  {contact.preferences.map((pref, i) => (
                    <View key={i} style={[styles.prefChip, (styles as any)[`prefChip${pref.category}`]]}>
                      <Text style={styles.prefCategory}>{pref.category}:</Text>
                      <Text style={styles.prefValue}>{pref.value}</Text>
                    </View>
                  ))}
                </View>
                )}
              </View>

            {/* ── Sentiment History ── */}
            {health.sentimentHistory.length > 0 && (
              <View style={styles.sentimentSection}>
                <Text style={styles.sectionTitle}>Sentiment Timeline</Text>
                {health.sentimentHistory.map((s, i) => (
                  <View key={i} style={styles.sentimentRow}>
                    <Text style={styles.sentimentDate}>{s.date}</Text>
                    <View style={styles.sentimentBarTrack}>
                      <View style={[
                        styles.sentimentBarFill,
                        {
                          width: `${Math.abs(s.score) * 50 + 50}%`,
                          backgroundColor: sentimentColor(s.score, resolvedTheme),
                          alignSelf: s.score >= 0 ? 'flex-start' : 'flex-end',
                        }
                      ]} />
                    </View>
                    <Text style={[styles.sentimentLabel, { color: sentimentColor(s.score, resolvedTheme) }]}>
                      {sentimentEmoji(s.label)} {s.score > 0 ? '+' : ''}{(s.score * 100).toFixed(0)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Personal Journal (self) or Journal Entries (others) ── */}
        {contact.is_self ? (
          <>
            <View style={styles.personalJournalHeader}>
              <Text style={styles.sectionTitle}>Personal Journal</Text>
              <TouchableOpacity
                style={styles.writeJournalBtn}
                onPress={() => router.push({
                  pathname: '/modal',
                  params: {
                    prefillContact: contact.name,
                    prefillDate: new Date().toISOString().split('T')[0],
                  },
                } as any)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Write in journal"
              >
                <FontAwesome name="pencil" size={12} color={Colors.textPrimary} />
                <Text style={styles.writeJournalBtnText}>Write</Text>
              </TouchableOpacity>
            </View>
            {personEntries.length === 0 ? (
              <View style={styles.emptyJournal}>
                <FontAwesome name="book" size={32} color={Colors.textMuted} />
                <Text style={styles.emptyJournalTitle}>Your Personal Journal</Text>
                <Text style={styles.emptyJournalSubtext}>
                  Tap "Write" to start recording your thoughts, reflections, and personal notes.
                </Text>
              </View>
            ) : (
              personEntries.map((item) => {
                const encrypted = isEncryptedEntry(item.raw_text);
                const md = encrypted ? null : parseMarkdownEntry(item.raw_text);
                const preview = md?.body || '';
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.entryCard, encrypted && styles.entryCardEncrypted]}
                    onPress={() => router.push(`/entry/${item.id}` as any)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.entryHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {encrypted && <FontAwesome name="lock" size={11} color={Colors.vaultAccent} />}
                        <Text style={styles.entryDate}>{item.entry_date}</Text>
                      </View>
                    </View>
                    {encrypted ? (
                      <View style={styles.encryptedPreview}>
                        <FontAwesome name="lock" size={12} color={Colors.vaultAccent} />
                        <Text style={styles.encryptedPreviewText}>Encrypted vault entry</Text>
                      </View>
                    ) : (
                      <>
                        {md?.title ? <Text style={styles.entryTitle}>{md.title}</Text> : null}
                        <Text style={styles.entryPreview} numberOfLines={3}>{preview}</Text>
                      </>
                    )}
                    {item.tags.length > 0 && (
                      <View style={styles.entryTagRow}>
                        {item.tags.filter(t => t !== 'vault:true').slice(0, 4).map((tag, i) => (
                          <View key={i} style={styles.entryTag}>
                            <Text style={styles.entryTagText}>#{tag}</Text>
                          </View>
                        ))}
                        {encrypted && (
                          <View style={[styles.entryTag, styles.vaultTag]}>
                            <Text style={[styles.entryTagText, styles.vaultTagText]}>vault</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>Journal Entries</Text>
              <TouchableOpacity
                onPress={() => setShowQuickLog(!showQuickLog)}
                style={[styles.editContactBtn, { paddingVertical: 4, paddingHorizontal: 10 }]}
                accessibilityRole="button"
                accessibilityLabel={showQuickLog ? 'Close quick log' : 'Quick log'}
              >
                <FontAwesome name={showQuickLog ? 'times' : 'bolt'} size={11} color={Colors.secondaryAccent} />
                <Text style={styles.editContactText}>{showQuickLog ? 'Close' : 'Quick Log'}</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Log inline form */}
            {showQuickLog && (
              <View style={{ backgroundColor: Colors.surfaceCard, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.secondaryAccent + '40' }}>
                <Text style={{ color: Colors.textSecondary, fontSize: 12, marginBottom: 6 }}>Quick note about {contact.name}:</Text>
                <TextInput
                  style={{ color: Colors.textPrimary, fontSize: 14, backgroundColor: Colors.surfaceContainerLow, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border, minHeight: 60, textAlignVertical: 'top' }}
                  placeholder="Ran into them at the store, discussed…"
                  placeholderTextColor={Colors.textMuted}
                  value={quickLogText}
                  onChangeText={setQuickLogText}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.saveBtn, { alignSelf: 'flex-end', marginTop: 8, opacity: quickLogText.trim() ? 1 : 0.4 }]}
                  disabled={!quickLogText.trim()}
                  onPress={() => {
                    if (!quickLogText.trim()) return;
                    const today = new Date().toISOString().split('T')[0];
                    const rawText = formatMarkdownEntry({
                      title: '',
                      body: quickLogText.trim(),
                      frontmatter: {
                        date: today,
                        contact: contact.name,
                        location: 'Quick Log',
                        type: 'in-person',
                        tags: [],
                      },
                      raw: '',
                    });
                    addEntryMutation.mutate({ entry: {
                      id: `ql-${Date.now()}`,
                      contact_name: contact.name,
                      entry_date: today,
                      location: 'Quick Log',
                      raw_text: rawText,
                      tags: [],
                      source: 'manual',
                      status: 'approved',
                    } });
                    setQuickLogText('');
                    setShowQuickLog(false);
                  }}
                >
                  <FontAwesome name="check" size={14} color={Colors.textPrimary} />
                  <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}

            {personEntries.map((item) => {
              const encrypted = isEncryptedEntry(item.raw_text);
              const md = encrypted ? null : parseMarkdownEntry(item.raw_text);
              const preview = md?.body || '';
              const sentiment = encrypted ? null : analyzeSentiment(item.raw_text);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.entryCard, encrypted && styles.entryCardEncrypted]}
                  onPress={() => router.push(`/entry/${item.id}` as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.entryHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {encrypted && <FontAwesome name="lock" size={11} color={Colors.vaultAccent} />}
                      <Text style={styles.entryDate}>{item.entry_date}</Text>
                    </View>
                    {sentiment && (
                      <View style={[styles.sentimentBadge, { backgroundColor: sentimentColor(sentiment.score, resolvedTheme) + '20', borderColor: sentimentColor(sentiment.score, resolvedTheme) + '50' }]}>
                        <Text style={[styles.sentimentBadgeText, { color: sentimentColor(sentiment.score, resolvedTheme) }]}>
                          {sentimentEmoji(sentiment.label)} {sentiment.label}
                        </Text>
                      </View>
                    )}
                  </View>
                  {encrypted ? (
                    <View style={styles.encryptedPreview}>
                      <FontAwesome name="lock" size={12} color={Colors.vaultAccent} />
                      <Text style={styles.encryptedPreviewText}>Encrypted vault entry</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.entryLoc}>{item.location}</Text>
                      <Text style={styles.entryPreview} numberOfLines={2}>{preview}</Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>

      <ConfirmDialog
        open={showArchiveConfirm}
        title={`${contact.is_archived ? 'Unarchive' : 'Archive'} ${contact.name}?`}
        body={contact.is_archived
          ? 'This contact will reappear in all reports and lists.'
          : 'This contact will be hidden from most reports and lists. You can find them again via "Show Archived" on the People page.'
        }
        confirmLabel={contact.is_archived ? 'Unarchive' : 'Archive'}
        destructive={!contact.is_archived}
        onConfirm={confirmArchive}
        onCancel={() => setShowArchiveConfirm(false)}
      />
    </View>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function DetailItem({ icon, label, value, onPress }: { icon: string; label: string; value: string; onPress?: () => void }) {
  const Colors = useColors();
  const styles = useMemo(() => useStyles(Colors), [Colors]);

  const content = (
    <>
      <FontAwesome name={icon as any} size={14} color={icon === 'star' ? Colors.warning : Colors.secondaryAccent} />
      <View>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.detailItem} onPress={onPress} activeOpacity={0.6}>
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.detailItem}>
      {content}
    </View>
  );
}

function EditEmailsField({ emails, onChange }: { emails: { address: string; tag: string; is_preferred: boolean }[]; onChange: (v: { address: string; tag: string; is_preferred: boolean }[]) => void; }) {
  const Colors = useColors();
  const styles = useMemo(() => useStyles(Colors), [Colors]);

  const handleAdd = () => {
    onChange([...emails, { address: '', tag: 'personal', is_preferred: emails.length === 0 }]);
  };

  const handleUpdate = (index: number, field: string, value: any) => {
    const updated = [...emails];
    updated[index] = { ...updated[index], [field]: value };
    // If setting to preferred, unset others
    if (field === 'is_preferred' && value === true) {
      updated.forEach((e, i) => { if (i !== index) e.is_preferred = false; });
    }
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    const updated = [...emails];
    updated.splice(index, 1);
    // If removed the preferred, make the first one preferred
    if (emails[index].is_preferred && updated.length > 0) {
      updated[0].is_preferred = true;
    }
    onChange(updated);
  };

  return (
    <View style={styles.editField}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={styles.editLabel}>Emails</Text>
        <TouchableOpacity onPress={handleAdd}>
          <Text style={{ color: Colors.secondaryAccent, fontSize: 12 }}>+ Add</Text>
        </TouchableOpacity>
      </View>
      {emails.map((e, idx) => (
        <View key={idx} style={{ backgroundColor: Colors.surfaceCard, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <TextInput
              style={{ flex: 1, color: Colors.textPrimary, fontSize: 15 }}
              value={e.address}
              onChangeText={(v) => handleUpdate(idx, 'address', v)}
              placeholderTextColor={Colors.textMuted}
              placeholder="Email address"
              keyboardType="email-address"
            />
            <TouchableOpacity onPress={() => handleUpdate(idx, 'is_preferred', !e.is_preferred)} style={{ padding: 4, marginLeft: 8 }}>
              <FontAwesome name={e.is_preferred ? "star" : "star-o"} size={16} color={e.is_preferred ? Colors.warning : Colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleRemove(idx)} style={{ padding: 4, marginLeft: 8 }}>
              <FontAwesome name="trash-o" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {['work', 'school', 'personal', 'other'].map(tag => (
              <TouchableOpacity
                key={tag}
                onPress={() => handleUpdate(idx, 'tag', tag)}
                style={[
                  styles.targetOption, 
                  { paddingVertical: 4, paddingHorizontal: 8 },
                  e.tag === tag && styles.targetOptionActive
                ]}
              >
                <Text style={[styles.targetOptionText, e.tag === tag && styles.targetOptionTextActive, { fontSize: 10 }]}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function EditPreferencesField({ preferences, onChange }: {
  preferences: { category: string; value: string }[];
  onChange: (v: { category: string; value: string }[]) => void;
}) {
  const Colors = useColors();
  const styles = useMemo(() => useStyles(Colors), [Colors]);
  
  const [newVal, setNewVal] = useState('');
  const [activeCat, setActiveCat] = useState('Wants');

  const handleAdd = () => {
    if (!newVal.trim()) return;
    onChange([...preferences, { category: activeCat, value: newVal.trim() }]);
    setNewVal('');
  };

  const handleRemove = (index: number) => {
    const updated = [...preferences];
    updated.splice(index, 1);
    onChange(updated);
  };

  return (
    <View style={styles.editField}>
      <Text style={styles.editLabel}>Wants / Needs / Nice-to-Have</Text>
      <View style={{ backgroundColor: Colors.surfaceCard, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.border }}>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
          {['Needs', 'Wants', 'NTH'].map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCat(cat)}
              style={[
                styles.targetOption,
                { flex: 1, paddingVertical: 6 },
                activeCat === cat && styles.targetOptionActive
              ]}
            >
              <Text style={[styles.targetOptionText, activeCat === cat && styles.targetOptionTextActive, { textAlign: 'center' }]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            style={[styles.editInput, { flex: 1, height: 40, paddingVertical: 0 }]}
            value={newVal}
            onChangeText={setNewVal}
            placeholder={`Add ${activeCat}...`}
            placeholderTextColor={Colors.textMuted}
            onSubmitEditing={handleAdd}
          />
          <TouchableOpacity
            onPress={handleAdd}
            style={{ backgroundColor: Colors.primaryAccent, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' }}
          >
            <FontAwesome name="plus" size={14} color={'#FFFFFF'} />
          </TouchableOpacity>
        </View>

        {preferences.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {preferences.map((p, idx) => (
              <View key={idx} style={[styles.prefChip, (styles as any)[`prefChip${p.category}`]]}>
                <Text style={styles.prefCategory}>{p.category}:</Text>
                <Text style={styles.prefValue}>{p.value}</Text>
                <TouchableOpacity onPress={() => handleRemove(idx)} style={{ marginLeft: 4 }}>
                  <FontAwesome name="times-circle" size={12} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function EditField({ label, value, onChange, multiline, keyboardType, placeholder }: {
  label: string; value?: string; onChange: (v: string) => void; multiline?: boolean; keyboardType?: any; placeholder?: string;
}) {
  const Colors = useColors();
  const styles = useMemo(() => useStyles(Colors), [Colors]);

  return (
    <View style={styles.editField}>
      <Text style={styles.editLabel}>{label}</Text>
      <TextInput
        style={[styles.editInput, multiline && styles.editInputMultiline]}
        value={value || ''}
        onChangeText={onChange}
        placeholderTextColor={Colors.textMuted}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        multiline={multiline}
        keyboardType={keyboardType}
      />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const useStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  notFound: { color: Colors.textMuted, fontSize: 16, textAlign: 'center', marginTop: 60 },

  // Profile
  profileCard: { alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: Colors.border },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primaryAccent, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
  name: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700' },
  selfBadge: { backgroundColor: Colors.success + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: Colors.success + '50' },
  selfBadgeText: { color: Colors.success, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  relationship: { color: Colors.secondaryAccent, fontSize: 14, textTransform: 'capitalize', marginTop: 4 },
  editContactBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: Colors.surfaceCard, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  editContactText: { color: Colors.secondaryAccent, fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 32, marginTop: 16 },
  stat: { alignItems: 'center' },
  statNum: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700', fontFamily: 'SpaceMono' },
  statLbl: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 20, width: '100%', paddingHorizontal: 16 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '45%' },
  detailLabel: { color: Colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { color: Colors.textPrimary, fontSize: 13, marginTop: 1 },

  // Phone call button
  phoneCallItem: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', backgroundColor: 'rgba(34, 197, 94, 0.08)', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)' },
  phoneIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(34, 197, 94, 0.15)', alignItems: 'center', justifyContent: 'center' },
  phoneValue: { color: Colors.success, fontSize: 14, fontWeight: '600', marginTop: 1 },
  notesCard: { width: '100%', backgroundColor: Colors.surfaceCard, borderRadius: 10, padding: 12, marginTop: 16, borderWidth: 1, borderColor: Colors.border },
  notesLabel: { color: Colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  notesText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },
  notesLockBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: Colors.borderSubtle },
  notesLockBtnActive: { borderColor: Colors.vaultAccent, backgroundColor: 'rgba(245, 158, 11, 0.1)' },
  notesLockText: { color: Colors.textMuted, fontSize: 10, fontWeight: '600' },

  // Health Card
  healthCard: { margin: 16, backgroundColor: Colors.surfaceCard, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border },
  healthScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 12 },
  scoreRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  scoreNumber: { fontSize: 28, fontWeight: '800', fontFamily: 'SpaceMono' },
  scoreOutOf: { color: Colors.textMuted, fontSize: 10, marginTop: -2 },
  healthMeta: { flex: 1, gap: 6 },
  healthStatus: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  healthMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  healthMetaText: { color: Colors.textMuted, fontSize: 12 },

  // Target Level
  targetRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: Colors.borderSubtle },
  targetInfo: { flex: 1 },
  targetLabel: { color: Colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  targetValue: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600', marginTop: 2 },
  targetEditBtn: { padding: 8 },
  targetProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  targetBarTrack: { flex: 1, height: 6, backgroundColor: Colors.borderSubtle, borderRadius: 3, overflow: 'hidden' },
  targetBarFill: { height: '100%', borderRadius: 3 },
  targetPercent: { fontSize: 12, fontWeight: '700', fontFamily: 'SpaceMono', width: 40, textAlign: 'right' },

  // Target Picker
  targetPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.borderSubtle },
  targetOption: { backgroundColor: Colors.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  targetOptionActive: { backgroundColor: Colors.primaryAccent, borderColor: Colors.primaryAccent },
  targetOptionText: { color: Colors.textMuted, fontSize: 12, fontWeight: '500' },
  targetOptionTextActive: { color: '#FFFFFF', fontWeight: '700' },

  // Sentiment Section
  sentimentSection: { paddingHorizontal: 16, marginTop: 8 },
  sentimentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sentimentDate: { color: Colors.textMuted, fontSize: 11, fontFamily: 'SpaceMono', width: 78 },
  sentimentBarTrack: { flex: 1, height: 6, backgroundColor: Colors.borderSubtle, borderRadius: 3, overflow: 'hidden' },
  sentimentBarFill: { height: '100%', borderRadius: 3 },
  sentimentLabel: { fontSize: 11, fontWeight: '600', width: 56, textAlign: 'right' },
  sentimentBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  sentimentBadgeText: { fontSize: 10, fontWeight: '600' },

  // Section title
  sectionTitle: { color: Colors.secondaryAccent, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginLeft: 16, marginTop: 20, marginBottom: 10 },

  // Entry Cards
  entryCard: { backgroundColor: Colors.surfaceCard, borderRadius: 14, padding: 14, marginBottom: 10, marginHorizontal: 16, borderWidth: 1, borderColor: Colors.border },
  entryCardEncrypted: { borderColor: Colors.vaultBorder },
  entryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  entryDate: { color: Colors.syntaxDate, fontSize: 13, fontFamily: 'SpaceMono', fontWeight: '600' },
  entryLoc: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  entryPreview: { color: Colors.textSecondary, fontSize: 14, marginTop: 6, lineHeight: 20 },
  entryTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 4 },
  encryptedPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  encryptedPreviewText: { color: Colors.vaultAccent, fontSize: 13, fontStyle: 'italic' },
  entryTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  entryTag: { backgroundColor: Colors.primaryAccent, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  vaultTag: { backgroundColor: Colors.vaultSurface, borderWidth: 1, borderColor: Colors.vaultBorder },
  entryTagText: { color: '#FFFFFF', fontSize: 10, fontWeight: '500' },
  vaultTagText: { color: Colors.vaultAccent },

  // Personal Journal (self-contact)
  personalJournalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 16, marginTop: 16, marginBottom: 4 },
  writeJournalBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primaryAccent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  writeJournalBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  emptyJournal: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32, gap: 10 },
  emptyJournalTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '700' },
  emptyJournalSubtext: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // AI Briefing
  briefingSection: { marginTop: 8 },
  briefingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 16 },
  briefingBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surfaceCard, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border, marginTop: 10 },
  briefingBtnText: { color: Colors.secondaryAccent, fontSize: 11, fontWeight: '600' },
  briefingCard: { marginHorizontal: 16, backgroundColor: Colors.surfaceCard, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.borderSubtle, borderLeftWidth: 4, borderLeftColor: Colors.primaryAccent },
  briefingText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 22 },
  briefingPlaceholder: { color: Colors.textMuted, fontSize: 13, marginHorizontal: 16, fontStyle: 'italic' },

  // Edit form
  editContent: { padding: 16, paddingBottom: 40 },
  editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  editTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '600' },
  cancelText: { color: Colors.secondaryAccent, fontSize: 15 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryAccent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  saveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  editField: { marginBottom: 16 },
  editLabel: { color: Colors.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  editInput: { backgroundColor: Colors.surfaceCard, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: Colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
  editInputMultiline: { minHeight: 80, textAlignVertical: 'top' },

  // Preferences
  preferencesSection: { width: '100%', marginTop: 16, paddingHorizontal: 16 },
  preferencesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  prefChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, gap: 4 },
  prefChipNeeds: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' },
  prefChipWants: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)' },
  prefChipNTH: { backgroundColor: 'rgba(107, 114, 128, 0.1)', borderColor: 'rgba(107, 114, 128, 0.3)' },
  prefCategory: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: Colors.textMuted },
  prefValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: '500' },
});
