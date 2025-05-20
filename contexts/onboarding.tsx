import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type OnboardingContextType = {
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (value: boolean) => void;
  isLoading: boolean;
};

const defaultValue: OnboardingContextType = {
  hasCompletedOnboarding: false,
  setHasCompletedOnboarding: () => {},
  isLoading: true,
};

const OnboardingContext = createContext<OnboardingContextType>(defaultValue);

export const useOnboarding = () => useContext(OnboardingContext);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const value = await AsyncStorage.getItem('@onboarding_completed');
        setHasCompletedOnboarding(value === 'true');
      } catch (error) {
        console.error('Error reading onboarding status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  const updateOnboardingStatus = async (value: boolean) => {
    try {
      await AsyncStorage.setItem('@onboarding_completed', value.toString());
      setHasCompletedOnboarding(value);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        hasCompletedOnboarding,
        setHasCompletedOnboarding: updateOnboardingStatus,
        isLoading,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}; 