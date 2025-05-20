import React from 'react';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import OnboardingPage from '../../components/OnboardingPage';
import { useOnboarding } from '../../contexts/onboarding';
import VouchersIcon from '../../components/onboarding/VouchersIcon';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { View, Text, StyleSheet } from 'react-native';

// Wrapper component to add styled text below the icon
const VouchersWithText = () => (
  <View style={styles.container}>
    <VouchersIcon width={220} height={220} />
    <Text style={styles.voucherText}>Special Discounts</Text>
  </View>
);

export default function VouchersScreen() {
  const router = useRouter();
  const { setHasCompletedOnboarding } = useOnboarding();

  const handleNext = () => {
    router.push('/(onboarding)/how-to-order');
  };

  const handleSkip = () => {
    setHasCompletedOnboarding(true);
    router.replace('/(tabs)');
  };

  return (
    <>
      <StatusBar style="dark" />
      <OnboardingPage
        title="Exclusive Vouchers"
        description="Enjoy special discounts with our exclusive vouchers. we've got a variety of offers waiting for you!"
        image={{ uri: 'custom' }}
        customImage={<VouchersWithText />}
        onNext={handleNext}
        onSkip={handleSkip}
        backgroundColor={Colors.white}
        gradientColors={[Colors.white, Colors.white]}
        isDarkTheme={false}
        currentPage={2}
        totalPages={4}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.md,
    textAlign: 'center',
    letterSpacing: 0.5,
  }
}); 