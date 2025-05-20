/**
 * Utility functions for debugging splash screen issues
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Function to clear any stored onboarding state that might be causing issues
export const resetAppState = async () => {
  try {
    // Clear onboarding state
    await AsyncStorage.removeItem('@onboarding_completed');
    
    // Clear any other potentially problematic state
    // Add additional items to clear as needed
    
    console.log('App state reset successfully');
    return true;
  } catch (error) {
    console.error('Failed to reset app state:', error);
    return false;
  }
};

// Function to check if we're stuck in splash screen loops
export const monitorSplashScreenCycles = () => {
  let splashScreenCycles = 0;
  const maxAllowedCycles = 3;
  
  const incrementCycle = () => {
    splashScreenCycles++;
    console.log(`Splash screen cycle: ${splashScreenCycles}`);
    
    if (splashScreenCycles >= maxAllowedCycles) {
      console.warn(`Splash screen cycle limit reached (${maxAllowedCycles}). App may be stuck in a loop.`);
      // You could add additional actions here like forcing a reset
    }
  };
  
  return {
    incrementCycle,
    getCycleCount: () => splashScreenCycles,
    resetCycleCount: () => { splashScreenCycles = 0; },
  };
};

// Helper to log loading stages of the app
export const logAppLoadingStage = (stage: string) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] App loading stage: ${stage}`);
};

export default {
  resetAppState,
  monitorSplashScreenCycles,
  logAppLoadingStage,
}; 