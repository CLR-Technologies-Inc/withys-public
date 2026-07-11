import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useJournalStore } from '@/lib/store';
import { useEntries, useAddEntry, useContacts } from '@/lib/hooks';
import { parseMarkdownEntry } from '@/lib/markdownParser';
import { isEncryptedEntry } from '@/lib/vault';
import { useRouter } from 'expo-router';
import { useTheme, useColors, type ThemePreference } from '@/lib/ThemeProvider';
import { usePWAInstall } from '@/lib/usePWAInstall';
import { type ApiKeys, getStoredApiKeys, saveStoredApiKeys } from '@/lib/apiKeys';
// @ts-ignore — JSON import for build-time version
import appJson from '../../app.json';

// ── API Key Storage (AsyncStorage-backed) ────────────────────────────────────

interface ApiKeyConfig {
  id: string;
  label: string;
  icon: string;
  envVar: string;
  placeholder: string;
  helpUrl: string;
  helpText: string;
}

const API_KEY_CONFIGS: ApiKeyConfig[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    icon: 'google',
    envVar: 'GEMINI_API_KEY',
    placeholder: 'AIzaSy...',
    helpUrl: 'https://aistudio.google.com/apikey',
    helpText: 'Free tier: 15 RPM / 1M tokens per day',
  },
  {
    id: 'cerebras',
    label: 'Cerebras',
    icon: 'bolt',
    envVar: 'CEREBRAS_API_KEY',
    placeholder: 'csk-...',
    helpUrl: 'https://cloud.cerebras.ai',
    helpText: 'Fast inference on Llama, Qwen, DeepSeek',
  },
  {
    id: 'xai',
    label: 'xAI (Grok)',
    icon: 'rocket',
    envVar: 'XAI_API_KEY',
    placeholder: 'xai-...',
    helpUrl: 'https://console.x.ai',
    helpText: 'Grok models for advanced reasoning',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    icon: 'commenting',
    envVar: 'OPENAI_API_KEY',
    placeholder: 'sk-proj-...',
    helpUrl: 'https://platform.openai.com/api-keys',
    helpText: 'GPT models for general AI tasks',
  },
];


function maskApiKey(key: string): string {
  if (!key || key.length < 12) return '••••••••';
  return key.slice(0, 6) + '••••••' + key.slice(-4);
}

export default function SettingsScreen() {
  const router = useRouter();
  const { vaultUnlocked, vaultConfigured, vaultRestorable, setupVault, unlockVault, restoreVault, lockVault, resetVault, aiEnabled, setAiEnabled, simpleMode, setSimpleMode } = useJournalStore();
  const { preference: themePreference, resolvedTheme, setPreference: setThemePreference } = useTheme();
  const { data: entries = [] } = useEntries();
  const { data: contacts = [] } = useContacts();
  const addEntryMutation = useAddEntry();
  const [showExportModal, setShowExportModal] = useState(false);
  const { isInstallable, promptInstall, isIOSWeb } = usePWAInstall();
  const colors = useColors();
  const styles = useSettingsStyles();
  const aiStyles = useAiStyles();
  const [showImportModal, setShowImportModal] = useState(false);
  const [showVaultSetup, setShowVaultSetup] = useState(false);
  const [importText, setImportText] = useState('');
  const [exportText, setExportText] = useState('');
  const [vaultPassphrase, setVaultPassphrase] = useState('');
  const [vaultConfirm, setVaultConfirm] = useState('');
  const [vaultError, setVaultError] = useState('');

  // ── API Key Management State ──
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [keySaveStatus, setKeySaveStatus] = useState<Record<string, 'saved' | 'error' | null>>({});

  // Load persisted API keys on mount
  useEffect(() => {
    getStoredApiKeys().then(setApiKeys);
  }, []);

  const handleSaveKey = useCallback(async (keyId: string) => {
    const trimmed = editingValue.trim();
    if (!trimmed) return;
    const updated = { ...apiKeys, [keyId]: trimmed };
    setApiKeys(updated);
    await saveStoredApiKeys(updated);
    setEditingKey(null);
    setEditingValue('');
    setKeySaveStatus(prev => ({ ...prev, [keyId]: 'saved' }));
    // Clear status after 3 seconds
    setTimeout(() => setKeySaveStatus(prev => ({ ...prev, [keyId]: null })), 3000);
  }, [editingValue, apiKeys]);

  const handleClearKey = useCallback(async (keyId: string) => {
    const updated = { ...apiKeys };
    delete updated[keyId];
    setApiKeys(updated);
    await saveStoredApiKeys(updated);
    setKeySaveStatus(prev => ({ ...prev, [keyId]: null }));
  }, [apiKeys]);

  const configuredKeyCount = API_KEY_CONFIGS.filter(c => apiKeys[c.id]).length;

  const vaultEntryCount = entries.filter((e) => isEncryptedEntry(e.raw_text)).length;

  // ── Export ──
  const handleExport = () => {
    const journalText = entries
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
      .map((e) => e.raw_text)
      .join('\n\n');
    setExportText(journalText);
    setShowExportModal(true);
  };

  const handleCopyExport = () => {
    if (Platform.OS === 'web') {
      navigator.clipboard?.writeText(exportText);
    }
    setShowExportModal(false);
  };

  // ── Import ──
  const handleImport = () => {
    if (!importText.trim()) return;
    const blocks = importText.split(/\n\n+/).filter((b) => b.trim());
    let imported = 0;
    const addEntry = (e: any) => addEntryMutation.mutate({ entry: e });
    blocks.forEach((block) => {
      try {
        const parsed = parseMarkdownEntry(block);
        if (parsed.frontmatter.date && parsed.frontmatter.contact) {
          const id = String(Date.now() + imported);
          addEntry({
            id,
            entry_date: parsed.frontmatter.date,
            contact_name: parsed.frontmatter.contact,
            location: parsed.frontmatter.location || '',
            raw_text: block.trim(),
            tags: parsed.frontmatter.tags || [],
          });
          imported++;
        }
      } catch {
        // Skip malformed entries
      }
    });
    setImportText('');
    setShowImportModal(false);
    if (Platform.OS === 'web') alert(`Imported ${imported} entries`);
  };

  // ── Vault Setup ──
  const handleVaultSetup = async () => {
    setVaultError('');
    if (vaultPassphrase.length < 8) {
      setVaultError('Passphrase must be at least 8 characters');
      return;
    }
    if (vaultPassphrase !== vaultConfirm) {
      setVaultError('Passphrases do not match');
      return;
    }
    try {
      await setupVault(vaultPassphrase);
      setVaultPassphrase('');
      setVaultConfirm('');
      setShowVaultSetup(false);
    } catch (e: any) {
      setVaultError(e.message || 'Setup failed');
    }
  };

  const handleVaultUnlock = async () => {
    setVaultError('');
    if (!vaultPassphrase) return;
    const success = await unlockVault(vaultPassphrase);
    if (success) {
      setVaultPassphrase('');
      setShowVaultSetup(false);
    } else {
      setVaultError('Wrong passphrase');
    }
  };

  // ── Vault Restore (after PWA reinstall) ──
  const handleVaultRestore = async () => {
    setVaultError('');
    if (!vaultPassphrase) return;
    const success = await restoreVault(vaultPassphrase);
    if (success) {
      setVaultPassphrase('');
      setShowVaultSetup(false);
    } else {
      setVaultError('Wrong passphrase — this doesn\u2019t match your encrypted entries. Please try again.');
    }
  };

  // ── Vault Setup/Unlock/Restore Modal ──
  if (showVaultSetup) {
    const isSetup = !vaultConfigured && !vaultRestorable;
    const isRestore = !vaultConfigured && vaultRestorable;
    return (
      <View style={styles.container}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => { setShowVaultSetup(false); setVaultError(''); }}>
            <Text style={styles.cancelText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {isRestore ? 'Restore Vault' : isSetup ? 'Setup Vault' : 'Unlock Vault'}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.vaultForm} contentContainerStyle={styles.vaultFormContent}>
          <View style={styles.vaultIcon}>
            <FontAwesome name={isRestore ? 'cloud-download' : 'shield'} size={40} color={colors.vaultAccent} />
          </View>
          <Text style={styles.vaultDescription}>
            {isRestore
              ? 'We found encrypted entries in your account. Enter your existing passphrase to restore access.'
              : isSetup
              ? 'Create a passphrase to enable end-to-end encryption for sensitive entries. This passphrase never leaves your device.'
              : 'Enter your passphrase to unlock encrypted vault entries.'}
          </Text>

          {vaultError ? (
            <View style={styles.errorBox}>
              <FontAwesome name="exclamation-triangle" size={12} color={colors.danger} />
              <Text style={styles.errorText}>{vaultError}</Text>
            </View>
          ) : null}

          <Text style={styles.inputLabel}>Passphrase</Text>
          <TextInput
            style={styles.vaultInput}
            value={vaultPassphrase}
            onChangeText={setVaultPassphrase}
            placeholder="Enter passphrase (min 8 characters)"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoFocus
          />

          {isSetup && (
            <>
              <Text style={styles.inputLabel}>Confirm Passphrase</Text>
              <TextInput
                style={styles.vaultInput}
                value={vaultConfirm}
                onChangeText={setVaultConfirm}
                placeholder="Confirm passphrase"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />
            </>
          )}

          <TouchableOpacity
            style={[styles.vaultSubmitBtn, (!vaultPassphrase || (isSetup && !vaultConfirm)) && styles.vaultSubmitDisabled]}
            onPress={isRestore ? handleVaultRestore : isSetup ? handleVaultSetup : handleVaultUnlock}
            disabled={!vaultPassphrase || (isSetup && !vaultConfirm)}
          >
            <FontAwesome name={isRestore ? 'cloud-download' : isSetup ? 'shield' : 'unlock'} size={14} color="#FFFFFF" />
            <Text style={styles.vaultSubmitText}>
              {isRestore ? 'Restore Vault' : isSetup ? 'Create Vault' : 'Unlock'}
            </Text>
          </TouchableOpacity>

          {isSetup && (
            <View style={styles.warningBox}>
              <FontAwesome name="exclamation-circle" size={14} color={colors.warning} />
              <Text style={styles.warningText}>
                If you forget this passphrase, encrypted entries cannot be recovered. There is no reset mechanism.
              </Text>
            </View>
          )}

          {isRestore && (
            <View style={styles.warningBox}>
              <FontAwesome name="info-circle" size={14} color={colors.warning} />
              <Text style={styles.warningText}>
                If you forgot your passphrase, encrypted entries cannot be recovered. You can still create a new vault for future entries.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Export Modal ──
  if (showExportModal) {
    return (
      <View style={styles.container}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowExportModal(false)}>
            <Text style={styles.cancelText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Export Journal</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopyExport}>
            <FontAwesome name="copy" size={14} color="#FFFFFF" />
            <Text style={styles.copyText}>Copy</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.exportHint}>{entries.length} entries in markdown format</Text>
        <ScrollView style={styles.exportScroll}>
          <Text style={styles.exportContent} selectable>{exportText}</Text>
        </ScrollView>
      </View>
    );
  }

  // ── Import Modal ──
  if (showImportModal) {
    return (
      <View style={styles.container}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowImportModal(false)}>
            <Text style={styles.cancelText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Import Journal</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={handleImport}>
            <FontAwesome name="download" size={14} color="#FFFFFF" />
            <Text style={styles.copyText}>Import</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.exportHint}>Paste markdown entries separated by blank lines (YAML frontmatter format)</Text>
        <TextInput
          style={styles.importInput}
          value={importText}
          onChangeText={setImportText}
          placeholder={`---\ndate: 2025-07-01\ncontact: John\nlocation: Coffee Shop\ntags: [relationship:friend]\n---\nWe caught up over coffee and talked about weekend plans.`}
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          autoCorrect={false}
        />
      </View>
    );
  }

  // ── Main Settings ──
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primaryAccent }]}>Account</Text>
        <SettingsRow icon="user" label="Profile" onPress={() => router.push('/profile' as any)} />
        <SettingsRow icon="credit-card" label="Billing & Payment" subtitle="Manage subscription" onPress={() => router.push('/billing' as any)} />
      </View>

      {/* Vault Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.vaultAccent }]}>Vault</Text>
        {vaultConfigured ? (
          <>
            <View style={[styles.row, { borderColor: colors.vaultBorder, backgroundColor: colors.surfaceCard }]}>
              <FontAwesome name="shield" size={16} color={colors.vaultAccent} style={styles.rowIcon} />
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Vault Status</Text>
                <Text style={[styles.rowSubtitle, { color: vaultUnlocked ? colors.success : colors.vaultAccent }]}>
                  {vaultUnlocked ? '🔓 Unlocked' : '🔒 Locked'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.vaultActionBtn, vaultUnlocked && styles.vaultLockBtn]}
                onPress={vaultUnlocked ? lockVault : () => setShowVaultSetup(true)}
              >
                <Text style={[styles.vaultActionText, vaultUnlocked && { color: colors.danger }]}>
                  {vaultUnlocked ? 'Lock' : 'Unlock'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.row, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              <FontAwesome name="file-text-o" size={16} color={colors.vaultAccent} style={styles.rowIcon} />
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Encrypted Entries</Text>
                <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>{vaultEntryCount} of {entries.length} entries</Text>
              </View>
            </View>
          </>
        ) : vaultRestorable ? (
          <TouchableOpacity style={[styles.row, styles.vaultSetupRow, { borderColor: 'rgba(251,191,36,0.5)' }]} onPress={() => setShowVaultSetup(true)}>
            <FontAwesome name="cloud-download" size={16} color={colors.warning} style={styles.rowIcon} />
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Restore Vault</Text>
              <Text style={[styles.rowSubtitle, { color: colors.warning }]}>Encrypted entries found — enter your passphrase to restore</Text>
            </View>
            <FontAwesome name="chevron-right" size={12} color={colors.warning} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.row, styles.vaultSetupRow]} onPress={() => setShowVaultSetup(true)}>
            <FontAwesome name="shield" size={16} color={colors.vaultAccent} style={styles.rowIcon} />
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Enable Vault Encryption</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>Set up AES-256 end-to-end encryption for sensitive entries</Text>
            </View>
            <FontAwesome name="chevron-right" size={12} color={colors.vaultAccent} />
          </TouchableOpacity>
        )}
        {vaultConfigured && (
          <TouchableOpacity
            style={[styles.row, { borderColor: 'rgba(248,113,113,0.3)' }]}
            onPress={() => {
              const doReset = () => resetVault();
              if (Platform.OS === 'web') {
                if (window.confirm('Reset vault? This will NOT decrypt existing entries. Encrypted entries will become permanently inaccessible unless you remember the original passphrase.')) {
                  doReset();
                }
              } else {
                Alert.alert(
                  'Reset Vault',
                  'This will NOT decrypt existing entries. Encrypted entries will become permanently inaccessible unless you remember the original passphrase.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Reset', style: 'destructive', onPress: doReset },
                  ]
                );
              }
            }}
          >
            <FontAwesome name="trash" size={16} color={colors.danger} style={styles.rowIcon} />
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.danger }]}>Reset Vault</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>Remove passphrase — encrypted entries stay encrypted</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primaryAccent }]}>Data</Text>
        <SettingsRow icon="download" label="Export Entries" subtitle={`${entries.length} entries`} onPress={handleExport} />
        <SettingsRow icon="upload" label="Import Entries" subtitle="Paste markdown entries" onPress={() => setShowImportModal(true)} />
        <SettingsRow
          icon="database"
          label="Storage Type"
          subtitle="Local Storage (Offline)"
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primaryAccent }]}>Appearance</Text>
        <SettingsRow
          icon={resolvedTheme === 'dark' ? 'moon-o' : 'sun-o'}
          label="Theme"
          subtitle={themePreference === 'system'
            ? `System (${resolvedTheme})`
            : themePreference === 'light' ? 'Light' : 'Dark'}
          onPress={() => {
            const cycle: ThemePreference[] = ['system', 'light', 'dark'];
            const idx = cycle.indexOf(themePreference);
            setThemePreference(cycle[(idx + 1) % cycle.length]);
          }}
        />
        <SettingsRow icon="font" label="Editor Font" subtitle="SpaceMono" />
        <SettingsRow
          icon="th-large"
          label="Simple Mode"
          subtitle={simpleMode ? 'Home, Journal, People only' : 'All tabs visible'}
          onPress={() => setSimpleMode(!simpleMode)}
          isToggle
          toggleValue={simpleMode}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primaryAccent }]}>App</Text>
        {isInstallable && (
          <SettingsRow
            icon="download"
            label="Install App"
            subtitle="Add to Home Screen"
            onPress={promptInstall}
          />
        )}
        {isIOSWeb && (
          <SettingsRow
            icon="info-circle"
            label="Install App"
            subtitle="Tap Share -> Add to Home Screen"
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primaryAccent }]}>AI Features</Text>
        <SettingsRow
          icon="magic"
          label="AI Processing Enabled"
          subtitle={aiEnabled ? `Yes · ${configuredKeyCount} key${configuredKeyCount !== 1 ? 's' : ''} configured` : "No"}
          subtitleColor={aiEnabled ? colors.success : undefined}
          onPress={() => setAiEnabled(!aiEnabled)}
          isToggle
          toggleValue={aiEnabled}
        />

        {/* API Keys Panel — shown when AI is enabled */}
        {aiEnabled && (
          <View style={aiStyles.keysPanel}>
            <View style={aiStyles.keysPanelHeader}>
              <FontAwesome name="key" size={13} color={colors.secondaryAccent} />
              <Text style={aiStyles.keysPanelTitle}>API Keys</Text>
              <Text style={aiStyles.keysPanelSubtitle}>
                {configuredKeyCount} of {API_KEY_CONFIGS.length} configured
              </Text>
            </View>

            {API_KEY_CONFIGS.map((config) => {
              const isSaved = !!apiKeys[config.id];
              const isEditing = editingKey === config.id;
              const status = keySaveStatus[config.id];

              return (
                <View key={config.id} style={[aiStyles.keyRow, isSaved && aiStyles.keyRowSaved]}>
                  <View style={aiStyles.keyHeader}>
                    <FontAwesome
                      name={config.icon as any}
                      size={14}
                      color={isSaved ? colors.success : colors.textMuted}
                      style={aiStyles.keyIcon}
                    />
                    <View style={aiStyles.keyInfo}>
                      <Text style={aiStyles.keyLabel}>{config.label}</Text>
                      <Text style={aiStyles.keyHelp}>{config.helpText}</Text>
                    </View>
                    {isSaved && !isEditing && (
                      <View style={aiStyles.keyStatusBadge}>
                        <FontAwesome name="check-circle" size={10} color={colors.success} />
                        <Text style={aiStyles.keyStatusText}>Active</Text>
                      </View>
                    )}
                    {status === 'saved' && (
                      <View style={[aiStyles.keyStatusBadge, { borderColor: colors.success }]}>
                        <FontAwesome name="check" size={10} color={colors.success} />
                        <Text style={[aiStyles.keyStatusText, { color: colors.success }]}>Saved</Text>
                      </View>
                    )}
                  </View>

                  {isEditing ? (
                    <View style={aiStyles.keyEditArea}>
                      <TextInput
                        style={aiStyles.keyInput}
                        value={editingValue}
                        onChangeText={setEditingValue}
                        placeholder={config.placeholder}
                        placeholderTextColor={colors.textMuted}
                        autoFocus
                        autoCorrect={false}
                        autoCapitalize="none"
                        secureTextEntry
                      />
                      <View style={aiStyles.keyEditActions}>
                        <TouchableOpacity
                          style={[aiStyles.keyActionBtn, aiStyles.keySaveBtn]}
                          onPress={() => handleSaveKey(config.id)}
                          disabled={!editingValue.trim()}
                        >
                          <FontAwesome name="check" size={12} color="#FFFFFF" />
                          <Text style={aiStyles.keyActionText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[aiStyles.keyActionBtn, aiStyles.keyCancelBtn]}
                          onPress={() => { setEditingKey(null); setEditingValue(''); }}
                        >
                          <Text style={[aiStyles.keyActionText, { color: colors.textMuted }]}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          if (Platform.OS === 'web') window.open(config.helpUrl, '_blank');
                        }}
                      >
                        <Text style={aiStyles.keyHelpLink}>
                          Get a key at {config.helpUrl.replace('https://', '')} →
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={aiStyles.keyValueRow}
                      onPress={() => { setEditingKey(config.id); setEditingValue(apiKeys[config.id] || ''); }}
                      activeOpacity={0.7}
                    >
                      {isSaved ? (
                        <View style={aiStyles.keyMaskedRow}>
                          <Text style={aiStyles.keyMaskedValue}>{maskApiKey(apiKeys[config.id])}</Text>
                          <View style={aiStyles.keyInlineActions}>
                            <TouchableOpacity
                              style={aiStyles.keyInlineBtn}
                              onPress={() => { setEditingKey(config.id); setEditingValue(apiKeys[config.id] || ''); }}
                              accessibilityRole="button"
                              accessibilityLabel={`Edit ${config.label} API key`}
                            >
                              <FontAwesome name="pencil" size={11} color={colors.secondaryAccent} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={aiStyles.keyInlineBtn}
                              onPress={() => handleClearKey(config.id)}
                              accessibilityRole="button"
                              accessibilityLabel={`Remove ${config.label} API key`}
                            >
                              <FontAwesome name="times" size={12} color={colors.danger} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <View style={aiStyles.keyEmptyRow}>
                          <FontAwesome name="plus-circle" size={12} color={colors.primaryAccent} />
                          <Text style={aiStyles.keyEmptyText}>Add API key</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            <View style={aiStyles.keysFooter}>
              <FontAwesome name="lock" size={11} color={colors.textMuted} />
              <Text style={aiStyles.keysFooterText}>
                Keys are stored locally on this device and never sent to WWLO PRM servers.
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primaryAccent }]}>Billing & Usage</Text>
        <SettingsRow icon="credit-card" label="Billing & Payment" subtitle="Manage subscription" onPress={() => router.push('/billing' as any)} />
        <SettingsRow
          icon="bar-chart"
          label="Current Usage & Next Month's Estimate"
          onPress={() => router.push('/usage' as any)}
        />
        <SettingsRow icon="book" label="Entries" subtitle={String(entries.length)} />
        <SettingsRow icon="users" label="Contacts" subtitle={String(contacts.length)} />
        <SettingsRow
          icon="calculator"
          label="Next Month's Projection"
          subtitle="Local storage — Free"
          subtitleColor={colors.success}
          onPress={() => router.push('/usage' as any)}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primaryAccent }]}>About</Text>
        <SettingsRow icon="info" label="Version" subtitle={appJson.expo.version} />
        <SettingsRow
          icon="question-circle"
          label="Help & Getting Started"
          subtitle="Entry format, tips, example"
          onPress={() => router.push('/about' as any)}
        />
        <SettingsRow
          icon="file-text-o"
          label="Terms & Conditions"
          onPress={() => router.push('/terms' as any)}
        />
        <SettingsRow
          icon="shield"
          label="Privacy Policy"
          onPress={() => router.push('/privacy-policy' as any)}
        />
      </View>
    </ScrollView>
  );
}

function SettingsRow({ icon, label, subtitle, subtitleColor, onPress, danger, isToggle, toggleValue }: { icon: string; label: string; subtitle?: string; subtitleColor?: string; onPress?: () => void; danger?: boolean; isToggle?: boolean; toggleValue?: boolean; }) {
  const c = useColors();
  const styles = useSettingsStyles();
  return (
    <TouchableOpacity
      style={[
        styles.row,
        danger && { borderColor: 'rgba(248,113,113,0.3)' },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <FontAwesome name={icon as any} size={16} color={danger ? c.danger : c.primaryAccent} style={styles.rowIcon} />
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, danger && { color: c.danger }]}>{label}</Text>
        {subtitle && <Text style={[styles.rowSubtitle, subtitleColor ? { color: subtitleColor } : undefined]}>{subtitle}</Text>}
      </View>
      {isToggle !== undefined ? (
        <FontAwesome name={toggleValue ? "toggle-on" : "toggle-off"} size={20} color={toggleValue ? c.primaryAccent : c.textMuted} />
      ) : (
        <FontAwesome name="chevron-right" size={12} color={c.textMuted} />
      )}
    </TouchableOpacity>
  );
}

function useSettingsStyles() {
  const colors = useColors();
  return useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    section: { marginBottom: 24 },
    sectionTitle: { color: colors.primaryAccent, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceCard, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 6, borderWidth: 1, borderColor: colors.border },
    rowIcon: { marginRight: 12, width: 20, textAlign: 'center' },
    rowContent: { flex: 1 },
    rowLabel: { color: colors.textPrimary, fontSize: 15 },
    rowSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
    rowValue: { color: colors.textMuted, fontSize: 14, fontFamily: 'SpaceMono' },

    // Vault setup row
    vaultSetupRow: { borderColor: colors.vaultBorder, backgroundColor: colors.vaultSurface },
    vaultActionBtn: { backgroundColor: colors.vaultSurface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.vaultBorder },
    vaultLockBtn: { borderColor: 'rgba(248,113,113,0.3)', backgroundColor: 'rgba(248,113,113,0.1)' },
    vaultActionText: { color: colors.vaultAccent, fontSize: 13, fontWeight: '600' },

    // Vault setup form
    vaultForm: { flex: 1 },
    vaultFormContent: { padding: 24, alignItems: 'stretch' },
    vaultIcon: { alignItems: 'center', marginBottom: 16 },
    vaultDescription: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 24 },
    inputLabel: { color: colors.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 12 },
    vaultInput: { backgroundColor: colors.surfaceCard, borderRadius: 12, padding: 14, color: colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: colors.vaultBorder },
    vaultSubmitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.vaultAccent, borderRadius: 12, paddingVertical: 14, marginTop: 24 },
    vaultSubmitDisabled: { opacity: 0.4 },
    vaultSubmitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: 10, padding: 14, marginTop: 20, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
    warningText: { color: colors.warning, fontSize: 12, lineHeight: 18, flex: 1 },
    errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(248,113,113,0.1)', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)' },
    errorText: { color: colors.danger, fontSize: 13 },

    // Modal shared
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '600' },
    cancelText: { color: colors.primaryAccent, fontSize: 15 },
    copyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryAccent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
    copyText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
    exportHint: { color: colors.textMuted, fontSize: 12, paddingHorizontal: 16, paddingTop: 12 },
    exportScroll: { flex: 1, padding: 16 },
    exportContent: { color: colors.textSecondary, fontSize: 13, fontFamily: 'SpaceMono', lineHeight: 20 },
    importInput: { flex: 1, margin: 16, backgroundColor: colors.surfaceCard, borderRadius: 12, padding: 16, color: colors.textPrimary, fontSize: 14, fontFamily: 'SpaceMono', lineHeight: 22, borderWidth: 1, borderColor: colors.border },
  }), [colors]);
}

// ── AI API Keys Panel Styles ─────────────────────────────────────────────────

function useAiStyles() {
  const colors = useColors();
  return useMemo(() => StyleSheet.create({
    keysPanel: {
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      marginTop: 4,
      overflow: 'hidden',
    },
    keysPanelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    keysPanelTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
      flex: 1,
    },
    keysPanelSubtitle: {
      color: colors.textMuted,
      fontSize: 12,
    },
    keyRow: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    keyRowSaved: {
      backgroundColor: 'rgba(74, 222, 128, 0.04)',
    },
    keyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    keyIcon: {
      width: 22,
      textAlign: 'center',
    },
    keyInfo: {
      flex: 1,
      marginLeft: 10,
    },
    keyLabel: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '500',
    },
    keyHelp: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 1,
    },
    keyStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(74, 222, 128, 0.3)',
      backgroundColor: 'rgba(74, 222, 128, 0.08)',
    },
    keyStatusText: {
      color: colors.success,
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    keyValueRow: {
      marginTop: 8,
      marginLeft: 32,
    },
    keyMaskedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    keyMaskedValue: {
      color: colors.textSecondary,
      fontSize: 13,
      fontFamily: 'SpaceMono',
      letterSpacing: 1,
    },
    keyInlineActions: {
      flexDirection: 'row',
      gap: 12,
    },
    keyInlineBtn: {
      padding: 4,
    },
    keyEmptyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    keyEmptyText: {
      color: colors.primaryAccent,
      fontSize: 13,
      fontWeight: '500',
    },
    keyEditArea: {
      marginTop: 10,
      marginLeft: 32,
    },
    keyInput: {
      backgroundColor: colors.surfaceCard,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      color: colors.textPrimary,
      fontSize: 14,
      fontFamily: 'SpaceMono',
      borderWidth: 1,
      borderColor: colors.border,
    },
    keyEditActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    keyActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    keySaveBtn: {
      backgroundColor: colors.primaryAccent,
    },
    keyCancelBtn: {
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.border,
    },
    keyActionText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600',
    },
    keyHelpLink: {
      color: colors.primaryAccent,
      fontSize: 11,
      marginTop: 8,
      textDecorationLine: 'underline',
    },
    keysFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.surfaceContainerLowest,
    },
    keysFooterText: {
      color: colors.textMuted,
      fontSize: 11,
      flex: 1,
      lineHeight: 15,
    },
  }), [colors]);
}

