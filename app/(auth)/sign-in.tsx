import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { useRouter } from 'expo-router';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignIn = async () => {
    // Reset error message on new attempt
    setErrorMessage('');
    
    if (!email || !password) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    setSigningIn(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('../(tabs)');
    } catch (error: any) {
      let errorMsg = 'Unable to sign in';
      
      // Map Firebase errors to user-friendly messages
      if (error.code === 'auth/invalid-email' || error.code === 'auth/user-not-found') {
        errorMsg = 'Invalid email address';
      } else if (error.code === 'auth/wrong-password') {
        errorMsg = 'Incorrect password';
      } else if (error.code === 'auth/too-many-requests') {
        errorMsg = 'Too many failed attempts. Please try again later';
      } else if (error.code === 'auth/network-request-failed') {
        errorMsg = 'Network error. Please check your internet connection';
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setSigningIn(false);
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
        <Image 
          source={require('../../assets/images/nook.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>
        
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
              editable={!signingIn}
            />
          </View>

          <View style={styles.inputWrapper}>
            <FontAwesome name="lock" size={20} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errorMessage) setErrorMessage('');
              }}
              secureTextEntry={!showPassword}
              editable={!signingIn}
            />
            <TouchableOpacity 
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
              disabled={signingIn}
            >
              <FontAwesome 
                name={showPassword ? "eye" : "eye-slash"} 
                size={20} 
                color={signingIn ? Colors.lightGray : Colors.gray} 
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.signInButton, signingIn && styles.signInButtonDisabled]}
          onPress={handleSignIn}
          disabled={signingIn}
        >
          {signingIn ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.signInButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => router.push('./forgot-password')}
          style={styles.forgotPasswordButton}
          disabled={signingIn}
        >
          <Text style={[styles.forgotPasswordText, signingIn && styles.disabledText]}>
            Forgot Password?
          </Text>
        </TouchableOpacity>

        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>Don't have an account? </Text>
          <TouchableOpacity 
            onPress={() => router.push('./verify-email/')}
            disabled={signingIn}
          >
            <Text style={[styles.signUpLink, signingIn && styles.disabledText]}>
              Sign Up
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
  logo: {
    width: 200,
    height: 200,
    marginBottom: Spacing.sm,
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
  eyeIcon: {
    padding: Spacing.sm,
  },
  signInButton: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    elevation: 4,
    alignItems: 'center',
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: 14,
  },
  signUpContainer: {
    flexDirection: 'row',
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  signUpText: {
    color: Colors.text.secondary,
    fontSize: 14,
  },
  signUpLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  disabledText: {
    color: Colors.lightGray,
  },
});
