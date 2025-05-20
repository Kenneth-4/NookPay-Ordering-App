import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useRouter } from 'expo-router';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Animatable from 'react-native-animatable';
import { useOnboarding } from '../contexts/onboarding';
import { resetAppState } from '../utils/splashDebug';

export default function SettingsScreen() {
  const router = useRouter();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const { setHasCompletedOnboarding } = useOnboarding();

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
            onPress={handleResetAppState}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="warning-outline" size={22} color="#ff9800" style={styles.menuIcon} />
              <Text style={styles.menuTitle}>Reset App State</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </TouchableOpacity>
          
          <View style={styles.footer}>
          <Text style={styles.footerText}>NookPay v1.0.1</Text>
          <Text style={styles.footerText}>© 2025 NookPay. All rights reserved.</Text>
          </View>
        </Animatable.View>
        
        
      </ScrollView>
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
}); 