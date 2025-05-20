import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Platform,
  StatusBar,
  ImageSourcePropType,
  ViewStyle,
  TextStyle
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, Spacing, BorderRadius, Shadows, Fonts } from '../constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

type GradientColors = [string, string] | [string, string, string] | [string, string, string, string];

// Indicator dot component
const PageIndicator = ({ totalPages, currentPage, isDarkTheme }: { totalPages: number, currentPage: number, isDarkTheme: boolean }) => {
  return (
    <View style={styles.indicatorContainer}>
      {Array.from({ length: totalPages }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.indicatorDot,
            {
              backgroundColor: currentPage === index 
                ? (isDarkTheme ? Colors.white : Colors.primary)
                : (isDarkTheme ? 'rgba(255, 255, 255, 0.4)' : 'rgba(243, 101, 20, 0.3)'),
              width: currentPage === index ? 20 : 10,
            }
          ]}
        />
      ))}
    </View>
  );
};

interface OnboardingPageProps {
  image: ImageSourcePropType;
  title: string;
  description: string;
  onNext: () => void;
  onSkip: () => void;
  isLastPage?: boolean;
  backgroundColor?: string;
  gradientColors?: GradientColors;
  customImage?: React.ReactNode;
  isDarkTheme?: boolean;
  currentPage?: number;
  totalPages?: number;
}

const OnboardingPage: React.FC<OnboardingPageProps> = ({
  image,
  title,
  description,
  onNext,
  onSkip,
  isLastPage = false,
  backgroundColor = Colors.secondary,
  gradientColors = ['rgba(243, 101, 20, 0.8)', 'rgba(118, 49, 22, 1)'],
  customImage,
  isDarkTheme = true,
  currentPage = 0,
  totalPages = 4,
}) => {
  const insets = useSafeAreaInsets();
  
  // Determine text color based on theme
  const textColor = isDarkTheme ? Colors.white : Colors.black;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <StatusBar barStyle={isDarkTheme ? "light-content" : "dark-content"} />
      
      {/* Skip button */}
      {!isLastPage && (
        <TouchableOpacity 
          style={[styles.skipButton, { top: insets.top + 10 }]} 
          onPress={onSkip}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}
      
      {/* Image */}
      <Animatable.View animation="fadeIn" duration={1000} style={styles.imageContainer}>
        {customImage ? (
          customImage
        ) : (
          <Image source={image} style={styles.image} resizeMode="contain" />
        )}
      </Animatable.View>
      
      {/* Bottom content */}
      <LinearGradient
        colors={gradientColors}
        style={styles.bottomContainer}
      >
        <Animatable.View animation="fadeInUp" duration={800}>
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
          <Text style={[styles.description, { color: textColor }]}>{description}</Text>
          
          {/* Page indicator */}
          <PageIndicator 
            totalPages={totalPages} 
            currentPage={currentPage} 
            isDarkTheme={isDarkTheme} 
          />
        </Animatable.View>
        
        <Animatable.View animation="fadeInUp" duration={1000} delay={300} style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={onNext}
          >
            <Text style={styles.buttonText}>
              {isLastPage ? 'Get Started' : 'Next'}
            </Text>
            <FontAwesome
              name={isLastPage ? 'check' : 'arrow-right'}
              size={18}
              color={Colors.white}
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
        </Animatable.View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary,
  },
  skipButton: {
    position: 'absolute',
    right: 20,
    zIndex: 5,
  },
  skipText: {
    color: Colors.primary,
    fontSize: FontSizes.lg,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingTop: height * 0.05,
    overflow: Platform.OS === 'web' ? 'hidden' : 'visible',
    maxHeight: Platform.OS === 'web' ? 500 : undefined,
  },
  image: {
    width: width * 0.8,
    height: width * 0.8,
    maxWidth: 350,
    maxHeight: 350,
    transform: Platform.OS === 'web' ? [{ scale: 0.9 }] : undefined,
  },
  bottomContainer: {
    width: '100%',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl * 2,
    paddingBottom: Spacing.xl + (Platform.OS === 'ios' ? 20 : 30),
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    transform: Platform.OS === 'web' ? [{ scale: 1 }] : undefined,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: Spacing.md,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.white,
    lineHeight: 24,
    opacity: 0.9,
    marginBottom: Spacing.xl,
    letterSpacing: 0.3,
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  nextButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.medium,
    minWidth: 180,
  },
  buttonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  indicatorDot: {
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
});

export default OnboardingPage; 