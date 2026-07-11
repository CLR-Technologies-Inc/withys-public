import React, { useMemo } from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useColors } from '@/lib/ThemeProvider';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TermsScreen() {
  const Colors = useColors();
  const styles = useStyles(Colors);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} accessibilityRole="header">Terms of Service</Text>
        <Text style={styles.lastUpdated}>Last Updated: May 2026</Text>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">Preamble</Text>
          <Text style={styles.paragraph}>
            These Terms of Service ("Terms") govern the engagement between CLR Technologies Inc ("RCS", "Consultant", "we", "us", or "our") and the client ("Client", "you", or "your") for the provision of consulting services, software development, and software licensing. By engaging with or using WWLO PRM ("Service" or "Software"), you agree to be bound by these Terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">1. Definitions</Text>
          <Text style={styles.paragraph}>
            • "Consultant IP" means all intellectual property owned or developed by RCS prior to or independently of this engagement, as well as any generic software code, frameworks, or methodologies developed by RCS.{'\n'}
            • "Deliverables" means the specific reports, software, and other materials to be provided by RCS to Client.{'\n'}
            • "Services" means the consulting, development, and support services provided by RCS.{'\n'}
            • "Software" means any software products or platforms provided by RCS to Client, whether as a standalone product or as part of the Services.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">2. Scope of Services</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>2.1 Consulting Services:</Text> RCS shall provide consulting services as described in the applicable Statement of Work.{'\n'}
            <Text style={styles.bold}>2.2 Software Services:</Text> RCS may provide software development, implementation, or support services.{'\n'}
            <Text style={styles.bold}>2.3 Independent Contractor Status:</Text> RCS is an independent contractor. Nothing in these Terms shall be construed to create a partnership, joint venture, or employer-employee relationship.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">3. Engagement Terms</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>3.1 Statements of Work:</Text> Each engagement shall be governed by a Statement of Work detailing the scope, timeline, and fees.{'\n'}
            <Text style={styles.bold}>3.2 Change Orders:</Text> Any changes to the scope of Services must be documented in a written Change Order signed by both parties.{'\n'}
            <Text style={styles.bold}>3.3 Client Cooperation:</Text> Client shall provide timely access to all Client Materials, personnel, systems, and facilities reasonably necessary for RCS to perform the Services. RCS shall not be liable for delays or failures in performance caused in whole or in part by Client's failure to furnish Client Materials or cooperation in a timely manner.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">4. Fees and Payment</Text>
          <Text style={styles.paragraph}>
            Client shall pay RCS the fees set forth in the applicable Statement of Work. Unless otherwise specified, invoices are due within thirty (30) days of the invoice date. Late payments shall accrue interest at the rate of 1.5% per month or the maximum rate permitted by applicable law, whichever is less. All fees are non-refundable once Services have been rendered.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">5. Confidentiality</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>5.1 Obligations:</Text> Each party (as "Recipient") shall protect and keep confidential all Confidential Information disclosed by the other party (as "Discloser") and shall not use or disclose such Confidential Information except for the purposes of performing or receiving Services under these Terms.{'\n'}
            <Text style={styles.bold}>5.2 Standard of Care:</Text> Each party shall protect the other party's Confidential Information using the same degree of care it uses to protect its own confidential information of a similar nature, and in no event less than a reasonable standard of care. Each party shall limit disclosure of the other party's Confidential Information to employees and consultants who have a need to know such information in connection with the Services.{'\n'}
            <Text style={styles.bold}>5.3 Exclusions:</Text> Confidential Information does not include information that: (a) is or becomes publicly available through no fault of the Recipient; (b) was rightfully known to the Recipient prior to disclosure; (c) is independently developed by the Recipient without use of the Discloser's Confidential Information; or (d) is rightfully received from a third party without restriction on disclosure.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">6. Intellectual Property</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>6.1 Consultant IP:</Text> RCS retains all right, title, and interest in Consultant IP, including any improvements, revisions, and derivatives of preexisting Consultant IP and any generic software code or features developed during an engagement, provided such materials are generic in nature and do not contain Client Confidential Information.{'\n'}
            <Text style={styles.bold}>6.2 Client Ownership of Deliverables:</Text> Upon full payment of all fees, Client shall own the copyright in the specific Deliverables created uniquely for Client.{'\n'}
            <Text style={styles.bold}>6.3 License to Consultant IP:</Text> RCS grants Client a non-exclusive, perpetual, royalty-free license to use any Consultant IP incorporated into the Deliverables solely for Client's internal business purposes.{'\n'}
            <Text style={styles.bold}>6.4 Client Feedback:</Text> Client may provide feedback or suggestions regarding the Services or Software. RCS may use such feedback without restriction or obligation.{'\n'}
            <Text style={styles.bold}>6.5 Trademarks and Service Marks:</Text> Neither party shall use the other party's trademarks or service marks without prior written consent.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">7. Warranties</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>7.1 Limited Warranty - Services:</Text> RCS warrants that Services will be performed in a professional and workmanlike manner.{'\n'}
            <Text style={styles.bold}>7.2 Software Warranty Disclaimer:</Text> EXCEPT AS EXPRESSLY PROVIDED, ALL SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND.{'\n'}
            <Text style={styles.bold}>7.3 General Disclaimer:</Text> EXCEPT AS EXPRESSLY SET FORTH HEREIN, RCS DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">8. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>8.1 No Consequential Damages:</Text> NEITHER PARTY SHALL BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES.{'\n'}
            <Text style={styles.bold}>8.2 Cap on Liability:</Text> RCS'S TOTAL LIABILITY UNDER THESE TERMS SHALL NOT EXCEED THE TOTAL FEES PAID BY CLIENT TO RCS UNDER THE APPLICABLE SOW IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">9. Indemnification</Text>
          <Text style={styles.paragraph}>
            Each party shall indemnify and hold harmless the other party from and against any third-party claims arising from the indemnifying party's gross negligence, willful misconduct, or violation of applicable law.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">10. End User License Agreement (Software)</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>10.1 Grant of License:</Text> RCS grants Client a non-exclusive, non-transferable license to use the Software for its internal business purposes during the term set forth in the SOW.{'\n'}
            <Text style={styles.bold}>10.2 Restrictions:</Text> Client shall not reverse engineer, decompile, or attempt to derive the source code of the Software.{'\n'}
            <Text style={styles.bold}>10.3 Intellectual Property:</Text> All Software and related documentation are the intellectual property of RCS or its licensors.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">11. User Content and Accounts</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>11.1 User Content:</Text> Client is responsible for all content uploaded or generated using the Software.{'\n'}
            <Text style={styles.bold}>11.2 Accounts and Security:</Text> Client is responsible for maintaining the confidentiality of its account credentials.{'\n'}
            <Text style={styles.bold}>11.3 Sensitive Data Disclaimer:</Text> The Service is designed for personal relationship notes and is NOT intended for the storage, processing, or transmission of the following categories of information ("Sensitive Data"): Social Security numbers or government-issued identifiers; protected health information (PHI) as defined under HIPAA; financial account numbers, credit card numbers, or tax records; criminal records or legal case information; biometric data; or information about minors under 13. You acknowledge that by entering any Sensitive Data into the Service, you do so at your own risk and sole responsibility. CLR Technologies is not a covered entity under HIPAA, is not a financial institution under GLBA, and does not comply with sector-specific data protection regulations. We expressly disclaim any liability arising from your decision to input Sensitive Data into the Service.{'\n'}
            <Text style={styles.bold}>11.4 Third-Party Information:</Text> The Service allows you to record notes about other individuals. You represent and warrant that your use of the Service to store information about third parties complies with all applicable laws, including privacy and data protection laws in your jurisdiction. You are solely responsible for obtaining any necessary consent from third parties whose information you store in the Service. CLR Technologies shall not be liable for any claims arising from your storage of third-party personal information.{'\n'}
            <Text style={styles.bold}>11.5 Prohibited Uses:</Text> You shall not use the Service to: (a) store information in violation of any applicable law; (b) collect or process personal data of others for commercial purposes without their consent; or (c) store data subject to regulatory compliance requirements (HIPAA, PCI-DSS, SOX, GLBA) unless you independently ensure compliance.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">12. Injunctive Relief</Text>
          <Text style={styles.paragraph}>
            Either party may seek injunctive relief to prevent the unauthorized use or disclosure of its Confidential Information or Intellectual Property.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">13. Force Majeure</Text>
          <Text style={styles.paragraph}>
            Neither party shall be liable for delays or failures in performance caused by events beyond its reasonable control, including but not limited to acts of God, war, terrorism, or widespread internet outages.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">14. Term and Termination</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>14.1 Term:</Text> These Terms shall remain in effect for the duration of any active SOW.{'\n'}
            <Text style={styles.bold}>14.2 Termination for Breach:</Text> Either party may terminate these Terms or any SOW for a material breach by the other party that remains uncured for thirty (30) days following written notice.{'\n'}
            <Text style={styles.bold}>14.3 Termination for Convenience:</Text> Unless otherwise specified, either party may terminate an SOW for convenience upon sixty (60) days' written notice.{'\n'}
            <Text style={styles.bold}>14.4 Effect of Termination:</Text> Upon termination, Client shall pay for all Services rendered and Deliverables provided through the effective date of termination.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">15. General Provisions</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>15.1 Governing Law and Venue:</Text> These Terms shall be governed by the laws of the State of Connecticut, without regard to its conflict of laws principles. Any disputes shall be resolved in the state or federal courts located in Connecticut.{'\n'}
            <Text style={styles.bold}>15.2 Assignment:</Text> Neither party may assign any rights or obligations under these Terms without the prior written consent of the other party, except that RCS may assign its rights and obligations with notice to Client in connection with any merger, consolidation, reorganization, change in control, or sale of substantially all assets related to these Terms.{'\n'}
            <Text style={styles.bold}>15.3 Entire Agreement:</Text> These Terms, together with any executed Statements of Work and Change Orders, constitute the entire agreement between the parties and supersede all prior agreements and understandings, whether written or oral, relating to the subject matter hereof.{'\n'}
            <Text style={styles.bold}>15.4 Amendments:</Text> RCS reserves the right to modify these Terms at any time. Material changes will be communicated to Client in writing. Client's continued use of Services or Software following notification of changes constitutes acceptance of the modified Terms.{'\n'}
            <Text style={styles.bold}>15.5 Severability:</Text> If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.{'\n'}
            <Text style={styles.bold}>15.6 Waiver:</Text> The failure of either party to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision.
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
      backgroundColor: Colors.background, // Fixed to use Colors.background instead of hardcoded #000000
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
    },
    bold: {
      fontWeight: 'bold',
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
