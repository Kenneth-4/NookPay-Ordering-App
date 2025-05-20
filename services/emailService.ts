import { auth, db } from '../firebaseConfig';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';
import { doc, setDoc, getDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Alert } from 'react-native';
import emailjs from '@emailjs/browser';

// EmailJS configuration 
const EMAILJS_SERVICE_ID = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID || 'service_6aipiwl';
const EMAILJS_TEMPLATE_ID = process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID || 'template_8bg6o08';
const EMAILJS_PUBLIC_KEY = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY || '4PTJpGlpUN1X8xAh3';

// Flag to indicate if we're in development mode
const isDevelopment = false; // Set to false in production

// Generate a random 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Sends an OTP verification email to the provided email address using EmailJS
 * @param email The email to send verification to
 * @returns Promise resolving with the OTP sent
 */
export const sendOTPVerificationEmail = async (email: string): Promise<string> => {
  try {
    // Generate a 6-digit OTP code
    const otp = generateOTP();
    
    // Store the OTP in Firestore with expiration time (15 minutes)
    const otpRef = doc(db, 'email_otps', email);
    await setDoc(otpRef, {
      email,
      otp,
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      attempts: 0
    });
    
    // In development mode, show the OTP in an alert
    if (isDevelopment) {
      Alert.alert(
        "Development Mode",
        `Your OTP code is: ${otp}\n\nIn production, this would be sent via email.`,
        [{ text: "OK" }]
      );
      return otp;
    }
    
    // Send email using EmailJS
    try {
      // Make sure email is properly formatted and not empty
      if (!email || email.trim() === '') {
        throw new Error('Email address cannot be empty');
      }
      
      // EmailJS template parameters - may need adjustment based on your template
      const templateParams = {
        to_email: email,
        recipient: email,  // Add this field for the recipient
        email: email,      // Add this field as an alternative
        to_name: "User",   // Include user name field
        otp_code: otp,
        otp: otp,          // Add this as an alternative parameter name
        code: otp,         // Add another alternative name for the code
        verification_code: otp, // Add another alternative
        verification: otp, // Add another alternative
        app_name: 'NookPay',
        from_name: 'NookPay',
        subject: 'Your Verification Code',
        message: `Your verification code is: ${otp}. It will expire in 15 minutes.`,
        html_message: `<div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h2>Email Verification</h2>
          <p>Your verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; margin: 20px; padding: 10px; background-color: #f8f8f8; border-radius: 5px;">${otp}</div>
          <p>This code will expire in 15 minutes.</p>
          <p>If you did not request this code, please ignore this email.</p>
        </div>`
      };
      
      console.log('Sending email to:', email);
      console.log('Template params:', templateParams);
      
      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );
      
      console.log('Email sent successfully with EmailJS:', response);
    } catch (error) {
      console.error("Error sending email with EmailJS:", error);
      
      // Try fallback to Firebase Cloud Function if EmailJS fails
      try {
        const sendEmail = httpsCallable(functions, 'sendOTPEmail');
        await sendEmail({ 
          email, 
          otp,
          subject: 'Your Verification Code',
          appName: 'Nook Food Ordering'
        });
      } catch (fbError) {
        console.error("Fallback to Firebase also failed:", fbError);
        
        // Ultimate fallback to alert
        Alert.alert(
          "Failed to send email",
          `Your verification code is: ${otp}\n\nPlease use this code to verify your account.`,
          [{ text: "OK" }]
        );
      }
    }
    
    return otp;
  } catch (error: any) {
    console.error('Error sending OTP email:', error);
    
    // Handle error codes
    if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    } else {
      throw new Error('Failed to send verification email: ' + error.message);
    }
  }
};

/**
 * Verifies the OTP code entered by the user
 * @param email Email address to verify
 * @param otp The OTP code entered by user
 * @returns Promise resolving with verification result
 */
export const verifyOTP = async (email: string, otp: string): Promise<boolean> => {
  try {
    // Get the stored OTP from Firestore
    const otpRef = doc(db, 'email_otps', email);
    const otpDoc = await getDoc(otpRef);
    
    if (!otpDoc.exists()) {
      throw new Error('No verification code found for this email');
    }
    
    const otpData = otpDoc.data();
    
    // Check if OTP is expired
    const expiresAt = otpData.expiresAt.toDate();
    if (expiresAt < new Date()) {
      // Delete the expired OTP
      await deleteDoc(otpRef);
      throw new Error('Verification code expired. Please request a new one.');
    }
    
    // Update attempts count
    await setDoc(otpRef, {
      ...otpData,
      attempts: otpData.attempts + 1
    }, { merge: true });
    
    // Check if attempts exceed limit (5 attempts)
    if (otpData.attempts >= 5) {
      // Delete the OTP after too many attempts
      await deleteDoc(otpRef);
      throw new Error('Too many verification attempts. Please request a new code.');
    }
    
    // Check if OTP matches
    if (otpData.otp === otp) {
      // OTP verified successfully, delete the OTP record
      await deleteDoc(otpRef);
      return true;
    } else {
      return false;
    }
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
};

/**
 * Sends a password reset email to the provided address
 * @param email Email address to send reset to
 */
export const sendPasswordReset = async (email: string): Promise<void> => {
  try {
    // In development mode, just show an alert
    if (isDevelopment) {
      Alert.alert(
        "Development Mode",
        `Password reset link would be sent to: ${email}`,
        [{ text: "OK" }]
      );
      return;
    }
    
    // In production, call the Firebase Function to send password reset
    const sendPasswordResetFunc = httpsCallable(functions, 'sendPasswordReset');
    await sendPasswordResetFunc({ email });
  } catch (error: any) {
    console.error('Error sending password reset:', error);
    
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    } else {
      throw new Error('Failed to send password reset');
    }
  }
}; 