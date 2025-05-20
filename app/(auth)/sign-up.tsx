import React, { useState, useEffect } from 'react';
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
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function SignUpScreen() {
  const router = useRouter();
  const { verifiedPhone, verifiedEmail } = useLocalSearchParams<{ 
    verifiedPhone: string, 
    verifiedEmail: string 
  }>();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(verifiedPhone || '+63');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Set the email from the verified email parameter if available
    if (verifiedEmail) {
      setEmail(verifiedEmail);
    }
    
    // If user directly accessed this page without going through verification,
    // redirect them to the email verification screen
    if (!verifiedEmail && !verifiedPhone) {
      setErrorMessage('Please verify your email first');
      
      // Redirect after a short delay to ensure error message is visible
      const timer = setTimeout(() => {
        router.replace('./verify-email');
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [verifiedEmail, verifiedPhone, router]);

  const handleSignUp = async () => {
    // Reset error message on new attempt
    setErrorMessage('');
    
    if (!username || !email || !phoneNumber || !password || !confirmPassword) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }

    // Validate phone number format
    const phoneRegex = /^\+63\d{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setErrorMessage('Please enter a valid Philippines phone number');
      return;
    }

    setSigningUp(true);
    try {
      console.log(`Creating new user with email: ${email} and verified phone: ${phoneNumber}`);
      // First create the user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's display name in Firebase Auth
      await updateProfile(userCredential.user, {
        displayName: username,
        // Note: phoneNumber can't be directly set in updateProfile
      });
      
      // Now store the user's data in Firestore, including the verified phone number
      const userId = userCredential.user.uid;
      await setDoc(doc(db, 'users', userId), {
        uid: userId,
        displayName: username,
        email: email,
        phoneNumber: phoneNumber, // Store the verified phone number
        phoneVerified: true,      // Flag to indicate this phone was verified
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        role: 'customer'
      });
      
      console.log('User created successfully with ID:', userId);
      
      // Navigate to the main app
      router.replace('../(tabs)');
    } catch (error: any) {
      console.error('Error creating user:', error);
      let errorMsg = 'Unable to create account';
      
      // Map Firebase errors to user-friendly messages
      if (error.code === 'auth/email-already-in-use') {
        errorMsg = 'This email is already registered';
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = 'Please enter a valid email address';
      } else if (error.code === 'auth/weak-password') {
        errorMsg = 'Password is too weak. Please use a stronger password';
      } else if (error.code === 'auth/network-request-failed') {
        errorMsg = 'Network error. Please check your internet connection';
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setSigningUp(false);
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
        <FontAwesome name="user-plus" size={80} color={Colors.primary} style={styles.icon} />
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Sign up to start ordering</Text>
        
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <FontAwesome name="exclamation-circle" size={16} color={Colors.error} style={styles.errorIcon} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}
        
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <FontAwesome name="user" size={20} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (errorMessage) setErrorMessage('');
              }}
              autoCapitalize="none"
              editable={!signingUp}
            />
          </View>

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
              editable={!verifiedEmail && !signingUp}
            />
            {verifiedEmail && (
              <FontAwesome name="check-circle" size={20} color="green" style={styles.verifiedIcon} />
            )}
          </View>

          <View style={styles.inputWrapper}>
            <FontAwesome name="phone" size={20} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={phoneNumber}
              onChangeText={(text) => {
                setPhoneNumber(text);
                if (errorMessage) setErrorMessage('');
              }}
              keyboardType="phone-pad"
              editable={verifiedPhone ? false : !signingUp}  // Disable editing if phone was verified
            />
            {verifiedPhone && (
              <FontAwesome name="check-circle" size={20} color="green" style={styles.verifiedIcon} />
            )}
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
              editable={!signingUp}
            />
            <TouchableOpacity 
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
              disabled={signingUp}
            >
              <FontAwesome 
                name={showPassword ? "eye" : "eye-slash"} 
                size={20} 
                color={signingUp ? Colors.lightGray : Colors.gray} 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputWrapper}>
            <FontAwesome name="lock" size={20} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errorMessage) setErrorMessage('');
              }}
              secureTextEntry={!showConfirmPassword}
              editable={!signingUp}
            />
            <TouchableOpacity 
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
              disabled={signingUp}
            >
              <FontAwesome 
                name={showConfirmPassword ? "eye" : "eye-slash"} 
                size={20} 
                color={signingUp ? Colors.lightGray : Colors.gray} 
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.signUpButton, signingUp && styles.signUpButtonDisabled]}
          onPress={handleSignUp}
          disabled={signingUp}
        >
          {signingUp ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.signUpButtonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <View style={styles.signInContainer}>
          <Text style={styles.signInText}>Already have an account? </Text>
          <TouchableOpacity 
            onPress={() => router.push('./sign-in')}
            disabled={signingUp}
          >
            <Text style={[styles.signInLink, signingUp && styles.disabledText]}>
              Sign In
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
  verifiedIcon: {
    marginLeft: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  eyeIcon: {
    padding: Spacing.sm,
  },
  signUpButton: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  signUpButtonDisabled: {
    backgroundColor: Colors.gray,
  },
  signUpButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  signInContainer: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
  },
  signInText: {
    color: Colors.text.secondary,
    fontSize: 14,
  },
  signInLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  disabledText: {
    color: Colors.gray,
  }
});
