import React from 'react';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import OnboardingPage from '../../components/OnboardingPage';
import { useOnboarding } from '../../contexts/onboarding';
import HowToOrderIcon from '../../components/onboarding/HowToOrderIcon';
import { Colors } from '../../constants/theme';

export default function HowToOrderScreen() {
  const router = useRouter();
  const { setHasCompletedOnboarding } = useOnboarding();

  const handleNext = () => {
    // Mark onboarding as completed when reaching the final screen
    setHasCompletedOnboarding(true);
    router.replace('/(tabs)');
  };

  // No need for skip on last page
  const handleSkip = () => {
    setHasCompletedOnboarding(true);
    router.replace('/(tabs)');
  };

  return (
    <>
      <StatusBar style="dark" />
      <OnboardingPage
        title="How to Order"
        description="Browse our menu, select your order, add them to cart, and choose between dine-in or pickup options. Enjoy your meal at our cafe or take it with you at your convenience!"
        image={{ uri: 'custom' }}
        customImage={<HowToOrderIcon width={250} height={250} />}
        onNext={handleNext}
        onSkip={handleSkip}
        isLastPage={true}
        backgroundColor={Colors.white}
        gradientColors={[Colors.white, Colors.white]}
        isDarkTheme={false}
        currentPage={3}
        totalPages={4}
      />
    </>
  );
} 