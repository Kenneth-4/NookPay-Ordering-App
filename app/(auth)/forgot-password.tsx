import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Conditionally import the appropriate hCaptcha component
const HCaptchaNative = Platform.OS !== 'web' 
  ? require('@hcaptcha/react-native-hcaptcha').default
  : null;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const captchaRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState('');

  const siteKey = Constants.expoConfig?.extra?.hcaptchaSiteKey || 
                 process.env.EXPO_PUBLIC_HCAPTCHA_SITE_KEY;
  const baseUrl = 'https://hcaptcha.com';

  // Check if captcha was previously verified in this session
  useEffect(() => {
    // Reset captcha verification status when the component mounts
    // This ensures captcha is required each time the page is loaded
    setCaptchaVerified(false);
    setCaptchaToken('');
  }, []);

  // Web-specific effect to load hCaptcha script
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Load hCaptcha script if it's not already loaded
      if (!document.querySelector('script[src*="hcaptcha"]')) {
        const script = document.createElement('script');
        script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
        
        return () => {
          // Cleanup
          try {
            document.head.removeChild(script);
          } catch (e) {
            console.log('Script already removed');
          }
        };
      }
    }
  }, []);

  const handleResetPassword = async () => {
    // Reset error message on new attempt
    setErrorMessage('');
    
    if (!email) {
      setErrorMessage('Please enter your email address');
      return;
    }

    if (!captchaVerified && !captchaToken) {
      setErrorMessage('Please complete the captcha verification');
      return;
    }

    setSending(true);
    try {
      await sendPasswordResetEmail(auth, email);
      
      // Show success alert with redirection based on platform
      if (Platform.OS === 'web') {
        window.alert('Password reset email sent! Check your inbox.');
        router.push('./sign-in');
      } else {
        Alert.alert(
          'Success',
          'Password reset email sent! Check your inbox.',
          [{ text: 'OK', onPress: () => router.push('./sign-in') }]
        );
      }
      
      setEmail('');
      // Don't reset captcha token as we want it to remain verified for this session
    } catch (error: any) {
      let errorMsg = 'Failed to send reset email';
      
      // Map Firebase errors to user-friendly messages
      if (error.code === 'auth/invalid-email') {
        errorMsg = 'Invalid email address';
      } else if (error.code === 'auth/user-not-found') {
        errorMsg = 'No account found with this email';
      } else if (error.code === 'auth/too-many-requests') {
        errorMsg = 'Too many attempts. Please try again later';
      } else if (error.code === 'auth/network-request-failed') {
        errorMsg = 'Network error. Please check your internet connection';
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setSending(false);
    }
  };

  const onMessage = (event: { nativeEvent: { data: string } }) => {
    if (event && event.nativeEvent.data) {
      if (event.nativeEvent.data === 'cancel') {
        console.log('Captcha verification cancelled');
        if (captchaRef.current) {
          (captchaRef.current as any).hide();
        }
      } else if (event.nativeEvent.data === 'error') {
        console.log('Error occurred in captcha');
        if (captchaRef.current) {
          (captchaRef.current as any).hide();
        }
      } else if (event.nativeEvent.data === 'expired') {
        console.log('Captcha verification expired');
        setCaptchaToken('');
        setCaptchaVerified(false);
        if (captchaRef.current) {
          (captchaRef.current as any).hide();
        }
      } else if (event.nativeEvent.data.length > 10) {
        // Only valid captcha tokens are lengthy strings
        setCaptchaToken(event.nativeEvent.data);
        setCaptchaVerified(true);
        console.log('Captcha verification successful');
        
        if (captchaRef.current) {
          (captchaRef.current as any).hide();
        }
      }
    }
  };

  const handleVerifyCaptcha = () => {
    // Reset error message on captcha verification attempt
    setErrorMessage('');
    
    if (Platform.OS === 'web') {
      // Create a temporary invisible container for hCaptcha if it doesn't exist
      if (!document.getElementById('h-captcha-pwd-container')) {
        const container = document.createElement('div');
        container.id = 'h-captcha-pwd-container';
        container.style.display = 'none';
        document.body.appendChild(container);
        
        // Initialize hCaptcha with callbacks
        window.hcaptcha?.render('h-captcha-pwd-container', {
          sitekey: siteKey,
          size: 'invisible',
          callback: (token: string) => {
            setCaptchaToken(token);
            setCaptchaVerified(true);
            console.log('Captcha verification successful');
          },
          'expired-callback': () => {
            setCaptchaToken('');
            setCaptchaVerified(false);
          },
          'error-callback': () => {
            console.log('Error occurred in captcha');
          }
        });
      }
      
      // Execute the challenge
      window.hcaptcha?.execute();
    } else if (!captchaVerified && captchaRef.current) {
      (captchaRef.current as any).show();
    }
  };

  // Render native captcha component (only for mobile)
  const renderNativeCaptcha = () => {
    if (Platform.OS !== 'web' && HCaptchaNative) {
      return (
        <HCaptchaNative
          ref={captchaRef}
          siteKey={siteKey}
          baseUrl={baseUrl}
          onMessage={onMessage}
          languageCode="en"
          size="invisible"
          showLoading={true}
          loadingIndicatorColor={Colors.primary}
        />
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <FontAwesome name="lock" size={80} color={Colors.primary} style={styles.icon} />
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your email to receive a password reset link</Text>
        
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <FontAwesome name="exclamation-circle" size={16} color={Colors.error} style={styles.errorIcon} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}
        
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <FontAwesome name="envelope-o" size={20} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errorMessage) setErrorMessage('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!sending}
            />
          </View>
        </View>

        {/* Keep the button visible but disable it after verification */}
        <TouchableOpacity 
          style={[
            styles.captchaButton,
            captchaVerified && styles.captchaButtonDisabled
          ]}
          onPress={handleVerifyCaptcha}
          disabled={sending || captchaVerified}
        >
          <Text style={[
            styles.captchaButtonText,
            captchaVerified && styles.captchaButtonTextVerified
          ]}>
            {captchaVerified ? 'Captcha Verified ✓' : 'Verify Captcha'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.resetButton, 
            (sending || (!captchaVerified && !captchaToken)) && styles.resetButtonDisabled
          ]}
          onPress={handleResetPassword}
          disabled={sending || (!captchaVerified && !captchaToken)}
        >
          {sending ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.resetButtonText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>
        {renderNativeCaptcha()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: Spacing.md,
  },
  backButton: {
    padding: Spacing.sm,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  icon: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    width: '100%',
  },
  errorIcon: {
    marginRight: Spacing.sm,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    flex: 1,
  },
  inputContainer: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    elevation: 4,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  captchaButton: {
    width: '100%',
    backgroundColor: Colors.inputBackground,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    elevation: 4,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  captchaButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  captchaButtonText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  captchaButtonTextVerified: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  resetButton: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    elevation: 4,
    alignItems: 'center',
  },
  resetButtonDisabled: {
    opacity: 0.7,
  },
  resetButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  signInContainer: {
    flexDirection: 'row',
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  signInText: {
    color: Colors.text.secondary,
    fontSize: 14,
  },
  signInLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  disabledText: {
    color: Colors.lightGray,
  }
});

// Type declaration for window.hcaptcha
declare global {
  interface Window {
    hcaptcha?: any;
  }
}