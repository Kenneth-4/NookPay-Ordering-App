import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { useRouter } from 'expo-router';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useTheme } from '../../contexts/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Animatable from 'react-native-animatable';
import { useOnboarding } from '../../contexts/onboarding';
import { resetAppState } from '../../utils/splashDebug';

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
}

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const theme = useTheme();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const { setHasCompletedOnboarding } = useOnboarding();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await signOut(auth);
      if (Platform.OS === 'web') {
        window.location.reload();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert('Error: ' + (error.message || 'Failed to log out'));
      } else {
        Alert.alert('Error', error.message || 'Failed to log out');
      }
    } finally {
      setLoggingOut(false);
    }
  };

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <LinearGradient
          colors={['#ffffff', '#ffffff']}
          style={styles.gradientBg}
        >
          <View style={styles.signInContainer}>
            <Animatable.View animation="fadeIn" duration={1000} style={styles.signInHeader}>
              <Image 
                source={require('../../assets/images/nook.png')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={[styles.signInTitle, {color: '#333333'}]}>Welcome</Text>
              <Text style={[styles.signInSubtitle, {color: '#666666'}]}>Sign in to access your profile and orders</Text>
            </Animatable.View>
            
            <Animatable.View animation="fadeInUp" delay={300} duration={800}>
              <TouchableOpacity 
                style={styles.signInButton}
                onPress={() => router.push('../(auth)/sign-in')}
              >
                <LinearGradient
                  colors={['#F36514', '#F8943F']}
                  style={styles.signInButtonGradient}
                  start={[0, 0]}
                  end={[1, 0]}
                >
                  <Ionicons name="log-in-outline" size={20} color={Colors.white} />
                  <Text style={styles.signInButtonText}>Sign In</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animatable.View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Extract user info
  const userEmail = user.email || 'User';
  const userInitial = userEmail.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#763116', '#ffffff']}
        style={styles.headerGradient}
      >
        <Animatable.View animation="fadeIn" duration={800} style={styles.profileHeaderContent}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={['#F36514', '#F8943F']}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{userInitial}</Text>
            </LinearGradient>
          </View>
          <Text style={[styles.userName, {color: '#333333'}]}>{userEmail}</Text>
        </Animatable.View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animatable.View animation="fadeInUp" duration={800} delay={100} style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          {renderMenuItem('receipt-outline', 'Order History', () => router.push('/transaction-history'))}
          {renderMenuItem('person-outline', 'Personal Information')}
          {renderMenuItem('ticket-outline', 'Vouchers', () => router.push('/vouchers'))}
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={800} delay={200} style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          {renderMenuItem('help-circle-outline', 'Help Center')}
          {renderMenuItem('document-text-outline', 'Terms of Service')}
          {renderMenuItem('shield-checkmark-outline', 'Privacy Policy')}
          {renderMenuItem('settings-outline', 'Settings', () => router.push('/settings'))}
        </Animatable.View>


        <Animatable.View animation="fadeInUp" duration={800} delay={400}>
          <TouchableOpacity 
            style={[styles.logoutButton, loggingOut && styles.logoutButtonDisabled]}
            onPress={handleSignOut}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <View style={styles.logoutContent}>
                <ActivityIndicator color="#fff" size="small" style={styles.logoutIcon} />
                <Text style={styles.logoutText}>Logging out...</Text>
              </View>
            ) : (
              <View style={styles.logoutContent}>
                <Ionicons name="log-out-outline" size={22} color="#D32F2F" />
                <Text style={styles.logoutText}>Log Out</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animatable.View>
      </ScrollView>
    </SafeAreaView>
  );
  
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  gradientBg: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    marginTop: -20,
  },
  signInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  signInHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  signInTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    marginTop: 20,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  signInSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  signInButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing.sm,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  signInButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  signInButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  profileHeaderContent: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.white,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  sectionContent: {
    paddingVertical: 8,
  },
  devMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  devMenuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  devMenuIcon: {
    marginRight: 14,
  },
  devMenuText: {
    fontSize: 15,
    color: '#555',
  },
  logoutButton: {
    marginVertical: 20,
    marginHorizontal: 16,
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D32F2F',
    overflow: 'hidden',
    elevation: 0,
    shadowColor: 'transparent',
  },
  logoutButtonDisabled: {
    opacity: 0.7,
    borderColor: '#999',
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  logoutText: {
    color: '#D32F2F',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  logoutIcon: {
    marginRight: 10,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 14,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  logoImage: {
    width: 200,
    height: 200,
    marginBottom: 10,
  },
});
