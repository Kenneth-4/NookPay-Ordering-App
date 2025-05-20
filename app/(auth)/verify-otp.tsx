import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { verifyOTP, sendOTPVerificationEmail } from '../../services/emailService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function VerifyOTPScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Clear messages after a few seconds
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (successMessage) {
      timeout = setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [successMessage]);

  const handleResendCode = async () => {
    if (timer > 0) return;
    
    // Clear any existing messages
    setErrorMessage('');
    setSuccessMessage('');
    
    setResending(true);
    try {
      // Resend verification email with OTP using EmailJS
      await sendOTPVerificationEmail(email as string);
      
      setTimer(60);
      setSuccessMessage('Verification code resent. Please check your email.');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to resend verification code');
    } finally {
      setResending(false);
    }
  };

  const handleChangeText = (text: string, index: number) => {
    // Clear error message when user starts typing
    if (errorMessage) setErrorMessage('');
    
    if (text.length > 1) {
      // If user pastes multiple characters, handle appropriately
      if (text.length === 6) {
        // If exactly 6 digits were pasted, distribute them
        const digits = text.split('');
        setOtpValues(digits);
        inputRefs.current[5]?.focus();
        return;
      }
      // Otherwise just take the first character
      text = text[0];
    }
    
    const newOtpValues = [...otpValues];
    newOtpValues[index] = text;
    setOtpValues(newOtpValues);
    
    // Auto-advance to next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace to move to previous input
    if (e.nativeEvent.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyManualOTP = async () => {
    // Clear any existing messages
    setErrorMessage('');
    setSuccessMessage('');
    
    const otpCode = otpValues.join('');
    if (otpCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit code');
      return;
    }

    setVerifying(true);
    
    try {
      // Verify the OTP code with our updated service
      const isVerified = await verifyOTP(email as string, otpCode);
      
      if (isVerified) {
        // OTP is verified - proceed to sign up
        router.push({
          pathname: './sign-up',
          params: { verifiedEmail: email }
        });
      } else {
        setErrorMessage('The verification code you entered is incorrect. Please try again.');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setErrorMessage(error.message || 'Failed to verify code. Please try again.');
    } finally {
      setVerifying(false);
    }
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
        <Text style={styles.title}>Verification Code</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to{'\n'}
          <Text style={styles.emailText}>{email}</Text>
        </Text>
        
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <FontAwesome name="exclamation-circle" size={16} color={Colors.error} style={styles.messageIcon} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}
        
        {successMessage ? (
          <View style={styles.successContainer}>
            <FontAwesome name="check-circle" size={16} color={Colors.success} style={styles.messageIcon} />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}
        
        <View style={styles.otpContainer}>
          {otpValues.map((value, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={styles.otpInput}
              value={value}
              onChangeText={(text) => handleChangeText(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="numeric"
              maxLength={1}
              textAlign="center"
              editable={!verifying}
            />
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.verifyButton, verifying && styles.verifyButtonDisabled]}
          onPress={verifyManualOTP}
          disabled={verifying}
        >
          {verifying ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.verifyButtonText}>Verify Code</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the code? </Text>
          <TouchableOpacity 
            onPress={handleResendCode}
            disabled={resending || timer > 0}
          >
            <Text style={[
              styles.resendLink, 
              (resending || timer > 0) && styles.disabledText
            ]}>
              {timer > 0 ? `Resend in ${timer}s` : 'Resend'}
            </Text>
          </TouchableOpacity>
        </View>
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
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    width: '100%',
  },
  messageIcon: {
    marginRight: Spacing.sm,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    flex: 1,
  },
  successText: {
    color: Colors.success,
    fontSize: 14,
    flex: 1,
  },
  emailText: {
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  otpContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  otpInput: {
    width: 45,
    height: 50,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.inputBackground,
    fontSize: 24,
    fontWeight: 'bold',
    elevation: 4,
    textAlign: 'center',
    paddingHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyButton: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  verifyButtonDisabled: {
    backgroundColor: Colors.gray,
  },
  verifyButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendContainer: {
    flexDirection: 'row',
    marginTop: Spacing.md,
  },
  resendText: {
    color: Colors.text.secondary,
    fontSize: 14,
  },
  resendLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  disabledText: {
    color: Colors.gray,
  }
}); 