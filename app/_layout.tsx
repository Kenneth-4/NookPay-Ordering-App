import React, { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../constants/theme';
import { AuthProvider } from '../contexts/auth';
import { CartProvider } from '../contexts/cart';
import { ThemeProvider } from '../contexts/theme';
import { OnboardingProvider } from '../contexts/onboarding';
import SplashScreen from '../components/SplashScreen';
import MobileOnlyMessage from '../components/MobileOnlyMessage';
import * as ExpoSplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { View, Text, Platform, Alert, Dimensions, TouchableOpacity } from 'react-native';
import { validateEnvironment } from '../utils/validateEnv';
import Constants from 'expo-constants';

// Prevent the splash screen from auto-hiding
ExpoSplashScreen.preventAutoHideAsync().catch(() => {
  console.warn('Error preventing auto hide of splash screen');
});

// Function to check if the device is mobile or desktop
function isMobileDevice() {
  if (Platform.OS !== 'web') return true;
  if (typeof window === 'undefined') return true;
  
  const width = Dimensions.get('window').width;
  return width < 768; // Common tablet/desktop breakpoint
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [splashHidden, setSplashHidden] = useState(false);
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    // Check if the device is mobile
    setIsMobile(isMobileDevice());

    // Add resize listener for web
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleResize = () => {
        setIsMobile(isMobileDevice());
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);
  
  useEffect(() => {
    // Perform any initialization tasks here
    async function prepare() {
      try {
        // Validate environment variables
        // The new implementation provides default values in development
          try {
            validateEnvironment();
          } catch (envError) {
            console.error('Environment validation error:', envError);
          // We no longer need to set an error as our updated validation function
          // will provide default values in development
        }

        // Load fonts
        await Font.loadAsync({
          'Poppins': require('../assets/fonts/Poppins-Regular.ttf'),
          'Poppins-Light': require('../assets/fonts/Poppins-Light.ttf'),
          'Poppins-Medium': require('../assets/fonts/Poppins-Medium.ttf'),
          'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
          'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
        });
        
        setFontsLoaded(true);
        console.log('Fonts loaded successfully.');
          
        // Once all initialization is done
        setAppIsReady(true);
      } catch (e) {
        console.warn('Error preparing app:', e);
        setError('Failed to initialize app');
        // Even if there's an error, still proceed with the app
        setAppIsReady(true);
        setFontsLoaded(true);
      }
    }

    prepare();
    
    // Safety timeout to prevent getting stuck on initialization
    const timeout = setTimeout(() => {
      if (!appIsReady || !fontsLoaded) {
        console.warn('App initialization taking too long - forcing proceed');
        setAppIsReady(true);
        setFontsLoaded(true);
      }
    }, 8000);
    
    return () => clearTimeout(timeout);
  }, []);

  const handleSplashComplete = () => {
    console.log('Splash screen complete, moving to main app');
      setSplashHidden(true);
    
    // Hide Expo's native splash screen
    setTimeout(() => {
      ExpoSplashScreen.hideAsync().catch((err) => {
        console.warn('Error hiding splash screen:', err);
      });
    }, 100);
  };

  // Safety timeout to force app to continue if splash screen gets stuck
  useEffect(() => {
    const forceTimeout = setTimeout(() => {
      if (!splashHidden) {
        console.warn('Splash screen taking too long - forcing hide');
        setSplashHidden(true);
        ExpoSplashScreen.hideAsync().catch(() => {});
    }
    }, 10000);
    
    return () => clearTimeout(forceTimeout);
  }, [splashHidden]);

  // Show splash screen until the app is ready
  if (!appIsReady || !fontsLoaded || !splashHidden) {
    return (
      <SplashScreen 
        onFinish={handleSplashComplete} 
      />
    );
  }

  // Show mobile-only message on desktop/web
  if (!isMobile && Platform.OS === 'web') {
    return <MobileOnlyMessage />;
  }

  return (
    <AuthProvider>
      <CartProvider>
        <ThemeProvider>
          <OnboardingProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.background }
              }}
            >
              <Stack.Screen 
                name="index" 
                options={{ 
                  headerShown: false 
                }} 
              />
              <Stack.Screen 
                name="(tabs)" 
                options={{ 
                  headerShown: false,
                  animation: 'fade'
                }} 
              />
            <Stack.Screen 
              name="(category)/[id]" 
              options={{ 
                  headerShown: false,
                  animation: 'slide_from_right'
              }} 
            />
            <Stack.Screen 
              name="(product)/[id]" 
              options={{ 
                headerShown: false
              }} 
            />
            <Stack.Screen 
              name="cart" 
              options={{ 
                headerShown: false
              }} 
            />
            <Stack.Screen 
              name="(auth)" 
              options={{ 
                headerShown: false,
                animation: 'fade'
              }} 
            />
              <Stack.Screen 
                name="(onboarding)" 
              options={{ 
                headerShown: false,
                animation: 'fade'
              }} 
            />
            <Stack.Screen 
              name="transaction-history" 
              options={{ 
                headerShown: false,
                animation: 'fade'
              }} 
            />
            <Stack.Screen 
              name="vouchers" 
              options={{ 
                headerShown: false,
                animation: 'fade'
              }} 
            />
          </Stack>
          </OnboardingProvider>
        </ThemeProvider>
      </CartProvider>
    </AuthProvider>
  );
}
