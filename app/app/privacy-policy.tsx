import React, { useMemo } from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useColors } from '@/lib/ThemeProvider';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyPolicyScreen() {
  const Colors = useColors();
  const styles = useStyles(Colors);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} accessibilityRole="header">Privacy Policy</Text>
        <Text style={styles.lastUpdated}>Last Updated: May 2026</Text>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">1. Introduction</Text>
          <Text style={styles.paragraph}>
            CLR Technologies Inc. (CLR), "The Company", is committed to protecting the privacy and security of personal information. This privacy policy outlines how we collect, use, disclose, and safeguard your information when you interact with us, including through our website, services, and other platforms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">2. Information Collection</Text>
          <Text style={styles.paragraph}>
            We collect information in the following ways:
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Directly from You:</Text> Information you provide when engaging with our services, including but not limited to, name, address, contact details, service company information, and service requirements.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Automatically Collected Information:</Text> We may collect information automatically when you visit our website, such as IP address, browser type, and usage data.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>From Third Parties:</Text> Information we may receive from other sources, such as business partners and social networks.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">2.1 User-Generated Content About Third Parties</Text>
          <Text style={styles.paragraph}>
            WWLO PRM is a personal journal that allows you to record notes about your interactions with other people. These notes may contain names, contact information, and personal details about individuals who have not directly interacted with our Service and have not agreed to this Privacy Policy.
          </Text>
          <Text style={styles.paragraph}>
            You are the sole data controller for any third-party information you enter. We process this information only to provide the Service to you. We do not independently contact, profile, or market to individuals mentioned in your entries.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">2.2 Sensitive Categories of Information</Text>
          <Text style={styles.paragraph}>
            We do not request, require, or encourage you to input sensitive personal information such as health records, financial data, government identifiers (e.g., Social Security numbers), or similar regulated data. If you choose to include such information in your entries, you do so at your own risk.
          </Text>
          <Text style={styles.paragraph}>
            We recommend using the Vault encryption feature for any content you consider sensitive. Encrypted entries are stored as opaque blobs that cannot be read or processed by CLR Technologies or its service providers.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">3. Use of Information</Text>
          <Text style={styles.paragraph}>
            The information we collect is used to:
          </Text>
          <Text style={styles.listItem}>• Provide, operate, and maintain our services</Text>
          <Text style={styles.listItem}>• Improve, personalize, and expand our services</Text>
          <Text style={styles.listItem}>• Understand and analyze how you use our services</Text>
          <Text style={styles.listItem}>• Develop new products, services, features, and functionality</Text>
          <Text style={styles.listItem}>• Communicate with you, either directly or through one of our partners, for customer service, to provide you with updates and other information relating to the website, and for marketing and promotional purposes</Text>
          <Text style={styles.listItem}>• Send you emails</Text>
          <Text style={styles.listItem}>• Find and prevent fraud</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">4. Sharing of Information</Text>
          <Text style={styles.paragraph}>
            We may share information as follows:
          </Text>
          <Text style={styles.listItem}>• With service providers who assist us in providing the services</Text>
          <Text style={styles.listItem}>• With business partners to offer you certain products, services, or promotions</Text>
          <Text style={styles.listItem}>• With other users when you share personal information or otherwise interact in public areas with other users</Text>
          <Text style={styles.listItem}>• As legally required, such as to comply with a subpoena, or similar legal process</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">5. Data Security</Text>
          <Text style={styles.paragraph}>
            We are committed to ensuring the security of your data. We implement a variety of security measures to maintain the safety of your personal information.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">6. Your Data Rights</Text>
          <Text style={styles.paragraph}>
            You have the right to:
          </Text>
          <Text style={styles.listItem}>• Request access, correction, or deletion of your personal data</Text>
          <Text style={styles.listItem}>• Object to processing of your personal data</Text>
          <Text style={styles.listItem}>• Request data portability</Text>
          <Text style={styles.listItem}>• Withdraw your consent at any time where the Company relied on your consent to process your personal information</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">7. Third-Party Links</Text>
          <Text style={styles.paragraph}>
            Our website may contain links to third-party websites. We are not responsible for the privacy practices of these external sites.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">8. Children's Privacy</Text>
          <Text style={styles.paragraph}>
            Our Service does not address anyone under the age of 18 ("Children"). We do not knowingly collect personally identifiable information from anyone under the age of 18. If you are a parent or guardian and you are aware that your child has provided us with Personal Data, please contact us.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">9. Changes to This Privacy Policy</Text>
          <Text style={styles.paragraph}>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">10. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have any questions about this Privacy Policy, please contact us via our contact form or at the address below.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerContact}>
            CLR Technologies Inc | Connecticut C Corp | Founded 2018{'\n'}
            Phone: +1 (248) 971-0535{'\n'}
            General Inquiries: dev@clrtechnologies.co{'\n'}
          </Text>
          <Text style={styles.footerText}>
            Expert Guidance. Innovative Strategies. Lasting Impact.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function useStyles(Colors: any) {
  return useMemo(() => StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    container: {
      flex: 1,
    },
    content: {
      padding: 24,
      paddingBottom: 40,
    },
    title: {
      color: Colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    lastUpdated: {
      color: Colors.textMuted,
      fontSize: 14,
      marginBottom: 32,
    },
    section: {
      marginBottom: 24,
    },
    h2: {
      color: Colors.secondaryAccent,
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 12,
    },
    paragraph: {
      color: Colors.textPrimary,
      fontSize: 15,
      lineHeight: 24,
      marginBottom: 8,
    },
    bold: {
      fontWeight: 'bold',
    },
    listItem: {
      color: Colors.textPrimary,
      fontSize: 15,
      lineHeight: 24,
      paddingLeft: 12,
      marginBottom: 4,
    },
    footer: {
      marginTop: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: Colors.border,
    },
    footerContact: {
      color: Colors.textMuted,
      fontSize: 14,
      lineHeight: 22,
      marginBottom: 10,
    },
    footerText: {
      color: Colors.textMuted,
      fontSize: 14,
      fontStyle: 'italic',
    },
  }), [Colors]);
}
