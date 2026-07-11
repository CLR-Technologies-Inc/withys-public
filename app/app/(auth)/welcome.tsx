import React, { useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { AppLogo } from '@/components/AppLogo';
import { useColors } from '@/lib/ThemeProvider';
import { useAuth } from '@/lib/AuthProvider';
// @ts-ignore — JSON import for build-time version
import appJson from '../../app.json';

// ── Animated feature card ────────────────────────────────────────────────────

function FeatureCard({
  icon,
  title,
  description,
  color,
  delay,
}: {
  icon: string;
  title: string;
  description: string;
  color: string;
  delay: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, fadeAnim, slideAnim]);

  const s = useWelcomeStyles();

  return (
    <Animated.View
      style={[
        s.featureCard,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={[s.featureIconCircle, { backgroundColor: color + '20' }]}>
        <FontAwesome name={icon as any} size={20} color={color} />
      </View>
      <View style={s.featureContent}>
        <Text style={s.featureTitle}>{title}</Text>
        <Text style={s.featureDesc}>{description}</Text>
      </View>
    </Animated.View>
  );
}

// ── Main Welcome Screen ──────────────────────────────────────────────────────

export default function WelcomeScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const logoFade = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;

  const handleGetStarted = async () => {
    await signIn('local@prm.local');
  };

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoFade, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 8, useNativeDriver: true }),
      ]),
      Animated.timing(subtitleFade, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [logoFade, logoScale, subtitleFade]);

  const colors = useColors();
  const styles = useWelcomeStyles();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Section ── */}
        <View style={styles.heroSection}>
          {/* Decorative glow */}
          <View style={styles.glowCircle} />

          <Animated.View
            style={[
              styles.logoContainer,
              { opacity: logoFade, transform: [{ scale: logoScale }] },
            ]}
          >
            <AppLogo size={88} />
            <Text style={styles.brandName}>WWLO</Text>
            <Text style={styles.brandPronunciation}>/ WIH-loh /</Text>
          </Animated.View>

          <Animated.View style={{ opacity: subtitleFade, alignItems: 'center' }}>
            <Text style={styles.tagline}>Where We Left Off</Text>
            <Text style={styles.heroDescription}>
              A private journal for the relationships that matter most.
              Remember every conversation, reconnect with intention, and
              never lose track of the people in your life.
            </Text>

            {/* Primary CTA — high on page */}
            <View style={styles.heroCtaGroup}>
              <TouchableOpacity
                style={styles.heroCta}
                onPress={handleGetStarted}
                activeOpacity={0.8}
              >
                <Text style={styles.heroCtaText}>Get Started</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>

        {/* ── Divider ── */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Why WWLO?</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ── Feature Cards ── */}
        <View style={styles.featuresSection}>
          <FeatureCard
            icon="refresh"
            title="Pick Up Where You Left Off"
            description="Remember what you talked about last time. Start every interaction with confidence."
            color="#4ADE80"
            delay={200}
          />
          <FeatureCard
            icon="heart"
            title="Set Relationship Intentions"
            description="Define what you want from each relationship: needs, wants, and nice-to-haves, and then track your progress over time."
            color="#F87171"
            delay={400}
          />
          <FeatureCard
            icon="bell"
            title="Reconnect Reminders"
            description="Set your own pace for each person. WWLO gently reminds you when someone is overdue for a catch-up."
            color={colors.warning}
            delay={600}
          />
          <FeatureCard
            icon="lock"
            title="Private by Design"
            description="Your journal is yours. End-to-end encryption, local-first AI, and open-source code you can audit."
            color={colors.secondaryAccent}
            delay={800}
          />
          <FeatureCard
            icon="users"
            title="Understand Your Network"
            description="See the shape of your social world: who you're investing in, who's fading, and whether your commitments match your capacity."
            color="#A78BFA"
            delay={1000}
          />
          <FeatureCard
            icon="download"
            title="Install as App"
            description="Install WWLO directly to your home screen for a fast, app-like experience. No app store required."
            color="#38BDF8"
            delay={1200}
          />
        </View>

        {/* ── Commitment Banner ── */}
        <View style={styles.commitmentCard}>
          <FontAwesome name="code-fork" size={18} color={colors.secondaryAccent} />
          <Text style={styles.commitmentTitle}>Free & Open Source</Text>
          <Text style={styles.commitmentDesc}>
            Self-host for free, forever. Get lifetime offline mode for a one-time $5 payment.
            If you want cloud sync, simply pay for what you use. No subscriptions. No ads. No data selling.
          </Text>
        </View>

        {/* ── CTA Buttons ── */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.ctaPrimary}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaPrimaryText}>Get Started</Text>
            <FontAwesome name="arrow-right" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Built with care for people who care about people.
          </Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>v{appJson.expo.version}</Text>
          </View>
          <View style={styles.footerLinks}>
            <TouchableOpacity
              style={styles.termsLink}
              onPress={() => router.push('/terms' as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.termsLinkText}>Terms & Conditions</Text>
            </TouchableOpacity>
            <Text style={styles.footerSeparator}>·</Text>
            <TouchableOpacity
              style={styles.termsLink}
              onPress={() => router.push('/privacy-policy' as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.termsLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function useWelcomeStyles() {
  const colors = useColors();
  return useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: 60,
    },

    // Hero
    heroSection: {
      alignItems: 'center',
      paddingTop: 80,
      paddingHorizontal: 24,
      paddingBottom: 40,
      position: 'relative',
      overflow: 'hidden',
    },
    glowCircle: {
      position: 'absolute',
      top: 20,
      width: 300,
      height: 300,
      borderRadius: 150,
      backgroundColor: colors.primaryAccent,
      opacity: 0.08,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
    brandName: {
      fontSize: 44,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: 6,
    },
    brandPronunciation: {
      fontSize: 16,
      color: colors.textMuted,
      fontStyle: 'italic',
      marginTop: 4,
    },
    tagline: {
      fontSize: 22,
      fontWeight: '600',
      color: colors.secondaryAccent,
      textAlign: 'center',
      marginBottom: 16,
    },
    heroDescription: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      maxWidth: 480,
    },
    heroCtaGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      marginTop: 24,
    },
    heroCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryAccent,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 28,
    },
    heroCtaText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '800',
    },
    heroCtaSecondary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceCard,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroCtaSecondaryText: {
      color: colors.textPrimary,
      fontSize: 17,
      fontWeight: '800',
    },

    // Divider
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      marginVertical: 32,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginHorizontal: 16,
    },

    // Features
    featuresSection: {
      paddingHorizontal: 20,
      gap: 12,
      maxWidth: 560,
      alignSelf: 'center',
      width: '100%',
    },
    featureCard: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceCard,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 14,
      alignItems: 'flex-start',
    },
    featureIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureContent: {
      flex: 1,
    },
    featureTitle: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '700',
      marginBottom: 4,
    },
    featureDesc: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
    },

    // Commitment
    commitmentCard: {
      alignItems: 'center',
      marginTop: 36,
      marginHorizontal: 20,
      padding: 24,
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      maxWidth: 560,
      alignSelf: 'center',
      width: '100%',
      gap: 8,
    },
    commitmentTitle: {
      color: colors.textPrimary,
      fontSize: 17,
      fontWeight: '700',
    },
    commitmentDesc: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
    },

    // CTA
    ctaSection: {
      alignItems: 'center',
      marginTop: 40,
      paddingHorizontal: 20,
      gap: 12,
      maxWidth: 560,
      alignSelf: 'center',
      width: '100%',
    },
    ctaPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: colors.primaryAccent,
      borderRadius: 14,
      paddingVertical: 16,
      width: '100%',
    },
    ctaPrimaryText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '800',
    },
    ctaSecondary: {
      paddingVertical: 12,
    },
    ctaSecondaryText: {
      color: colors.textMuted,
      fontSize: 14,
    },

    // Footer
    footer: {
      marginTop: 48,
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    footerText: {
      color: colors.textMuted,
      fontSize: 12,
      fontStyle: 'italic',
    },
    versionBadge: {
      marginTop: 10,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: colors.border,
    },
    versionText: {
      color: colors.textMuted,
      fontSize: 11,
      fontFamily: 'SpaceMono',
      letterSpacing: 0.5,
    },
    termsLink: {
      marginTop: 12,
      paddingVertical: 4,
    },
    termsLinkText: {
      color: colors.textMuted,
      fontSize: 12,
      textDecorationLine: 'underline',
    },
    footerLinks: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      gap: 8,
    },
    footerSeparator: {
      color: colors.textMuted,
      fontSize: 12,
    },
  }), [colors]);
}
