import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useRouter } from 'expo-router';
import { Text, ActivityIndicator, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Animatable from 'react-native-animatable';
import { useOnboarding } from '../contexts/onboarding';
import { resetAppState } from '../utils/splashDebug';

export default function SettingsScreen() {
  const router = useRouter();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const { setHasCompletedOnboarding } = useOnboarding();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', content: '' });

  const handleResetOnboarding = () => {
    setHasCompletedOnboarding(false);
    router.replace('/(onboarding)');
  };

  const handleResetAppState = async () => {
    const success = await resetAppState();
    if (success) {
      Alert.alert(
        'App State Reset',
        'App state has been reset. Please restart the app for changes to take effect.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Reset Failed',
        'Failed to reset app state. Please try again or restart your app manually.',
        [{ text: 'OK' }]
      );
    }
  };

  // Function to toggle section open/closed
  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const showModal = (type: 'terms' | 'privacy') => {
    if (type === 'terms') {
      setModalContent({
        title: 'Terms of Service',
        content: 'TERMS OF SERVICE AGREEMENT\n\n' +
                'Last Updated: June 15, 2025\n\n' +
                'Welcome to NookPay. Please read these Terms of Service ("Terms") carefully before using our mobile application and services.\n\n' +
                '1. ACCEPTANCE OF TERMS\n\n' +
                'By accessing or using NookPay, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, please do not use our services. These Terms constitute a legally binding agreement between you and NookPay.\n\n' +
                '2. ELIGIBILITY\n\n' +
                'You must be at least 18 years old to use NookPay. By using our services, you represent and warrant that you meet this requirement. If you are using the service on behalf of a business or other entity, you represent that you have the authority to bind that entity to these Terms.\n\n' +
                '3. ACCOUNT REGISTRATION\n\n' +
                'To use certain features of our service, you may be required to register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding your password and for all activities that occur under your account.\n\n' +
                '4. PERMITTED USE\n\n' +
                'NookPay grants you a limited, non-exclusive, non-transferable, and revocable license to access and use our services for personal, non-commercial purposes. You agree not to use our services for any illegal or unauthorized purpose.\n\n' +
                '5. PROHIBITED ACTIVITIES\n\n' +
                'You agree not to engage in any of the following activities: (a) violating any applicable laws or regulations; (b) impersonating another person or entity; (c) interfering with the operation of our services; (d) attempting to access accounts or data not belonging to you; (e) transmitting viruses, malware, or other disruptive code; (f) using our services for fraudulent purposes.\n\n' +
                '6. PAYMENTS AND FEES\n\n' +
                'NookPay may charge fees for certain services. All fees are non-refundable unless otherwise stated. You agree to pay all fees and charges incurred in connection with your account. We reserve the right to change our fees at any time with prior notice.\n\n' +
                '7. PRIVACY\n\n' +
                'Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and disclose information about you.\n\n' +
                '8. INTELLECTUAL PROPERTY\n\n' +
                'All content, features, and functionality of our services, including but not limited to text, graphics, logos, icons, and software, are the exclusive property of NookPay and are protected by copyright, trademark, and other intellectual property laws.\n\n' +
                '9. TERMINATION\n\n' +
                'We may terminate or suspend your account and access to our services at any time, without prior notice or liability, for any reason, including if you violate these Terms. Upon termination, your right to use our services will immediately cease.\n\n' +
                '10. LIMITATION OF LIABILITY\n\n' +
                'IN NO EVENT SHALL NOOKPAY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY.\n\n' +
                '11. CHANGES TO TERMS\n\n' +
                'We reserve the right to modify these Terms at any time. If we make material changes, we will notify you through our services or by other means. Your continued use of our services after such modifications constitutes your acceptance of the revised Terms.\n\n' +
                '12. GOVERNING LAW\n\n' +
                'These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which NookPay operates, without regard to its conflict of law provisions.\n\n' +
                '13. CONTACT US\n\n' +
                'If you have any questions about these Terms, please contact us at brothersnookcafe@gmail.com.\n\n' +
                'By continuing to use NookPay, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.'
      });
    } else {
      setModalContent({
        title: 'Privacy Policy',
        content: 'PRIVACY POLICY\n\n' +
                'Last Updated: June 15, 2025\n\n' +
                'At NookPay, we value your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services.\n\n' +
                '1. INFORMATION WE COLLECT\n\n' +
                'We may collect several types of information from and about users of our application, including:\n\n' +
                '• Personal Identifiers: Name, email address, phone number, postal address, date of birth, and government-issued identification information.\n\n' +
                '• Financial Information: Bank account details, credit/debit card information, transaction history, and payment records.\n\n' +
                '• Device Information: Device type, operating system, unique device identifiers, IP address, mobile network information, and mobile device settings.\n\n' +
                '• Usage Data: Information about how you use our application, including the features you access, time spent on the application, and interaction with content.\n\n' +
                '• Location Data: With your consent, we may collect precise location data to provide location-based services.\n\n' +
                '2. HOW WE COLLECT INFORMATION\n\n' +
                'We collect information directly from you when you register for an account, complete transactions, contact customer support, or otherwise interact with our application. We also collect information automatically as you navigate through our application using cookies and similar technologies.\n\n' +
                '3. HOW WE USE YOUR INFORMATION\n\n' +
                'We may use the information we collect for various purposes, including to:\n\n' +
                '• Provide, maintain, and improve our services\n' +
                '• Process transactions and send related information\n' +
                '• Verify your identity and prevent fraud\n' +
                '• Respond to your inquiries and provide customer support\n' +
                '• Send promotional communications about new features or services\n' +
                '• Monitor and analyze usage patterns and trends\n' +
                '• Comply with legal obligations\n\n' +
                '4. INFORMATION SHARING AND DISCLOSURE\n\n' +
                'We may share your information with:\n\n' +
                '• Service Providers: Third-party vendors who perform services on our behalf, such as payment processing, data analysis, and customer service.\n\n' +
                '• Business Partners: Other companies with whom we partner to offer joint promotional offers or provide services.\n\n' +
                '• Legal Authorities: When required by law, court order, or other legal process, or to protect our rights, privacy, safety, or property.\n\n' +
                '• Business Transfers: In connection with a merger, acquisition, or sale of assets, your information may be transferred as a business asset.\n\n' +
                '5. DATA SECURITY\n\n' +
                'We implement appropriate technical and organizational measures to protect the security of your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.\n\n' +
                '6. DATA RETENTION\n\n' +
                'We retain your information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.\n\n' +
                '7. YOUR RIGHTS AND CHOICES\n\n' +
                'Depending on your location, you may have certain rights regarding your personal information, including the right to:\n\n' +
                '• Access and update your information\n' +
                '• Request deletion of your information\n' +
                '• Object to or restrict certain processing activities\n' +
                '• Data portability\n' +
                '• Withdraw consent (where applicable)\n\n' +
                '8. CHILDREN\'S PRIVACY\n\n' +
                'Our services are not intended for children under the age of 18, and we do not knowingly collect information from children under 18.\n\n' +
                '9. INTERNATIONAL DATA TRANSFERS\n\n' +
                'Your information may be transferred to, stored, and processed in countries other than the one in which you reside. By using our services, you consent to the transfer of your information to countries which may have different data protection rules than your country.\n\n' +
                '10. CHANGES TO THIS PRIVACY POLICY\n\n' +
                'We may update this Privacy Policy from time to time. The updated version will be indicated by an updated "Last Updated" date, and the updated version will be effective as soon as it is accessible.\n\n' +
                '11. CONTACT US\n\n' +
                'If you have questions or concerns about this Privacy Policy or our privacy practices, please contact us at brothersnookcafe@gmail.com.\n\n' +
                'By continuing to use NookPay, you acknowledge that you have read, understood, and agree to this Privacy Policy.'
      });
    }
    setModalVisible(true);
  };

  function renderMenuItem(icon: string, title: string, onPress?: () => void) {
    return (
      <TouchableOpacity style={styles.menuItem} onPress={onPress}>
        <View style={styles.menuLeft}>
          <Ionicons name={icon as any} size={22} color={Colors.primary} style={styles.menuIcon} />
          <Text style={styles.menuTitle}>{title}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#888" />
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#763116', '#ffffff']}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerRight}></View>
        </View>
      </LinearGradient>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animatable.View animation="fadeInUp" duration={800} delay={100} style={styles.menuSection}>     
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleResetOnboarding}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="refresh-outline" size={22} color={Colors.primary} style={styles.menuIcon} />
              <Text style={styles.menuTitle}>Reset Onboarding</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => showModal('terms')}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="document-text-outline" size={22} color="#ff9800" style={styles.menuIcon} />
              <Text style={styles.menuTitle}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => showModal('privacy')}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#ff9800" style={styles.menuIcon} />
              <Text style={styles.menuTitle}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </TouchableOpacity>
          
          <View style={styles.footer}>
          <Text style={styles.footerText}>NookPay v1.0.0</Text>
          <Text style={styles.footerText}>© 2025 NookPay. All rights reserved.</Text>
          </View>
        </Animatable.View>
        
        
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalContent.title}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalText}>{modalContent.content}</Text>
            </ScrollView>
            <Button 
              mode="contained" 
              onPress={() => setModalVisible(false)}
              style={styles.modalButton}
            >
              I Understand
            </Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerGradient: {
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerRight: {
    width: 40, // For balance with back button
  },
  content: {
    flex: 1,
    marginTop: -20,
  },
  menuSection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
    marginLeft: 16,
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 14,
  },
  menuTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  footerText: {
    color: '#999',
    fontSize: 12,
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    color: Colors.primary,
  },
  modalContent: {
    maxHeight: 400,
    marginBottom: 15,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 10,
  },
  modalButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    marginTop: 10,
  }
}); 