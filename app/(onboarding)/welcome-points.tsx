import React from 'react';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import OnboardingPage from '../../components/OnboardingPage';
import { useOnboarding } from '../../contexts/onboarding';
import WelcomePointsIcon from '../../components/onboarding/WelcomePointsIcon';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { View, Text, StyleSheet, Platform } from 'react-native';

// Wrapper component to add styled text below the icon
const WelcomePointsWithText = () => (
  <View style={styles.container}>
    <WelcomePointsIcon 
      width={Platform.OS === 'web' ? 200 : 220} 
      height={Platform.OS === 'web' ? 200 : 220} 
    />
    <Text style={styles.pointsText}>Earn & Redeem</Text>
  </View>
);

export default function WelcomePointsScreen() {
  const router = useRouter();
  const { setHasCompletedOnboarding } = useOnboarding();

  const handleNext = () => {
    router.push('/(onboarding)/vouchers');
  };

  const handleSkip = () => {
    setHasCompletedOnboarding(true);
    router.replace('/(tabs)');
  };

  return (
    <>
      <StatusBar style="dark" />
      <OnboardingPage
        title="Earn Welcome Points"
        description="For every purchase you make, you'll earn points that can be redeemed for exclusive rewards and discounts."
        image={{ uri: 'custom' }}
        customImage={<WelcomePointsWithText />}
        onNext={handleNext}
        onSkip={handleSkip}
        backgroundColor={Colors.white}
        gradientColors={[Colors.white, Colors.white]}
        isDarkTheme={false}
        currentPage={1}
        totalPages={4}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { overflow: 'hidden' } : {}),
  },
  pointsText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.md,
    textAlign: 'center',
    letterSpacing: 0.5,
  }
}); 