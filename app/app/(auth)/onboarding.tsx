import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView,
  Animated, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/lib/ThemeProvider';
import { useAddContact } from '@/lib/hooks';
import type { TargetLevel } from '@/lib/sentiment';

const ONBOARDING_COMPLETE_KEY = 'wwlo_onboarding_complete';

/** Custom event name dispatched on web when onboarding finishes */
export const ONBOARDING_COMPLETE_EVENT = 'wwlo:onboarding-complete';

/** Call this from outside to check if onboarding has been completed */
export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

/** Mark onboarding as complete */
export async function markOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
}

// ── Onboarding step definitions ──────────────────────────────────────────────

const TOTAL_STEPS = 4;

interface SeedContact {
  name: string;
  relationship: string;
  targetLevel: TargetLevel;
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const Colors = useColors();
  const styles = useMemo(() => useStyles(Colors), [Colors]);
  const addContactMutation = useAddContact();

  const [step, setStep] = useState(0);

  // Step 1: Create "Me" profile
  const [myName, setMyName] = useState('');

  // Step 2: Seed contacts
  const [seedContacts, setSeedContacts] = useState<SeedContact[]>([
    { name: '', relationship: 'friend', targetLevel: 'monthly' },
  ]);

  // Step 3: Set network goal
  const [networkGoal, setNetworkGoal] = useState<'grow' | 'maintain' | 'trim'>('maintain');

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateTransition = (next: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -40, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(40);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    });
  };

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) animateTransition(step + 1);
  };

  const goBack = () => {
    if (step > 0) animateTransition(step - 1);
  };

  const handleFinish = async () => {
    // Create "Me" self-profile contact
    if (myName.trim()) {
      addContactMutation.mutate({
        name: myName.trim(),
        relationship: 'self',
        is_self: true,
        targetLevel: 'none' as TargetLevel,
      } as any);
    }

    // Create seed contacts
    for (const c of seedContacts) {
      if (c.name.trim()) {
        addContactMutation.mutate({
          name: c.name.trim(),
          relationship: c.relationship,
          targetLevel: c.targetLevel,
        } as any);
      }
    }

    await markOnboardingComplete();

    // Notify the root layout guard so it allows /(tabs) navigation
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(ONBOARDING_COMPLETE_EVENT));
    }

    router.replace('/(tabs)' as any);
  };

  const addSeedRow = () => {
    setSeedContacts([...seedContacts, { name: '', relationship: 'friend', targetLevel: 'monthly' }]);
  };

  const updateSeedContact = (index: number, field: keyof SeedContact, value: string) => {
    const next = [...seedContacts];
    (next[index] as any)[field] = value;
    setSeedContacts(next);
  };

  const removeSeedContact = (index: number) => {
    setSeedContacts(seedContacts.filter((_, i) => i !== index));
  };

  // ── Render current step ────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      case 0:
        return <StepWelcome />;
      case 1:
        return <StepSelf myName={myName} setMyName={setMyName} />;
      case 2:
        return (
          <StepSeedContacts
            contacts={seedContacts}
            onUpdate={updateSeedContact}
            onAdd={addSeedRow}
            onRemove={removeSeedContact}
          />
        );
      case 3:
        return (
          <StepGoals
            goal={networkGoal}
            setGoal={setNetworkGoal}
            contactCount={seedContacts.filter(c => c.name.trim()).length}
            myName={myName}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i <= step && styles.progressDotActive,
              i < step && styles.progressDotComplete,
            ]}
          />
        ))}
      </View>

      {/* Step indicator */}
      <Text style={styles.stepIndicator}>
        {step + 1} of {TOTAL_STEPS}
      </Text>

      {/* Animated content */}
      <Animated.View
        style={[
          styles.contentWrapper,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep()}
        </ScrollView>
      </Animated.View>

      {/* Navigation buttons */}
      <View style={styles.navRow}>
        {step > 0 ? (
          <TouchableOpacity style={styles.navBack} onPress={goBack} activeOpacity={0.7}>
            <FontAwesome name="chevron-left" size={12} color={Colors.textMuted} />
            <Text style={styles.navBackText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {step < TOTAL_STEPS - 1 ? (
          <TouchableOpacity style={styles.navNext} onPress={goNext} activeOpacity={0.8}>
            <Text style={styles.navNextText}>
              {step === 0 ? "Let's Go" : 'Continue'}
            </Text>
            <FontAwesome name="chevron-right" size={12} color={'#FFFFFF'} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.navFinish} onPress={handleFinish} activeOpacity={0.8}>
            <Text style={styles.navFinishText}>Start Journaling</Text>
            <FontAwesome name="check" size={14} color={'#FFFFFF'} />
          </TouchableOpacity>
        )}
      </View>

      {/* Skip link */}
      {step > 0 && step < TOTAL_STEPS - 1 && (
        <TouchableOpacity style={styles.skipBtn} onPress={goNext} activeOpacity={0.6}>
          <Text style={styles.skipText}>Skip this step</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Step Components ──────────────────────────────────────────────────────────

function StepWelcome() {
  const Colors = useColors();
  const styles = useMemo(() => useStyles(Colors), [Colors]);
  return (
    <View style={styles.stepCenter}>
      <View style={styles.welcomeIconRing}>
        <FontAwesome name="leaf" size={36} color={Colors.secondaryAccent} />
      </View>
      <Text style={styles.stepTitle}>Welcome to WWLO</Text>
      <Text style={styles.stepSubtitle}>Let's set up your relationship journal in under a minute.</Text>

      <View style={styles.welcomeFeatures}>
        <WelcomeFeature icon="book" text="Create a personal profile so the journal knows who you are" />
        <WelcomeFeature icon="users" text="Add a few people you want to stay connected with" />
        <WelcomeFeature icon="bullseye" text="Set your network goals so WWLO can help you stay on track" />
      </View>

      <Text style={styles.welcomeNote}>
        Everything stays private on your device. You can always change these later.
      </Text>
    </View>
  );
}

function WelcomeFeature({ icon, text }: { icon: string; text: string }) {
  const Colors = useColors();
  const styles = useMemo(() => useStyles(Colors), [Colors]);
  return (
    <View style={styles.welcomeFeatureRow}>
      <View style={styles.welcomeFeatureIcon}>
        <FontAwesome name={icon as any} size={14} color={Colors.secondaryAccent} />
      </View>
      <Text style={styles.welcomeFeatureText}>{text}</Text>
    </View>
  );
}

function StepSelf({ myName, setMyName }: { myName: string; setMyName: (v: string) => void }) {
  const Colors = useColors();
  const styles = useMemo(() => useStyles(Colors), [Colors]);
  return (
    <View style={styles.stepCenter}>
      <View style={[styles.welcomeIconRing, { backgroundColor: 'rgba(74, 222, 128, 0.1)', borderColor: Colors.success }]}>
        <FontAwesome name="user" size={28} color={Colors.success} />
      </View>
      <Text style={styles.stepTitle}>What should we call you?</Text>
      <Text style={styles.stepSubtitle}>
        This creates your personal "Me" profile — a self-entry in your contact list for
        reflections and self-journaling.
      </Text>

      <TextInput
        style={styles.nameInput}
        placeholder="Your first name..."
        placeholderTextColor={Colors.textMuted}
        value={myName}
        onChangeText={setMyName}
        autoFocus
        autoCapitalize="words"
      />

      <View style={styles.tipCard}>
        <FontAwesome name="lightbulb-o" size={14} color={Colors.warning} />
        <Text style={styles.tipText}>
          Your "Me" profile lets you write journal entries, shower thoughts,
          and reflections that aren't about any specific person.
        </Text>
      </View>
    </View>
  );
}

function StepSeedContacts({
  contacts,
  onUpdate,
  onAdd,
  onRemove,
}: {
  contacts: SeedContact[];
  onUpdate: (i: number, field: keyof SeedContact, value: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  const Colors = useColors();
  const styles = useMemo(() => useStyles(Colors), [Colors]);
  const RELATIONSHIPS = ['friend', 'family', 'colleague', 'acquaintance', 'mentor'];
  const FREQUENCIES: { key: TargetLevel; label: string }[] = [
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'quarterly', label: 'Quarterly' },
  ];

  return (
    <View style={styles.stepCenter}>
      <View style={[styles.welcomeIconRing, { backgroundColor: 'rgba(185, 217, 235, 0.1)', borderColor: Colors.secondaryAccent }]}>
        <FontAwesome name="users" size={24} color={Colors.secondaryAccent} />
      </View>
      <Text style={styles.stepTitle}>Who matters most?</Text>
      <Text style={styles.stepSubtitle}>
        Add a few people you want to stay connected with. You can always add more later.
      </Text>

      {contacts.map((c, i) => (
        <View key={i} style={styles.seedCard}>
          <View style={styles.seedHeaderRow}>
            <Text style={styles.seedLabel}>Person {i + 1}</Text>
            {contacts.length > 1 && (
              <TouchableOpacity onPress={() => onRemove(i)}>
                <FontAwesome name="times" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            style={styles.seedInput}
            placeholder="Name..."
            placeholderTextColor={Colors.textMuted}
            value={c.name}
            onChangeText={(v) => onUpdate(i, 'name', v)}
            autoCapitalize="words"
          />

          {/* Relationship pills */}
          <View style={styles.seedPillRow}>
            {RELATIONSHIPS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.seedPill, c.relationship === r && styles.seedPillActive]}
                onPress={() => onUpdate(i, 'relationship', r)}
              >
                <Text style={[styles.seedPillText, c.relationship === r && styles.seedPillTextActive]}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Frequency pills */}
          <View style={styles.seedPillRow}>
            {FREQUENCIES.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.seedPill, c.targetLevel === f.key && styles.seedPillActiveBlue]}
                onPress={() => onUpdate(i, 'targetLevel', f.key)}
              >
                <Text style={[styles.seedPillText, c.targetLevel === f.key && styles.seedPillTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addPersonBtn} onPress={onAdd} activeOpacity={0.7}>
        <FontAwesome name="plus" size={12} color={Colors.secondaryAccent} />
        <Text style={styles.addPersonText}>Add another person</Text>
      </TouchableOpacity>
    </View>
  );
}

function StepGoals({
  goal,
  setGoal,
  contactCount,
  myName,
}: {
  goal: 'grow' | 'maintain' | 'trim';
  setGoal: (g: 'grow' | 'maintain' | 'trim') => void;
  contactCount: number;
  myName: string;
}) {
  const Colors = useColors();
  const styles = useMemo(() => useStyles(Colors), [Colors]);
  const GOALS = [
    {
      key: 'grow' as const,
      icon: 'rocket',
      title: 'Grow',
      desc: 'I want to expand my network and meet new people.',
      color: Colors.success,
    },
    {
      key: 'maintain' as const,
      icon: 'balance-scale',
      title: 'Maintain',
      desc: 'I want to nurture existing relationships without overcommitting.',
      color: Colors.secondaryAccent,
    },
    {
      key: 'trim' as const,
      icon: 'leaf',
      title: 'Simplify',
      desc: 'I want to focus on my closest relationships and let distant ones go.',
      color: Colors.warning,
    },
  ];

  return (
    <View style={styles.stepCenter}>
      <View style={[styles.welcomeIconRing, { backgroundColor: 'rgba(167, 139, 250, 0.1)', borderColor: '#A78BFA' }]}>
        <FontAwesome name="bullseye" size={24} color="#A78BFA" />
      </View>
      <Text style={styles.stepTitle}>What's your goal?</Text>
      <Text style={styles.stepSubtitle}>
        This helps WWLO calibrate your reconnection reminders and capacity dashboard.
      </Text>

      <View style={styles.goalCards}>
        {GOALS.map((g) => (
          <TouchableOpacity
            key={g.key}
            style={[styles.goalCard, goal === g.key && { borderColor: g.color, backgroundColor: g.color + '10' }]}
            onPress={() => setGoal(g.key)}
            activeOpacity={0.7}
          >
            <View style={styles.goalCardHeader}>
              <View style={[styles.goalIconCircle, { backgroundColor: g.color + '20' }]}>
                <FontAwesome name={g.icon as any} size={16} color={g.color} />
              </View>
              <Text style={[styles.goalTitle, goal === g.key && { color: g.color }]}>{g.title}</Text>
              {goal === g.key && (
                <FontAwesome name="check-circle" size={18} color={g.color} style={{ marginLeft: 'auto' }} />
              )}
            </View>
            <Text style={styles.goalDesc}>{g.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Ready to start</Text>
        <Text style={styles.summaryText}>
          {myName ? `Hey ${myName}! ` : ''}You're starting with {contactCount} contact{contactCount !== 1 ? 's' : ''} in "{GOALS.find(g => g.key === goal)?.title}" mode. You can change any of this later in Settings.
        </Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const useStyles = (Colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 60,
  },

  // Progress
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 40,
    marginBottom: 8,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderSubtle,
  },
  progressDotActive: {
    backgroundColor: Colors.primaryAccent,
  },
  progressDotComplete: {
    backgroundColor: Colors.secondaryAccent,
  },
  stepIndicator: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },

  // Content
  contentWrapper: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // Navigation
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  navBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navBackText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  navNext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryAccent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  navNextText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  navFinish: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  navFinishText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  skipBtn: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  skipText: {
    color: Colors.textMuted,
    fontSize: 12,
  },

  // Shared step styles
  stepCenter: {
    alignItems: 'center',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  stepTitle: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },

  // Step 0: Welcome
  welcomeIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(15, 77, 146, 0.12)',
    borderWidth: 2,
    borderColor: Colors.primaryAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  welcomeFeatures: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  welcomeFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surfaceCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  welcomeFeatureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 77, 146, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeFeatureText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  welcomeNote: {
    color: Colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Step 1: Self profile
  nameInput: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'center',
    marginBottom: 20,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
    width: '100%',
  },
  tipText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },

  // Step 2: Seed contacts
  seedCard: {
    width: '100%',
    backgroundColor: Colors.surfaceCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  seedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seedLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seedInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 10,
  },
  seedPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  seedPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  seedPillActive: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderColor: Colors.success,
  },
  seedPillActiveBlue: {
    backgroundColor: 'rgba(15, 77, 146, 0.25)',
    borderColor: Colors.primaryAccent,
  },
  seedPillText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  seedPillTextActive: {
    color: '#FFFFFF',
  },
  addPersonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    borderStyle: 'dashed',
    width: '100%',
  },
  addPersonText: {
    color: Colors.secondaryAccent,
    fontSize: 13,
    fontWeight: '600',
  },

  // Step 3: Goals
  goalCards: {
    width: '100%',
    gap: 10,
    marginBottom: 20,
  },
  goalCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  goalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  goalIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  goalDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginLeft: 42,
  },

  // Summary
  summaryCard: {
    width: '100%',
    backgroundColor: 'rgba(15, 77, 146, 0.08)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  summaryTitle: {
    color: Colors.secondaryAccent,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  summaryText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
