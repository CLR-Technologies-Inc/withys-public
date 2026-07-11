import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColors } from '@/lib/ThemeProvider';

export default function BillingScreen() {
  const router = useRouter();
  const Colors = useColors();
  const styles = useStyles(Colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.innerContent}>
        <View style={styles.heroCard}>
          <View style={styles.iconCircle}>
            <FontAwesome name="credit-card" size={28} color={Colors.secondaryAccent} />
          </View>
          <Text style={styles.heroTitle}>Billing & Subscription</Text>
          <Text style={styles.heroSubtext}>
            Subscription management is coming soon. WWLO PRM is currently free during the beta period.
          </Text>
        </View>

        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>Beta Access</Text>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>ACTIVE</Text>
            </View>
          </View>
          <Text style={styles.planPrice}>Free</Text>
          <Text style={styles.planDesc}>Full access to all features during the beta period.</Text>

          <View style={styles.featureList}>
            {[
              'Unlimited journal entries',
              'Contact management',
              'AI-powered briefings',
              'Encrypted vault',
              'Email & markdown ingestion',
              'Social network graph',
            ].map((feature, i) => (
              <View key={i} style={styles.featureRow}>
                <FontAwesome name="check" size={12} color={Colors.success} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.infoCard}>
          <FontAwesome name="info-circle" size={14} color={Colors.textMuted} />
          <Text style={styles.infoText}>
            You'll be notified before any billing changes take effect. Your data is always yours to export.
          </Text>
        </View>

        <View style={[styles.infoCard, { marginTop: -10 }]}>
          <FontAwesome name="calendar" size={14} color={Colors.textMuted} />
          <Text style={styles.infoText}>
            In the future, the free version will include a maximum of 10 contacts and 30 entries per contact.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function useStyles(Colors: any) {
  return useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 20 },
    innerContent: { gap: 20 },

    heroCard: {
      alignItems: 'center',
      paddingVertical: 32,
      gap: 12,
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: Colors.primaryAccent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    heroTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: Colors.textPrimary,
    },
    heroSubtext: {
      fontSize: 14,
      color: Colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: 300,
    },

    planCard: {
      backgroundColor: Colors.surfaceCard,
      borderRadius: 14,
      padding: 20,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    planHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    planName: {
      fontSize: 18,
      fontWeight: '700',
      color: Colors.textPrimary,
    },
    activeBadge: {
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    activeBadgeText: {
      color: Colors.success,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    planPrice: {
      fontSize: 28,
      fontWeight: '800',
      color: Colors.secondaryAccent,
      marginBottom: 4,
    },
    planDesc: {
      fontSize: 13,
      color: Colors.textMuted,
      marginBottom: 16,
    },
    featureList: { gap: 10 },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    featureText: {
      fontSize: 14,
      color: Colors.textSecondary,
    },

    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: Colors.surfaceCard,
      borderRadius: 10,
      padding: 14,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      color: Colors.textMuted,
      lineHeight: 18,
    },
  }), [Colors]);
}
