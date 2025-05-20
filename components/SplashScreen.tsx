import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, Text, Pressable, Platform } from 'react-native';
import { Colors } from '../constants/theme';
import * as Animatable from 'react-native-animatable';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isFallbackVisible, setIsFallbackVisible] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    // Load any resources needed for the splash screen
    const loadResources = async () => {
      try {
        // Set a timeout to show fallback UI if splash screen doesn't load fast enough
        const fallbackTimer = setTimeout(() => {
          if (!isImageLoaded) {
            setIsFallbackVisible(true);
          }
        }, 3000);

        // Simulate loading progress
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += 5;
          setLoadingProgress(Math.min(progress, 95)); // Cap at 95% until fully loaded
          if (progress >= 100) {
            clearInterval(progressInterval);
          }
        }, 200);

        // Simulate loading time with a shorter duration
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Clean up timers
        clearTimeout(fallbackTimer);
        clearInterval(progressInterval);
        
        setLoadingProgress(100);
        // Ensure we always continue to the app after a maximum time
        setTimeout(onFinish, 200);
      } catch (error) {
        console.error('Error during splash screen loading:', error);
        setLoadError('Failed to load app resources');
        setIsFallbackVisible(true);
        // Even if there's an error, continue to the app after a delay
        setTimeout(onFinish, 1000);
      }
    };

    loadResources();

    // Add a safety timeout to ensure we don't get stuck
    const safetyTimeout = setTimeout(() => {
      console.log('Safety timeout triggered - forcing app to continue');
      onFinish();
    }, 5000);

    return () => {
      // Clean up resources if needed
      clearTimeout(safetyTimeout);
    };
  }, [onFinish, isImageLoaded]);

  // Fallback UI component
  const FallbackUI = () => (
    <Animatable.View animation="fadeIn" style={styles.fallbackContainer}>
      <Text style={styles.fallbackTitle}>NookPay</Text>
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${loadingProgress}%` }]} />
      </View>
      {loadError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Pressable 
            style={styles.retryButton}
            onPress={() => {
              setLoadError(null);
              onFinish(); // Try to proceed anyway
            }}
          >
            <Text style={styles.retryButtonText}>Proceed Anyway</Text>
          </Pressable>
        </View>
      )}
    </Animatable.View>
  );

  // Handle image load success
  const handleImageLoad = () => {
    setIsImageLoaded(true);
    setLoadingProgress(100);
    // Proceed to the app after image loads
    setTimeout(onFinish, 500);
  };

  return (
    <View style={styles.container}>
      {!isFallbackVisible && (
        <Image 
          source={require('../assets/images/nook.png')} 
          style={styles.logo}
          resizeMode="contain"
          onLoad={handleImageLoad}
          onError={() => {
            setLoadError('Failed to load splash image');
            setIsFallbackVisible(true);
            // If image fails to load, still continue after a delay
            setTimeout(onFinish, 1000);
          }}
        />
      )}
      
      {!isFallbackVisible && !loadError && (
        <ActivityIndicator 
          size="large" 
          color="#ffffff" 
          style={styles.loader}
        />
      )}

      {(isFallbackVisible || loadError) && <FallbackUI />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#763116',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  loader: {
    marginTop: 20,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
    padding: 10,
  },
  // Fallback UI styles
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fallbackTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  fallbackSubtitle: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 30,
    opacity: 0.85,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  progressContainer: {
    width: 250,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 20,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ffffff',
  },
  errorContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  retryButton: {
    marginTop: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default SplashScreen;