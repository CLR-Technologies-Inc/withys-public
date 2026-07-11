import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useColors } from '@/lib/ThemeProvider';
import { useEntries, useContacts } from '@/lib/hooks';
import { useJournalStore } from '@/lib/store';

export default function UsageReportScreen() {
  const Colors = useColors();
  const styles = useStyles(Colors);
  const { data: entries = [] } = useEntries();
  const { data: contacts = [] } = useContacts();
  const { offlineModeEnabled } = useJournalStore();

  const baseFee = 1.00;
  const entriesCost = entries.length * 0.005;
  const contactsCost = contacts.length * 0.02;
  const margin = (baseFee + entriesCost + contactsCost) * 0.30;
  const estimatedTotal = Math.ceil((baseFee + entriesCost + contactsCost) * 1.30);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Usage Report & Projection</Text>
      <Text style={styles.description}>
        This is an estimation of your next month's bill based on your current usage of cloud sync features.
      </Text>
      
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Base Sync Fee</Text>
          <Text style={styles.rowValue}>$1.00</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Entries ({entries.length} @ $0.005)</Text>
          <Text style={styles.rowValue}>${entriesCost.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Contacts ({contacts.length} @ $0.02)</Text>
          <Text style={styles.rowValue}>${contactsCost.toFixed(2)}</Text>
        </View>
        <View style={[styles.row, { borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={styles.rowLabel}>Relative Usage Margin (+30%)</Text>
          <Text style={styles.rowValue}>${margin.toFixed(2)}</Text>
        </View>
        <View style={[styles.row, { borderBottomWidth: 0, paddingVertical: 12 }]}>
          <Text style={[styles.rowLabel, { fontWeight: 'bold' }]}>Estimated Total (Rounded Up)</Text>
          <Text style={[styles.rowValue, { color: offlineModeEnabled ? Colors.success : Colors.vaultAccent, fontWeight: 'bold' }]}>
            {offlineModeEnabled ? '$0.00 (Offline)' : `$${estimatedTotal}.00`}
          </Text>
        </View>
        {offlineModeEnabled && (
          <Text style={styles.offlineText}>
            Your account is in Offline Mode. You are not incurring cloud sync charges.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function useStyles(Colors: any) {
  return useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 20, gap: 16 },
    title: { fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary },
    description: { fontSize: 14, color: Colors.textMuted, lineHeight: 20 },
    card: { backgroundColor: Colors.surfaceCard, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0 },
    rowLabel: { color: Colors.textPrimary, flex: 1 },
    rowValue: { color: '#B9D9EB' },
    offlineText: { color: Colors.success, fontSize: 12, marginTop: 8 },
  }), [Colors]);
}
