import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { testEmailJSConfiguration } from '../../utils/emailjsTest';
import { sendOTPVerificationEmail } from '../../services/emailService';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

export default function EmailJSTestScreen() {
  const [email, setEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [testingOTP, setTestingOTP] = useState(false);

  const runTest = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    setTesting(true);
    setResult(null);
    
    try {
      const testResult = await testEmailJSConfiguration(email);
      setResult(testResult);
      
      if (testResult.success) {
        Alert.alert('Success', 'Test email sent successfully!');
      } else {
        Alert.alert('Error', 'Failed to send test email. Check console for details.');
      }
    } catch (error) {
      console.error('Test failed:', error);
      setResult({ success: false, error });
      Alert.alert('Error', 'An unexpected error occurred during testing');
    } finally {
      setTesting(false);
    }
  };

  const testOTPEmail = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    setTestingOTP(true);
    
    try {
      const otp = await sendOTPVerificationEmail(email);
      Alert.alert('OTP Sent', `OTP ${otp} has been sent to ${email}`);
    } catch (error: any) {
      console.error('OTP test failed:', error);
      Alert.alert('Error', error.message || 'Failed to send OTP email');
    } finally {
      setTestingOTP(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>EmailJS Configuration Test</Text>
        <Text style={styles.subtitle}>
          Test your EmailJS setup by sending a test email
        </Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter test email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>
        
        <TouchableOpacity
          style={[styles.button, testing && styles.buttonDisabled]}
          onPress={runTest}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>Send Test Email</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, testingOTP && styles.buttonDisabled]}
          onPress={testOTPEmail}
          disabled={testingOTP}
        >
          {testingOTP ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <Text style={styles.secondaryButtonText}>Test OTP Flow</Text>
          )}
        </TouchableOpacity>
        
        {result && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>
              Test Result: {result.success ? 'Success' : 'Failed'}
            </Text>
            {result.success ? (
              <Text style={styles.successText}>
                Email sent successfully! Check your inbox.
              </Text>
            ) : (
              <View>
                <Text style={styles.errorText}>
                  Error: {result.error?.message || 'Unknown error'}
                </Text>
                <Text style={styles.instructions}>
                  1. Check your EmailJS template configuration{'\n'}
                  2. Verify the "To Email" field is set to {'{{'} to_email {'}}'}{'\n'}
                  3. Check that your service is active{'\n'}
                  4. Verify your API keys
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.gray,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  buttonDisabled: {
    backgroundColor: Colors.gray,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultContainer: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
    color: Colors.text.primary,
  },
  successText: {
    color: 'green',
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  instructions: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text.secondary,
  },
}); 