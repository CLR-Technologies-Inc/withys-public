import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useColors } from '@/lib/ThemeProvider';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/lib/AuthProvider';
import { useContacts, useUpdateContact } from '@/lib/hooks';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function ProfileScreen() {
  const Colors = useColors();
  const styles = useStyles(Colors);
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { data: contacts = [] } = useContacts();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  // Find the 'Me' contact if one exists
  const meContact = contacts.find(c => c.is_self);
  const meName = meContact?.name || '';

  // Compute account age from Supabase user created_at
  const accountAge = useMemo(() => {
    const createdAt = session?.user?.created_at;
    if (!createdAt) return null;
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const totalDays = Math.floor(diffMs / 86400000);
    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    const days = totalDays % 30;

    const parts: string[] = [];
    if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
    if (days > 0 || parts.length === 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);

    return {
      label: parts.join(', '),
      date: created.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      totalDays,
    };
  }, [session?.user?.created_at]);

  const updateContactMutation = useUpdateContact();

  const networkGoal = ['grow', 'maintain', 'trim'].includes(meContact?.relationship?.toLowerCase() || '')
    ? (meContact?.relationship?.toLowerCase() as 'grow' | 'maintain' | 'trim')
    : 'maintain';

  const setNetworkGoal = (goal: 'grow' | 'maintain' | 'trim') => {
    if (meContact) {
      updateContactMutation.mutate({ id: meContact.id, updates: { relationship: goal } });
    }
  };

  const networkStats = useMemo(() => {
    let yearlyInteractions = 0;
    const others = contacts.filter(c => !c.is_self);
    others.forEach(c => {
      switch (c.targetLevel) {
        case 'daily': yearlyInteractions += 365; break;
        case 'weekly': yearlyInteractions += 52; break;
        case 'monthly': yearlyInteractions += 12; break;
        case 'quarterly': yearlyInteractions += 4; break;
        case 'annually': yearlyInteractions += 1; break;
      }
    });
    
    const dailyInteractions = yearlyInteractions / 365;
    const dailyMins = dailyInteractions * 30; // Assuming 30 mins per interaction

    const budgets = { trim: 15, maintain: 30, grow: 60 };
    const budgetMins = budgets[networkGoal];

    let status = 'Balanced';
    let statusColor = Colors.primaryAccent;
    if (dailyMins > budgetMins * 1.25) {
      status = 'Over committed';
      statusColor = Colors.warning;
    } else if (dailyMins < budgetMins * 0.75) {
      status = 'Under committed';
      statusColor = Colors.secondaryAccent;
    }

    return {
      dailyInteractions: dailyInteractions.toFixed(1),
      dailyMins: dailyMins.toFixed(0),
      status,
      statusColor,
      budgetMins
    };
  }, [contacts, networkGoal, Colors]);

  if (showDeleteConfirm) {
    const nameMatches = deleteConfirmText.trim().toLowerCase() === meName.toLowerCase() && meName.length > 0;

    return (
      <>
        <Stack.Screen options={{ title: 'Profile' }} />
        <View style={styles.container}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDeleteConfirm(false)}>
              <Text style={styles.cancelText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.confirmForm} contentContainerStyle={styles.confirmFormContent}>
            <View style={styles.dangerIcon}>
              <FontAwesome name="exclamation-triangle" size={40} color={Colors.danger} />
            </View>
            <Text style={styles.dangerDescription}>
              This action is permanent and cannot be undone. All your data, including entries, contacts, and encrypted vault content, will be permanently deleted.
            </Text>

            <Text style={styles.inputLabel}>
              Type your name to confirm: <Text style={{ color: Colors.textPrimary, fontWeight: '700' }}>{meName || '(no "Me" contact found)'}</Text>
            </Text>
            <TextInput
              style={[styles.confirmInput, { borderColor: deleteConfirmText.length > 0 ? (nameMatches ? Colors.success : Colors.danger) : Colors.border }]}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder={meName || 'Your name'}
              placeholderTextColor={Colors.textMuted}
              autoFocus
              autoCorrect={false}
              autoCapitalize="words"
            />

            {!meName && (
              <View style={styles.warningBox}>
                <FontAwesome name="exclamation-circle" size={14} color={Colors.warning} />
                <Text style={styles.warningText}>
                  No "Me" contact found. Please set up your profile first before deleting your account.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.deleteSubmitBtn, !nameMatches && styles.deleteSubmitDisabled]}
              onPress={async () => {
                if (!nameMatches) return;
                // Placeholder for actual delete logic
                alert('Account deletion requested.');
                setShowDeleteConfirm(false);
                await signOut();
              }}
              disabled={!nameMatches}
            >
              <FontAwesome name="trash" size={14} color="#FFFFFF" />
              <Text style={styles.deleteSubmitText}>Permanently Delete Account</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Profile' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Personal Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <FontAwesome name="user" size={16} color={Colors.secondaryAccent} style={styles.icon} />
              <View style={styles.rowContent}>
                <Text style={styles.label}>Name</Text>
                <Text style={styles.value}>{meContact ? meContact.name : 'Unknown (No "Me" contact)'}</Text>
              </View>
            </View>
            <View style={[styles.row, styles.noBorder]}>
              <FontAwesome name="envelope" size={16} color={Colors.secondaryAccent} style={styles.icon} />
              <View style={styles.rowContent}>
                <Text style={styles.label}>Account Email</Text>
                <Text style={styles.value}>{session?.user?.email || 'Not available'}</Text>
              </View>
            </View>
          </View>
          {meContact && (
            <TouchableOpacity
              style={[styles.row, styles.noBorder, styles.meLink]}
              onPress={() => router.push(`/person/${meContact.id}` as any)}
              activeOpacity={0.7}
            >
              <FontAwesome name="id-card" size={16} color={Colors.primaryAccent} style={styles.icon} />
              <View style={styles.rowContent}>
                <Text style={[styles.value, { color: Colors.primaryAccent }]}>View My Journal</Text>
                <Text style={styles.label}>Open your personal journal & profile</Text>
              </View>
              <FontAwesome name="chevron-right" size={12} color={Colors.primaryAccent} />
            </TouchableOpacity>
          )}
        </View>

        {/* Network Capacity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Network Capacity</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <FontAwesome name="users" size={16} color={Colors.secondaryAccent} style={styles.icon} />
              <View style={styles.rowContent}>
                <Text style={styles.label}>Network Goal</Text>
                <View style={styles.goalRow}>
                  {['Trim', 'Maintain', 'Grow'].map(goal => (
                    <TouchableOpacity 
                      key={goal}
                      style={[styles.goalBtn, networkGoal === goal.toLowerCase() && styles.goalBtnActive]}
                      onPress={() => setNetworkGoal(goal.toLowerCase() as any)}
                    >
                      <Text style={[styles.goalBtnText, networkGoal === goal.toLowerCase() && styles.goalBtnTextActive]}>
                        {goal}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.hint}>
                  Budget: {networkStats.budgetMins} mins/day
                </Text>
              </View>
            </View>

            <View style={styles.row}>
              <FontAwesome name="line-chart" size={16} color={Colors.secondaryAccent} style={styles.icon} />
              <View style={styles.rowContent}>
                <Text style={styles.label}>Estimated Effort</Text>
                <Text style={styles.value}>~{networkStats.dailyMins} mins / day</Text>
                <Text style={styles.hint}>Based on {networkStats.dailyInteractions} target interactions per day.</Text>
              </View>
            </View>

            <View style={[styles.row, styles.noBorder]}>
              <FontAwesome name="heartbeat" size={16} color={networkStats.statusColor} style={styles.icon} />
              <View style={styles.rowContent}>
                <Text style={styles.label}>Commitment Status</Text>
                <Text style={[styles.value, { color: networkStats.statusColor }]}>{networkStats.status}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Billing Status Placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billing</Text>
          <View style={styles.card}>
            <View style={[styles.row, styles.noBorder]}>
              <FontAwesome name="credit-card" size={16} color={Colors.secondaryAccent} style={styles.icon} />
              <View style={styles.rowContent}>
                <Text style={styles.label}>Subscription Status</Text>
                <Text style={[styles.value, { color: Colors.warning }]}>Pending Integration</Text>
                <Text style={styles.hint}>Billing information will appear here once implemented.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            {accountAge && (
              <>
                <View style={styles.row}>
                  <FontAwesome name="calendar" size={16} color={Colors.secondaryAccent} style={styles.icon} />
                  <View style={styles.rowContent}>
                    <Text style={styles.label}>Member Since</Text>
                    <Text style={styles.value}>{accountAge.date}</Text>
                  </View>
                </View>
                <View style={styles.row}>
                  <FontAwesome name="clock-o" size={16} color={Colors.secondaryAccent} style={styles.icon} />
                  <View style={styles.rowContent}>
                    <Text style={styles.label}>Account Age</Text>
                    <Text style={styles.value}>{accountAge.label}</Text>
                  </View>
                  <View style={styles.ageBadge}>
                    <Text style={styles.ageBadgeText}>{accountAge.totalDays}d</Text>
                  </View>
                </View>
              </>
            )}
            <TouchableOpacity
              style={[styles.row, styles.noBorder, styles.dangerRow]}
              onPress={() => { setDeleteConfirmText(''); setShowDeleteConfirm(true); }}
              activeOpacity={0.7}
            >
              <FontAwesome name="trash" size={16} color={Colors.danger} style={styles.icon} />
              <View style={styles.rowContent}>
                <Text style={[styles.value, { color: Colors.danger }]}>Delete Account</Text>
              </View>
              <FontAwesome name="chevron-right" size={12} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </>
  );
}

function useStyles(Colors: any) {
  return useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    content: {
      padding: 24,
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      color: Colors.textMuted,
      fontSize: 14,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 12,
      fontWeight: '600',
    },
    card: {
      backgroundColor: Colors.surfaceCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingHorizontal: 16,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    noBorder: {
      borderBottomWidth: 0,
    },
    icon: {
      width: 24,
      textAlign: 'center',
      marginRight: 16,
    },
    rowContent: {
      flex: 1,
    },
    label: {
      color: Colors.textSecondary,
      fontSize: 13,
      marginBottom: 4,
    },
    value: {
      color: Colors.textPrimary,
      fontSize: 16,
      fontWeight: '500',
    },
    hint: {
      color: Colors.textMuted,
      fontSize: 12,
      marginTop: 4,
      fontStyle: 'italic',
    },
    ageBadge: {
      backgroundColor: Colors.primaryAccent,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    ageBadgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'SpaceMono',
    },
    meLink: {
      borderTopWidth: 1,
      borderTopColor: Colors.border,
      borderBottomWidth: 0,
    },
    dangerRow: {
      borderColor: 'rgba(248,113,113,0.3)',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    modalTitle: {
      color: Colors.textPrimary,
      fontSize: 17,
      fontWeight: '600',
    },
    cancelText: {
      color: Colors.primaryAccent,
      fontSize: 15,
    },
    confirmForm: {
      flex: 1,
    },
    confirmFormContent: {
      padding: 24,
      alignItems: 'stretch',
    },
    dangerIcon: {
      alignItems: 'center',
      marginBottom: 16,
    },
    dangerDescription: {
      color: Colors.danger,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      marginBottom: 24,
    },
    inputLabel: {
      color: Colors.textMuted,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
      marginTop: 12,
    },
    confirmInput: {
      backgroundColor: Colors.surfaceCard,
      borderRadius: 12,
      padding: 14,
      color: Colors.textPrimary,
      fontSize: 15,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    warningBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: 'rgba(251,191,36,0.1)',
      borderRadius: 10,
      padding: 14,
      marginTop: 20,
      borderWidth: 1,
      borderColor: 'rgba(251,191,36,0.3)',
    },
    warningText: {
      color: Colors.warning,
      fontSize: 12,
      lineHeight: 18,
      flex: 1,
    },
    deleteSubmitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: Colors.danger,
      borderRadius: 12,
      paddingVertical: 14,
      marginTop: 24,
    },
    deleteSubmitDisabled: {
      opacity: 0.4,
    },
    deleteSubmitText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    goalRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
      marginBottom: 4,
    },
    goalBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.background,
    },
    goalBtnActive: {
      backgroundColor: Colors.primaryAccent,
      borderColor: Colors.primaryAccent,
    },
    goalBtnText: {
      fontSize: 12,
      color: Colors.textMuted,
      fontWeight: '600',
    },
    goalBtnTextActive: {
      color: '#FFFFFF',
    },
  }), [Colors]);
}
