import { Redirect } from 'expo-router';
import { useOnboarding } from '../contexts/onboarding';

export default function Index() {
  const { hasCompletedOnboarding, isLoading } = useOnboarding();

  if (isLoading) return null;

  if (!hasCompletedOnboarding) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href="/(tabs)" />;
}
