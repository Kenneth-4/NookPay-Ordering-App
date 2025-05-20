import React from 'react';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import OnboardingPage from '../../components/OnboardingPage';
import { useOnboarding } from '../../contexts/onboarding';
import { View, StyleSheet, Text, Image, Dimensions, Platform } from 'react-native';
import { Colors, FontSizes, Spacing } from '../../constants/theme';

const { width, height } = Dimensions.get('window');
const scaleFactor = Math.min(width, height) / 390; // Base scale on iPhone 12 dimensions

// Create a welcome component with logo
const WelcomeIcon = () => (
  <View style={styles.iconContainer}>
    <View style={styles.circlesContainer}>
      <Image 
        source={require('../../assets/images/nook.png')} 
        style={styles.logoImage} 
        resizeMode="contain"
      />
    </View>
  </View>
);

export default function OnboardingIntro() {
  const router = useRouter();
  const { setHasCompletedOnboarding } = useOnboarding();

  const handleNext = () => {
    router.push('/(onboarding)/welcome-points');
  };

  const handleSkip = () => {
    // Mark onboarding as completed and navigate to main app
    setHasCompletedOnboarding(true);
    router.replace('/(tabs)');
  };

  return (
    <>
      <StatusBar style="dark" />
      <OnboardingPage
        title="Welcome to NookPay"
        description="Your one-stop food ordering app that makes your dining experience seamless and rewarding!"
        image={{ uri: 'custom' }}
        customImage={<WelcomeIcon />}
        onNext={handleNext}
        onSkip={handleSkip}
        backgroundColor={Colors.white}
        gradientColors={[Colors.white, Colors.white]}
        isDarkTheme={false}
        currentPage={0}
        totalPages={4}
      />
    </>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: Platform.OS === 'web' ? 300 * scaleFactor : 250,
    height: Platform.OS === 'web' ? 300 * scaleFactor : 250,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: Platform.OS === 'web' ? 'visible' : 'hidden',
    backgroundColor: Platform.OS === 'web' ? 'transparent' : undefined,
  },
  circlesContainer: {
    width: Platform.OS === 'web' ? 400 * scaleFactor : 500,
    height: Platform.OS === 'web' ? 400 * scaleFactor : 500,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transform: Platform.OS === 'web' ? [{ scale: 0.9 }] : undefined,
    backgroundColor: 'transparent',
  },
  logoImage: {
    width: Platform.OS === 'web' ? 250 * scaleFactor : 250,
    height: Platform.OS === 'web' ? 250 * scaleFactor : 250,
    zIndex: 10,
    position: 'absolute',
    resizeMode: Platform.OS === 'web' ? 'contain' : undefined,
    backgroundColor: 'transparent',
  },
  circle1: {
    position: 'absolute',
    width: Platform.OS === 'web' ? 260 * scaleFactor : 330,
    height: Platform.OS === 'web' ? 260 * scaleFactor : 330,
    borderRadius: Platform.OS === 'web' ? 130 * scaleFactor : 165,
    backgroundColor: 'rgba(243, 101, 20, 0.1)',
  },
  circle2: {
    position: 'absolute',
    width: Platform.OS === 'web' ? 230 * scaleFactor : 300,
    height: Platform.OS === 'web' ? 230 * scaleFactor : 300,
    borderRadius: Platform.OS === 'web' ? 115 * scaleFactor : 150,
    backgroundColor: 'rgba(243, 101, 20, 0.2)',
  },
  circle3: {
    position: 'absolute',
    width: Platform.OS === 'web' ? 200 * scaleFactor : 260,
    height: Platform.OS === 'web' ? 200 * scaleFactor : 260,
    borderRadius: Platform.OS === 'web' ? 100 * scaleFactor : 130,
    backgroundColor: 'rgba(243, 101, 20, 0.3)',
  },
  welcomeText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: Spacing.xl * 2,
    textAlign: 'center',
    letterSpacing: 0.5,
    zIndex: 10,
  },
}); 