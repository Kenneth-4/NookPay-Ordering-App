import { View, ScrollView, TouchableOpacity, StyleSheet, Image, Alert, ImageBackground, Dimensions, Platform, Linking } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCart } from '../contexts/cart';
import { useAuth } from '../contexts/auth';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, getDoc, getDocs, updateDoc, setDoc, runTransaction, increment } from 'firebase/firestore';
import { createPaymentSource, getPaymentStatus, createPayment, isLiveMode, createCheckoutSession, retrieveCheckoutSession } from '../utils/paymongo';
import * as WebBrowser from 'expo-web-browser';
import { useState, useEffect } from 'react';
import { Card, Text, Button, Divider, List, Chip, RadioButton, Surface, ActivityIndicator, IconButton, Modal, Checkbox } from 'react-native-paper';
import { useTheme } from '../contexts/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Animatable from 'react-native-animatable';
import React from 'react';
import { TextInput } from 'react-native';
import axios from 'axios';
import { Timestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Add VoucherSettings interface
interface VoucherSettings {
  id: string;
  code: string;
  description: string;
  discountAmount: number;  // Changed from discountPercentage to discountAmount
  minimumOrderAmount: number;
  maxUsagePerUser: number;
  enabled: boolean;
}

// Interface for user voucher usage data
interface UserVoucherUsage {
    [voucherCode: string]: number; // Map of voucher code to usage count
}

// Import payment method images
const gcashIcon = require('../assets/images/gcash.png');
const mayaIcon = require('../assets/images/maya.png');
const grabpayIcon = require('../assets/images/grabpay.png');

export default function Cart() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, getCartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing payment...');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [taxSettings, setTaxSettings] = useState<{
    enabled: boolean;
    percentage: number;
    label: string;
  }>({
    enabled: false,
    percentage: 0,
    label: ''
  });

  const [paymentSettings, setPaymentSettings] = useState<{
    enableCash: boolean;
    enableGCash: boolean;
    enableMaya: boolean;
    enableGrabPay: boolean;
    autoApplyServiceCharge: boolean;
    serviceChargePercentage: number;
  }>({
    enableCash: true,
    enableGCash: true,
    enableMaya: true,
    enableGrabPay: true,
    autoApplyServiceCharge: false,
    serviceChargePercentage: 0
  });

  const [diningMethod, setDiningMethod] = useState('pickup');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('gcash');
  const [vouchers, setVouchers] = useState<VoucherSettings[]>([]);
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<VoucherSettings | null>(null);
  const [userVoucherUsage, setUserVoucherUsage] = useState<UserVoucherUsage>({});
  const [isCheckingUsage, setIsCheckingUsage] = useState(false);
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);

  // Add modal states
  const [cautionModalVisible, setCautionModalVisible] = useState(false);
  const [redirectModalVisible, setRedirectModalVisible] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(10);
  const [dontShowCautionAgain, setDontShowCautionAgain] = useState(false);

  useEffect(() => {
    loadTaxSettings();
    loadPaymentSettings();
    loadVoucherSettings();
    loadCautionModalPreference();
    if (user) {
      loadUserVoucherUsage();
    }
  }, [user]);

  useEffect(() => {
    // Web platforms have different redirect handling than native
    const isWeb = Platform.OS === 'web';
    
    // Check for payment status after component mounts (for web)
    if (isWeb && paymentSessionId) {
      // Give a moment for the payment to be processed
      const timer = setTimeout(() => {
        console.log('Web platform: Checking payment status after page load');
        checkPaymentStatus();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
    
    // Set up link listener (for native)
    const handleDeepLink = async (event: { url: string }) => {
      console.log('Deep link received:', event.url);
      
      // Process payment result when returning to the app
      if (event.url.includes('payment/success') || event.url.includes('payment/failed')) {
        console.log('Payment deep link detected:', event.url);
        
        // Try to extract sessionId from the URL if present
        const urlObj = new URL(event.url);
        const sessionParam = urlObj.searchParams.get('session');
        
        let sessionToCheck = paymentSessionId;
        if (sessionParam) {
          console.log('Found session ID in deep link URL:', sessionParam);
          sessionToCheck = sessionParam;
        }
        
        // If we have a payment session ID, check its status
        if (sessionToCheck) {
          console.log('Checking payment status for session:', sessionToCheck);
          try {
            // Set the payment session ID if it came from the URL
            if (sessionParam && sessionParam !== paymentSessionId) {
              setPaymentSessionId(sessionParam);
            }
            
            await checkPaymentStatus();
          } catch (error) {
            console.error('Error checking payment status on return:', error);
          }
        } else {
          console.log('No payment session ID found in cart. Redirecting to My Orders tab');
          // If we don't have a session ID in this component, the user might have
          // already been redirected and created an order. Go to My Orders tab.
          Alert.alert(
            'Payment Processed',
            'Returning from payment. Please check your orders status.',
            [
              {
                text: 'View Orders',
                onPress: () => router.push('/(tabs)/my-order')
              }
            ]
          );
        }
      }
    };

    // Only add event listeners for non-web platforms
    if (!isWeb) {
      // Add event listener for deep links
      const linkingSubscription = Linking.addEventListener('url', handleDeepLink);

      // Check if app was opened with a deep link
      Linking.getInitialURL().then(url => {
        if (url) {
          console.log('App opened with URL:', url);
          handleDeepLink({ url });
        }
      });
      
      // Cleanup
      return () => {
        linkingSubscription.remove();
      };
    }
  }, [paymentSessionId, router]);

  const loadTaxSettings = async () => {
    try {
      const settingsRef = doc(db, 'settings', 'config');
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        setTaxSettings(settings.tax);
      }
    } catch (error) {
      console.error('Error loading tax settings:', error);
    }
  };

  const loadPaymentSettings = async () => {
    try {
      const settingsRef = doc(db, 'settings', 'config');
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        // Ensure all required properties exist with defaults if missing
        setPaymentSettings({
          enableCash: settings.payment?.enableCash ?? true,
          enableGCash: settings.payment?.enableGCash ?? true,
          enableMaya: settings.payment?.enableMaya ?? true,
          enableGrabPay: settings.payment?.enableGrabPay ?? true,
          autoApplyServiceCharge: settings.payment?.autoApplyServiceCharge ?? false,
          serviceChargePercentage: settings.payment?.serviceChargePercentage ?? 0
        });
      }
    } catch (error) {
      console.error('Error loading payment settings:', error);
    }
  };

  const loadVoucherSettings = async () => {
    try {
      const settingsRef = doc(db, 'settings', 'config');
      const settingsDoc = await getDoc(settingsRef);
      if (settingsDoc.exists() && settingsDoc.data()?.vouchers) {
        setVouchers(settingsDoc.data().vouchers as VoucherSettings[]);
      } else {
        setVouchers([]);
      }
    } catch (error) {
      console.error("Error loading voucher settings:", error);
    }
  };

  const loadUserVoucherUsage = async () => {
    if (!user) return;
    setIsCheckingUsage(true);
    try {
      const usageRef = doc(db, 'users', user.uid, 'voucherUsage', 'counts');
      const usageDoc = await getDoc(usageRef);
      if (usageDoc.exists()) {
        setUserVoucherUsage(usageDoc.data() as UserVoucherUsage);
      } else {
        setUserVoucherUsage({});
      }
    } catch (error) {
      console.error("Error loading user voucher usage:", error);
    } finally {
      setIsCheckingUsage(false);
    }
  };

  const calculateTax = (total: number) => {
    if (!taxSettings?.enabled) return 0;
    // Calculate VAT as exactly 12% of the total price
    return total * 0.12;
  };

  const calculateServiceCharge = (subtotal: number) => {
    if (!paymentSettings?.autoApplyServiceCharge) return 0;
    return (subtotal * (paymentSettings?.serviceChargePercentage || 0)) / 100;
  };

  const calculateVoucherDiscount = (subtotal: number) => {
    if (appliedVoucher && subtotal >= appliedVoucher.minimumOrderAmount) {
      // Fixed amount discount (no longer percentage-based)
      return appliedVoucher.discountAmount;
    } else if (appliedVoucher && subtotal < appliedVoucher.minimumOrderAmount) {
      // Discount becomes 0 if min spend not met, alert handled on apply/checkout
      return 0;
    }
    return 0;
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCodeInput('');
    if (Platform.OS === 'web') {
      window.alert('Voucher has been removed.');
    } else {
      Alert.alert('Voucher Removed', 'Voucher has been removed.');
    }
  };

  const handleCheckout = async () => {
    try {
      // Check if user is logged in or cart is empty - no change to this logic
      if (!user) {
        if (Platform.OS === 'web') {
          if (window.confirm('Please login to place an order. Would you like to go to the login page?')) {
            router.push('/(auth)/sign-in');
          } else {
            setIsLoading(false);
            setPaymentProcessing(false);
          }
        } else {
          Alert.alert(
            'Login Required',
            'Please login to place an order.',
            [
              {
                text: 'Login',
                onPress: () => router.push('/(auth)/sign-in'),
              },
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  setIsLoading(false);
                  setPaymentProcessing(false);
                },
              },
            ]
          );
        }
        return;
      }

      if (items.length === 0) {
        if (Platform.OS === 'web') {
          window.alert('Your cart is empty');
        } else {
          Alert.alert('Error', 'Your cart is empty');
        }
        setIsLoading(false);
        setPaymentProcessing(false);
        return;
      }
      
      // Check if we should show the caution modal or skip it
      if (dontShowCautionAgain) {
        // Skip modal and proceed directly to payment
        processPayment();
      } else {
        // Show caution modal
        setCautionModalVisible(true);
      }
      
    } catch (error) {
      console.error('Error placing order:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to process your order. Please try again.');
      } else {
        Alert.alert(
          'Error',
          'Failed to process your order. Please try again.'
        );
      }
      setIsLoading(false);
      setPaymentProcessing(false);
    }
  };

  // Function to handle proceed to payment button click
  const handleProceedToPayment = () => {
    // Save preference if checkbox is checked
    if (dontShowCautionAgain) {
      saveCautionModalPreference(true);
    }
    
    // Proceed to payment
    processPayment();
  };

  // Extract the payment processing logic to a separate function
  const processPayment = async () => {
    try {
      setCautionModalVisible(false); // Close the caution modal
      setLoadingMessage('Preparing payment gateway...');
      setIsLoading(true);
      setPaymentProcessing(true);
      
      // We already checked for user in handleCheckout, but add an additional check
      // to satisfy the TypeScript compiler
      if (!user) {
        setIsLoading(false);
        setPaymentProcessing(false);
        return;
      }

      const checkoutSubtotal = getCartTotal() * 0.88; // Calculate subtotal as 88% of total
      const checkoutTax = getCartTotal() * 0.12; // Tax is exactly 12% of total
      const checkoutServiceCharge = calculateServiceCharge(checkoutSubtotal);
      let checkoutVoucherDiscount = 0;
      let finalAppliedVoucher = appliedVoucher;

      if (appliedVoucher) {
        // Apply voucher validation logic here - no changes to this part
        const maxUsage = appliedVoucher.maxUsagePerUser ?? 0;
        const currentUsage = userVoucherUsage[appliedVoucher.code] || 0;

        if (maxUsage > 0 && currentUsage >= maxUsage) {
          if (Platform.OS === 'web') {
            window.alert('Usage Limit Reached: You have reached the usage limit for voucher "' + appliedVoucher.code + '" (' + maxUsage + '). It has been removed.');
          } else {
            Alert.alert('Usage Limit Reached', 'You have reached the usage limit for voucher "' + appliedVoucher.code + '" (' + maxUsage + '). It has been removed.');
          }
          finalAppliedVoucher = null;
          setAppliedVoucher(null);
          setVoucherCodeInput('');
          setIsLoading(false);
          setPaymentProcessing(false);
          return;
        }

        if (checkoutSubtotal >= appliedVoucher.minimumOrderAmount) {
          // Apply fixed amount discount instead of percentage
          checkoutVoucherDiscount = appliedVoucher.discountAmount;
        } else {
          finalAppliedVoucher = null;
          setAppliedVoucher(null);
          setVoucherCodeInput('');
          if (Platform.OS === 'web') {
            window.alert('Minimum Spend Not Met: The voucher ' + appliedVoucher.code + ' requires ₱' + appliedVoucher.minimumOrderAmount.toFixed(2) + '. It has been removed.');
          } else {
            Alert.alert('Minimum Spend Not Met', 'The voucher ' + appliedVoucher.code + ' requires ₱' + appliedVoucher.minimumOrderAmount.toFixed(2) + '. It has been removed.');
          }
          setIsLoading(false);
          setPaymentProcessing(false);
          return;
        }
      }
      
      const finalTotal = checkoutSubtotal + checkoutTax + checkoutServiceCharge - checkoutVoucherDiscount;

      try {
        // For consistent redirect URLs that work across platforms
        let successPath, failedPath;
        
        // Use the same paths for web and mobile since we're using static pages now
        successPath = 'payment/success';
        failedPath = 'payment/failed';
        
        console.log(`Starting checkout with amount:`, finalTotal);
        
        // Prepare customer info for payment
        const customerName = user.displayName || 'Guest';
        const customerEmail = user.email || 'guest@example.com';
        
        // Determine which payment methods to enable based on selection
        let paymentMethodTypes: string[] = [];
        
        if (selectedPaymentMethod === 'gcash') {
          paymentMethodTypes = ['gcash'];
        } else if (selectedPaymentMethod === 'maya') {
          paymentMethodTypes = ['paymaya'];
        } else if (selectedPaymentMethod === 'grab_pay') {
          paymentMethodTypes = ['grab_pay'];
        } else {
          // Default to all payment methods if nothing specific is selected
          paymentMethodTypes = ['card', 'gcash', 'paymaya', 'grab_pay'];
        }
        
        setLoadingMessage('Creating payment session...');
        
        // Create a checkout session using the Checkout API
        const checkoutSession = await createCheckoutSession(
          finalTotal,
          successPath,
          failedPath,
          {
            name: customerName,
            email: customerEmail,
            phone: '09123456789' // Ideally, this would come from user profile
          },
          paymentMethodTypes
        );

        console.log('Checkout session created:', checkoutSession);
        
        if (!checkoutSession || !checkoutSession.id) {
          throw new Error('Invalid checkout session returned');
        }
        
        if (!checkoutSession.attributes || !checkoutSession.attributes.checkout_url) {
          throw new Error('Invalid checkout URL in checkout session');
        }
        
        // Store the session ID for later status checking
        setPaymentSessionId(checkoutSession.id);
        
        const checkoutUrl = checkoutSession.attributes.checkout_url;
        console.log('Opening checkout URL:', checkoutUrl);

        setLoadingMessage('Creating your order...');
        
        // Create an order with unpaid status before opening the payment page
        // This ensures we have the order recorded even if the user doesn't return to the app
        await createOrderWithUnpaidStatus(
          finalTotal, 
          checkoutTax, 
          checkoutServiceCharge, 
          checkoutVoucherDiscount,
          finalAppliedVoucher,
          checkoutSession.id
        );

        // Clear cart and reset UI state
        clearCart();
        setAppliedVoucher(null);
        setVoucherCodeInput('');
        
        // Show brief confirmation before redirect
        setLoadingMessage('Order created! Redirecting to payment...');
        
        // Immediate redirect to my-order page with slight delay to show message
        setTimeout(() => {
          // Open payment URL in browser
          if (Platform.OS === 'web') {
            // For web, open in new tab
            window.open(checkoutUrl, '_blank');
          } else {
            // For mobile platforms
            Linking.openURL(checkoutUrl).catch(err => {
              console.error('Error opening payment URL:', err);
              Alert.alert('Error', 'Could not open payment URL. Please try again.');
            });
          }
          
          // Reset loading state
          setIsLoading(false);
          setPaymentProcessing(false);
          
          // Navigate to my-order page and specify the "unpaid" tab
          router.push({
            pathname: '/(tabs)/my-order',
            params: { initialTab: 'unpaid' }
          });
        }, 1000);
        
      } catch (paymentError: any) {
        console.error('Payment error:', paymentError);
        if (Platform.OS === 'web') {
          window.alert('Payment Error: There was an error processing your payment: ' + (paymentError.message || 'Unknown error'));
        } else {
          Alert.alert(
            'Payment Error',
            'There was an error processing your payment: ' + (paymentError.message || 'Unknown error')
          );
        }
        setIsLoading(false);
        setPaymentProcessing(false);
      }
    } catch (error) {
      console.error('Error during payment processing:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to process your order. Please try again.');
      } else {
        Alert.alert(
          'Error',
          'Failed to process your order. Please try again.'
        );
      }
      setIsLoading(false);
      setPaymentProcessing(false);
    }
  };

  // Add function to handle the redirect countdown
  const startRedirectCountdown = () => {
    setRedirectCountdown(10); // Start from 10 seconds
    setRedirectModalVisible(true); // Show the redirect modal
    
    // Start the countdown
    const countdownInterval = setInterval(() => {
      setRedirectCountdown((prevCount) => {
        const newCount = prevCount - 1;
        
        // When countdown reaches 0, clear the interval and navigate
        if (newCount <= 0) {
          clearInterval(countdownInterval);
          setRedirectModalVisible(false); // Hide the modal
          router.push('/(tabs)/my-order'); // Redirect to my-orders
          setIsLoading(false);
          setPaymentProcessing(false);
        }
        
        return newCount;
      });
    }, 1000);
  };

  // Helper function to immediately create an order with unpaid status for mobile
  const createOrderWithUnpaidStatus = async (
    finalTotal: number,
    tax: number,
    serviceCharge: number,
    voucherDiscount: number,
    appliedVoucher: VoucherSettings | null,
    checkoutSessionId: string
  ) => {
    try {
      // Set expiry time (10 minutes from now)
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 10);
      
      // Create the order with unpaid status
      await createOrderInDatabase(
        user, 
        items, 
        getCartTotal() * 0.88, // Subtotal as 88% of total 
        getCartTotal() * 0.12, // Tax as 12% of total
        taxSettings, 
        calculateServiceCharge(getCartTotal() * 0.88), 
        paymentSettings, 
        getCartTotal() + calculateServiceCharge(getCartTotal() * 0.88) - calculateVoucherDiscount(getCartTotal() * 0.88), 
        calculateVoucherDiscount(getCartTotal() * 0.88),
        appliedVoucher, 
        selectedPaymentMethod, 
        checkoutSessionId,
        diningMethod,
        'unpaid',  // Set payment status back to unpaid for awaiting payment
        Timestamp.fromDate(expiryTime)
      );
      
      // Clear cart and reset state
      clearCart();
      setAppliedVoucher(null);
      setVoucherCodeInput('');
      setPaymentSessionId(null);
      setIsLoading(false);
      
      // Navigate to my-order page so user can monitor payment status
      Alert.alert(
        'Order Created', 
        'Your order has been created. Please complete the payment in your browser, then check the "Awaiting Payment" section in My Orders.',
        [
          {
            text: 'OK',
            onPress: () => router.push({
              pathname: '/(tabs)/my-order',
              params: { initialTab: 'unpaid' }
            }),
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error creating unpaid order:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Could not create your order. Please try again.');
    }
  };

  // Create an order in the database
  const createOrderInDatabase = async (
    user: any,
    items: any[],
    subtotal: number,
    tax: number,
    taxSettings: any,
    serviceCharge: number,
    paymentSettings: any,
    total: number,
    voucherDiscount: number,
    appliedVoucher: VoucherSettings | null,
    paymentMethod: string,
    paymentId: string,
    diningMode: string,
    paymentStatus: 'paid' | 'unpaid' = 'paid',
    paymentExpiryTime?: Timestamp
  ) => {
    try {
      // Calculate points based on quantity of each item (1 point per quantity)
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      
      // Update voucher usage if applicable
      if (appliedVoucher) {
        try {
          const usageRef = doc(db, 'users', user.uid, 'voucherUsage', 'counts');
          await runTransaction(db, async (transaction) => {
            const usageDoc = await transaction.get(usageRef);
            const currentCount = usageDoc.exists() ? (usageDoc.data()?.[appliedVoucher.code] || 0) : 0;
                      
            const maxUsage = appliedVoucher.maxUsagePerUser ?? 0;
            if (maxUsage > 0 && currentCount >= maxUsage) {
              console.warn(`User ${user.uid} exceeded limit for ${appliedVoucher.code} during transaction.`);
              throw new Error("Usage limit reached during transaction");
            }
                      
            const updateData: UserVoucherUsage = {};
            updateData[appliedVoucher.code] = currentCount + 1;

            if (usageDoc.exists()) {
              transaction.update(usageRef, updateData);
            } else {
              const initialData: UserVoucherUsage = {};
              initialData[appliedVoucher.code] = 1;
              transaction.set(usageRef, initialData);
            }
          });
          console.log('Voucher usage count incremented successfully.');
          setUserVoucherUsage(prev => ({
            ...prev, 
            [appliedVoucher.code]: (prev[appliedVoucher.code] || 0) + 1 
          }));
        } catch (usageError) {
          console.error("Error updating voucher usage count:", usageError);
          if (Platform.OS === 'web') {
            window.alert("Warning: Order placed, but failed to update voucher usage count. Please contact support if you encounter issues reusing the voucher.");
          } else {
            Alert.alert("Warning", "Order placed, but failed to update voucher usage count. Please contact support if you encounter issues reusing the voucher.");
          }
        }
      }

      // Create the order object
      const order = {
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.totalPrice,
          addOns: Object.values(item.addOns || {}).map((addOn: any) => ({
            id: addOn.id,
            name: addOn.name,
            price: addOn.price
          })),
          voucher: appliedVoucher ? {
            code: appliedVoucher.code,
            description: appliedVoucher.description || '',
            discountAmount: voucherDiscount,
            // For backward compatibility
            percentage: 0
          } : null
        })),
        subtotal: subtotal,
        tax: {
          amount: tax,
          percentage: taxSettings?.percentage || 0,
          label: taxSettings?.label || 'Tax'
        },
        serviceCharge: {
          amount: serviceCharge,
          percentage: paymentSettings?.serviceChargePercentage || 0
        },
        total: total,
        status: paymentStatus === 'paid' ? 'pending' : 'pending',
        customerName: user.displayName || 'Guest',
        customerId: user.uid,
        customerEmail: user.email,
        createdAt: serverTimestamp(),
        source: 'customer',
        paymentMethod: paymentMethod,
        paymentStatus: paymentStatus,
        paymentId: paymentId,
        checkoutSessionId: paymentId,
        diningMode: diningMode,
        staffId: '',
        staffEmail: '',
        paymentExpiryTime: paymentExpiryTime,
        pointsEarned: totalQuantity // Store earned points in order
      };

      // Add the order to Firestore
      const ordersRef = collection(db, 'orders');
      const orderRef = await addDoc(ordersRef, order);

      // Only update user stats if payment is successful
      if (paymentStatus === 'paid') {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const currentPoints = userDoc.data().points || 0;
          const currentOrders = userDoc.data().ordersCount || 0;
          
          await updateDoc(userRef, {
            points: currentPoints + totalQuantity, // Add one point per quantity
            ordersCount: currentOrders + 1,
            name: user.displayName || 'Guest',
            email: user.email
          });
        } else {
          await setDoc(userRef, {
            points: totalQuantity, // Add one point per quantity
            ordersCount: 1,
            name: user.displayName || 'Guest',
            email: user.email
          });
        }
      }

      return orderRef.id;
    } catch (error) {
      console.error('Error creating order in database:', error);
      throw error;
    }
  };

  // Function to check payment status
  const checkPaymentStatus = async () => {
    if (!paymentSessionId) {
      console.log('No payment session ID to check');
      setIsLoading(false);
      setPaymentProcessing(false);
      return;
    }
    
    try {
      setLoadingMessage('Verifying payment status...');
      console.log('Checking payment status for session:', paymentSessionId);
      
      // Give the payment a moment to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check the checkout session status
      const session = await retrieveCheckoutSession(paymentSessionId);
      console.log('Retrieved checkout session:', session);
      
      // Check if the session has a payment intent with payments
      const paymentIntent = session.attributes.payment_intent;
      
      if (paymentIntent && 
          paymentIntent.attributes && 
          paymentIntent.attributes.payments && 
          paymentIntent.attributes.payments.length > 0) {
        
        const payment = paymentIntent.attributes.payments[0];
        const paymentStatus = payment.attributes.status;
        
        console.log('Payment status:', paymentStatus);
        
        if (paymentStatus === 'paid') {
          setLoadingMessage('Payment successful! Creating your order...');
          // Payment was successful, create the order
          await createOrderInDatabase(
            user, 
            items, 
            getCartTotal() * 0.88, // Subtotal as 88% of total
            getCartTotal() * 0.12, // Tax as 12% of total
            taxSettings, 
            calculateServiceCharge(getCartTotal() * 0.88), 
            paymentSettings, 
            getCartTotal() + calculateServiceCharge(getCartTotal() * 0.88) - calculateVoucherDiscount(getCartTotal() * 0.88), 
            calculateVoucherDiscount(getCartTotal() * 0.88),
            appliedVoucher, 
            selectedPaymentMethod, 
            paymentSessionId,
            diningMethod,
            'paid',  // Set payment status as paid
            Timestamp.fromDate(new Date())
          );
          
          // Calculate total quantity for points
          const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
          
          clearCart();
          setAppliedVoucher(null);
          setVoucherCodeInput('');
          setPaymentSessionId(null);

          if (Platform.OS === 'web') {
            window.alert('Order Placed Successfully: Your payment was successful and your order has been placed! You earned ' + totalQuantity + ' points!');
            // For web, redirect to the orders page
            router.push('/(tabs)/my-order');
          } else {
            Alert.alert(
              'Order Placed Successfully', 
              'Your payment was successful and your order has been placed! You earned ' + totalQuantity + ' points!',
              [
                {
                  text: 'View Orders',
                  onPress: () => router.push('/(tabs)/my-order'),
                },
                {
                  text: 'Continue Shopping',
                  onPress: () => router.push('/(tabs)/order'),
                },
              ]
            );
          }
        } else {
          // Payment failed or is still pending
          // Create order with unpaid status and an expiry timer
          setLoadingMessage('Payment not completed. Saving your order...');
          const expiryTime = new Date();
          expiryTime.setMinutes(expiryTime.getMinutes() + 10); // 10 minutes from now
          
          await createOrderInDatabase(
            user, 
            items, 
            getCartTotal() * 0.88, // Subtotal as 88% of total
            getCartTotal() * 0.12, // Tax as 12% of total
            taxSettings, 
            calculateServiceCharge(getCartTotal() * 0.88), 
            paymentSettings, 
            getCartTotal() + calculateServiceCharge(getCartTotal() * 0.88) - calculateVoucherDiscount(getCartTotal() * 0.88), 
            calculateVoucherDiscount(getCartTotal() * 0.88),
            appliedVoucher, 
            selectedPaymentMethod, 
            paymentSessionId,
            diningMethod,
            'unpaid',  // Set payment status as unpaid
            Timestamp.fromDate(expiryTime)
          );
          
          clearCart();
          setAppliedVoucher(null);
          setVoucherCodeInput('');
          setPaymentSessionId(null);
          
          if (Platform.OS === 'web') {
            window.alert('Payment Not Completed: Your order has been saved, but payment is required. Please check the "Awaiting Payment" section in My Orders to complete your payment within 10 minutes.');
            router.push({
              pathname: '/(tabs)/my-order',
              params: { initialTab: 'unpaid' }
            });
          } else {
            Alert.alert(
              'Payment Not Completed', 
              'Your order has been saved, but payment is required. Please check the "Awaiting Payment" section in My Orders to complete your payment within 10 minutes.',
              [
                {
                  text: 'Go to My Orders',
                  onPress: () => router.push({
                    pathname: '/(tabs)/my-order',
                    params: { initialTab: 'unpaid' }
                  }),
                },
                {
                  text: 'OK',
                  style: 'cancel',
                },
              ]
            );
          }
        }
      } else {
        // Special handling for web to delay longer or retry
        if (Platform.OS === 'web') {
          // On web, sometimes the payment status takes longer to update
          // Check if this is the first attempt and retry if so
          const retryCount = parseInt(sessionStorage.getItem('paymentRetryCount') || '0');
          
          if (retryCount < 2) {
            // Increment retry count
            sessionStorage.setItem('paymentRetryCount', (retryCount + 1).toString());
            
            // Wait longer and retry
            console.log(`Web payment check: Retry attempt ${retryCount + 1}...`);
            setLoadingMessage(`Verifying payment (attempt ${retryCount + 1})...`);
            setTimeout(() => checkPaymentStatus(), 3000);
            return;
          } else {
            // Reset retry count
            sessionStorage.removeItem('paymentRetryCount');
          }
        }
        
        // No payment was found - create order with unpaid status
        setLoadingMessage('No payment found. Saving your order as unpaid...');
        const expiryTime = new Date();
        expiryTime.setMinutes(expiryTime.getMinutes() + 10); // 10 minutes from now
        
        await createOrderInDatabase(
          user, 
          items, 
          getCartTotal() * 0.88, // Subtotal as 88% of total
          getCartTotal() * 0.12, // Tax as 12% of total
          taxSettings, 
          calculateServiceCharge(getCartTotal() * 0.88), 
          paymentSettings, 
          getCartTotal() + calculateServiceCharge(getCartTotal() * 0.88) - calculateVoucherDiscount(getCartTotal() * 0.88), 
          calculateVoucherDiscount(getCartTotal() * 0.88),
          appliedVoucher, 
          selectedPaymentMethod, 
          paymentSessionId,
          diningMethod,
          'unpaid',  // Set payment status as unpaid
          Timestamp.fromDate(expiryTime)
        );
        
        clearCart();
        setAppliedVoucher(null);
        setVoucherCodeInput('');
        setPaymentSessionId(null);
        
        if (Platform.OS === 'web') {
          window.alert('Payment Not Completed: Your order has been saved, but payment is required. Please check the "Awaiting Payment" section in My Orders to complete your payment within 10 minutes.');
          router.push({
            pathname: '/(tabs)/my-order',
            params: { initialTab: 'unpaid' }
          });
        } else {
          Alert.alert(
            'Payment Not Completed', 
            'Your order has been saved, but payment is required. Please check the "Awaiting Payment" section in My Orders to complete your payment within 10 minutes.',
            [
              {
                text: 'Go to My Orders',
                onPress: () => router.push({
                  pathname: '/(tabs)/my-order',
                  params: { initialTab: 'unpaid' }
                }),
              },
              {
                text: 'OK',
                style: 'cancel',
              },
            ]
          );
        }
      }
    } catch (statusError: any) {
      console.error('Error checking payment status:', statusError);
      
      // In case of error, still create the order with unpaid status
      setLoadingMessage('Error checking payment. Saving your order as unpaid...');
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 10); // 10 minutes from now
      
      await createOrderInDatabase(
        user, 
        items, 
        getCartTotal() * 0.88, // Subtotal as 88% of total
        getCartTotal() * 0.12, // Tax as 12% of total
        taxSettings, 
        calculateServiceCharge(getCartTotal() * 0.88), 
        paymentSettings, 
        getCartTotal() + calculateServiceCharge(getCartTotal() * 0.88) - calculateVoucherDiscount(getCartTotal() * 0.88), 
        calculateVoucherDiscount(getCartTotal() * 0.88),
        appliedVoucher, 
        selectedPaymentMethod, 
        paymentSessionId,
        diningMethod,
        'unpaid',  // Set payment status as unpaid
        Timestamp.fromDate(expiryTime)
      );
      
      clearCart();
      setAppliedVoucher(null);
      setVoucherCodeInput('');
      setPaymentSessionId(null);
      
      if (Platform.OS === 'web') {
        window.alert('Payment Status Unknown: Your order has been saved, but payment is required. Please check the "Awaiting Payment" section in My Orders to complete your payment within 10 minutes.');
        router.push({
          pathname: '/(tabs)/my-order',
          params: { initialTab: 'unpaid' }
        });
      } else {
        Alert.alert(
          'Payment Status Unknown', 
          'Your order has been saved, but payment is required. Please check the "Awaiting Payment" section in My Orders to complete your payment within 10 minutes.',
          [
            {
              text: 'Go to My Orders',
              onPress: () => router.push({
                pathname: '/(tabs)/my-order',
                params: { initialTab: 'unpaid' }
              }),
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ]
        );
      }
    } finally {
      setIsLoading(false);
      setPaymentProcessing(false);
    }
  };

  // Add Fullscreen Loading Overlay
  const renderLoadingOverlay = () => {
    if (!paymentProcessing) return null;
    
    return (
      <View style={styles.loadingOverlay}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F36514" />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
      </View>
    );
  };

  // Add function to load caution modal preference
  const loadCautionModalPreference = async () => {
    try {
      const preferenceKey = user ? `payment_caution_hidden_${user.uid}` : 'payment_caution_hidden';
      const hideCaution = await AsyncStorage.getItem(preferenceKey);
      if (hideCaution === 'true') {
        setDontShowCautionAgain(true);
      }
    } catch (error) {
      console.error('Error loading caution modal preference:', error);
    }
  };

  // Add function to save caution modal preference
  const saveCautionModalPreference = async (hideModal: boolean) => {
    try {
      const preferenceKey = user ? `payment_caution_hidden_${user.uid}` : 'payment_caution_hidden';
      await AsyncStorage.setItem(preferenceKey, hideModal ? 'true' : 'false');
    } catch (error) {
      console.error('Error saving caution modal preference:', error);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
            <View style={styles.emptyContainer}>
              <Animatable.View animation="bounceIn" duration={1500}>
                <FontAwesome name="user-circle" size={64} color="#9CA3AF" />
              </Animatable.View>
              <Text style={styles.emptyText}>Please login to view your cart</Text>
              <Animatable.View animation="pulse" iterationCount="infinite" duration={2000}>
                <TouchableOpacity 
                  style={styles.browseButton}
                  onPress={() => router.push('/(auth)/sign-in')}
                >
                  <LinearGradient
                    colors={['#F36514', '#F8943F']}
                    style={styles.buttonGradient}
                    start={[0, 0]}
                    end={[1, 0]}
                  >
                    <Text style={styles.browseButtonText}>Login</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animatable.View>
            </View>
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        
          
            <View style={styles.emptyContainer}>
              <Animatable.View animation="bounceIn" duration={1500}>
                <FontAwesome name="shopping-cart" size={64} color="#9CA3AF" />
              </Animatable.View>
              <Text style={styles.emptyText}>Your cart is empty</Text>
              <Animatable.View animation="pulse" iterationCount="infinite" duration={2000}>
                <TouchableOpacity 
                  style={styles.browseButton}
                  onPress={() => router.push('/(tabs)/order')}
                >
                  <LinearGradient
                    colors={['#F36514', '#F8943F']}
                    style={styles.buttonGradient}
                    start={[0, 0]}
                    end={[1, 0]}
                  >
                    <Text style={styles.browseButtonText}>Browse Menu</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animatable.View>
            </View>
          
        
      </SafeAreaView>
    );
  }

  const subtotal = getCartTotal() * 0.88; // Calculate subtotal as 88% of total
  const tax = getCartTotal() * 0.12; // Tax is exactly 12% of total
  const serviceCharge = calculateServiceCharge(subtotal);
  const voucherDiscount = calculateVoucherDiscount(subtotal);
  const total = getCartTotal() + serviceCharge - voucherDiscount;

  const exampleEnabledVoucher = vouchers.find(v => v.enabled);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {renderLoadingOverlay()}
      
        <LinearGradient
          colors={['rgba(249, 250, 251, 0.9)', 'rgba(249, 250, 251, 0.8)']}
          style={styles.gradientOverlay}
        >
          <View style={styles.headerContainer}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <FontAwesome name="chevron-left" size={18} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Cart</Text>
          </View>
          
          <View style={styles.mainContainer}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
              
                {items.map((item, index) => (
                  <Animatable.View 
                    key={item.id} 
                    animation="fadeInUp" 
                    duration={500} 
                    delay={index * 100}
                  >
                    <View style={styles.orderItem}>
                      <Image source={{ uri: item.image }} style={styles.itemImage} />
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <View style={styles.addOns}>
                          {Object.values(item.addOns).map((addOn) => (
                            <Text key={addOn.id} style={styles.addOnText}>
                              • {addOn.name}
                            </Text>
                          ))}
                        </View>
                        <Text style={styles.itemPrice}>₱{item.totalPrice.toFixed(2)}</Text>
                        <View style={styles.itemControls}>
                          <View style={styles.quantityControls}>
                            <TouchableOpacity
                              onPress={() => updateQuantity(item.id, item.quantity - 1)}
                              style={styles.quantityButton}
                            >
                              <FontAwesome name="minus" size={14} color="#F36514" />
                            </TouchableOpacity>
                            <Text style={styles.quantityText}>{item.quantity}</Text>
                            <TouchableOpacity
                              onPress={() => updateQuantity(item.id, item.quantity + 1)}
                              style={styles.quantityButton}
                            >
                              <FontAwesome name="plus" size={14} color="#F36514" />
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity
                            onPress={() => removeItem(item.id)}
                            style={styles.removeButton}
                          >
                            <FontAwesome name="trash" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                    {index < items.length - 1 && <Divider style={styles.itemDivider} />}
                  </Animatable.View>
                ))}
              

              <Animatable.View animation="fadeInUp" duration={800} delay={items.length * 100 + 200}>
                {vouchers.length > 0 && (
                  <View>
                    <Divider style={styles.sectionDivider} />
                    <Text style={styles.summaryTitle}>Apply Voucher</Text>
                    {appliedVoucher ? (
                      <View style={styles.appliedVoucherRow}>
                        <FontAwesome name="check-circle" size={20} color="#10B981" style={{ marginRight: 8 }} />
                        <Text style={styles.appliedVoucherText}>Voucher <Text style={{ fontWeight: 'bold' }}>{appliedVoucher.code}</Text> applied!</Text>
                        <TouchableOpacity onPress={handleRemoveVoucher} style={styles.removeVoucherButton}>
                          <FontAwesome name="times" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View>
                        <Text style={styles.voucherSelectionLabel}>Select available vouchers:</Text>
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={true} 
                          style={styles.vouchersScrollView}
                          contentContainerStyle={styles.vouchersScrollContent}
                        >
                          {vouchers.filter(v => v.enabled).map((voucher) => {
                            const isEligible = getCartTotal() >= voucher.minimumOrderAmount;
                            const currentUsage = userVoucherUsage[voucher.code] || 0;
                            const maxUsage = voucher.maxUsagePerUser ?? 0;
                            const hasReachedLimit = maxUsage > 0 && currentUsage >= maxUsage;
                            
                            return (
                              <TouchableOpacity 
                                key={voucher.id}
                                style={[
                                  styles.voucherTicket, 
                                  !isEligible && styles.voucherTicketIneligible,
                                  hasReachedLimit && styles.voucherTicketUsed
                                ]}
                                onPress={() => {
                                  if (hasReachedLimit) {
                                    if (Platform.OS === 'web') {
                                      window.alert('Usage Limit Reached: You have already used this voucher "' + voucher.code + '" the maximum number of times (' + maxUsage + ').');
                                    } else {
                                      Alert.alert('Usage Limit Reached', 'You have already used this voucher "' + voucher.code + '" the maximum number of times (' + maxUsage + ').');
                                    }
                                  } else if (!isEligible) {
                                    if (Platform.OS === 'web') {
                                      window.alert('Minimum Spend Not Met: You need to spend at least ₱' + voucher.minimumOrderAmount.toFixed(2) + ' to use this voucher.');
                                    } else {
                                      Alert.alert('Minimum Spend Not Met', 'You need to spend at least ₱' + voucher.minimumOrderAmount.toFixed(2) + ' to use this voucher.');
                                    }
                                  } else {
                                    setAppliedVoucher(voucher);
                                    if (Platform.OS === 'web') {
                                      window.alert('Voucher Applied: Successfully applied voucher ' + voucher.code + '!');
                                    } else {
                                      Alert.alert('Voucher Applied', 'Successfully applied voucher ' + voucher.code + '!');
                                    }
                                  }
                                }}
                                disabled={isCheckingUsage || !isEligible || hasReachedLimit}
                              >
                                <View style={styles.ticketLeftSide}>
                                  <View style={styles.discountCircle}>
                                    <Text style={styles.discountAmount}>₱{voucher.discountAmount}</Text>
                                    <Text style={styles.discountText}>OFF</Text>
                                  </View>
                                </View>
                                
                                <View style={styles.ticketDashedLine}>
                                  {Array(8).fill(0).map((_, i) => (
                                    <View key={i} style={styles.dashedItem} />
                                  ))}
                                </View>
                                
                                <View style={styles.ticketRightSide}>
                                  <Text style={styles.ticketCode}>{voucher.code}</Text>
                                  <Text style={styles.ticketDescription} numberOfLines={2}>
                                    {voucher.description || `₱${voucher.discountAmount} discount`}
                                  </Text>
                                  <View style={styles.ticketDetails}>
                                    <Text style={styles.ticketMinimum}>
                                      Min: ₱{voucher.minimumOrderAmount.toFixed(2)}
                                      {!isEligible && <Text style={styles.ticketWarning}> (not met)</Text>}
                                    </Text>
                                    {maxUsage > 0 && (
                                      <Text style={styles.ticketUsage}>
                                        {currentUsage}/{maxUsage} used
                                        {hasReachedLimit && <Text style={styles.ticketWarning}> (limit)</Text>}
                                      </Text>
                                    )}
                                  </View>
                                  <View style={styles.ticketAction}>
                                    <Text style={[
                                      styles.ticketApplyText,
                                      (!isEligible || hasReachedLimit) && styles.ticketApplyDisabled
                                    ]}>
                                      {isEligible && !hasReachedLimit ? "TAP TO APPLY" : "NOT AVAILABLE"}
                                    </Text>
                                  </View>
                                </View>
                                
                                <View style={styles.ticketTopCircle} />
                                <View style={styles.ticketBottomCircle} />
                              </TouchableOpacity>
                            );
                          })}
                          {vouchers.filter(v => v.enabled).length === 0 && (
                            <View style={styles.noVouchersContainer}>
                              <Text style={styles.noVouchersText}>No available vouchers</Text>
                            </View>
                          )}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                )}
              </Animatable.View>
                
              <Animatable.View animation="fadeInUp" duration={800} delay={items.length * 100 + 200}>
                
                  <Divider style={styles.sectionDivider} />
                  <Text style={styles.summaryTitle}>Order Summary</Text>

                  <View style={styles.diningMethodContainer}>
                    <Text style={styles.summaryLabel}>Dining Method</Text>
                    <View style={styles.diningMethodButtons}>
                      <TouchableOpacity 
                        style={[styles.diningButton, diningMethod === 'dine-in' && styles.diningButtonActive]}
                        onPress={() => setDiningMethod('dine-in')}
                      >
                        <Text style={[styles.diningButtonText, diningMethod === 'dine-in' && styles.diningButtonTextActive]}>Dine-in</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.diningButton, diningMethod === 'pickup' && styles.diningButtonActive]}
                        onPress={() => setDiningMethod('pickup')}
                      >
                        <Text style={[styles.diningButtonText, diningMethod === 'pickup' && styles.diningButtonTextActive]}>Pickup</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.paymentHeaderContainer}>
                    <Text style={styles.summaryLabel}>Payment Method</Text>
                    {isLiveMode() && (
                      <View style={styles.livePaymentBadge}>
                        <Text style={styles.livePaymentText}>LIVE</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.paymentMethodContainer}>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={true}
                      contentContainerStyle={styles.paymentMethodScrollContent}
                    >
                      {(!paymentSettings || 
                        (!paymentSettings.enableGCash && 
                         !paymentSettings.enableMaya && 
                         !paymentSettings.enableGrabPay)) && (
                        <TouchableOpacity
                          style={[
                            styles.paymentMethodOption,
                            selectedPaymentMethod === 'gcash' && styles.paymentMethodOptionSelected
                          ]}
                          onPress={() => setSelectedPaymentMethod('gcash')}
                        >
                          <Image source={gcashIcon} style={styles.paymentMethodIcon} resizeMode="contain" />
                          <Text style={[
                            styles.paymentMethodText,
                            selectedPaymentMethod === 'gcash' && styles.paymentMethodTextSelected
                          ]}>GCash</Text>
                        </TouchableOpacity>
                      )}
                      
                      {paymentSettings?.enableGCash && (
                        <TouchableOpacity
                          style={[
                            styles.paymentMethodOption,
                            selectedPaymentMethod === 'gcash' && styles.paymentMethodOptionSelected
                          ]}
                          onPress={() => setSelectedPaymentMethod('gcash')}
                        >
                          <Image source={gcashIcon} style={styles.paymentMethodIcon} resizeMode="contain" />
                          <Text style={[
                            styles.paymentMethodText,
                            selectedPaymentMethod === 'gcash' && styles.paymentMethodTextSelected
                          ]}>GCash</Text>
                        </TouchableOpacity>
                      )}
                      
                      {paymentSettings?.enableMaya && (
                        <TouchableOpacity
                          style={[
                            styles.paymentMethodOption,
                            selectedPaymentMethod === 'maya' && styles.paymentMethodOptionSelected
                          ]}
                          onPress={() => setSelectedPaymentMethod('maya')}
                        >
                          <Image source={mayaIcon} style={styles.paymentMethodIcon} resizeMode="contain" />
                          <Text style={[
                            styles.paymentMethodText,
                            selectedPaymentMethod === 'maya' && styles.paymentMethodTextSelected
                          ]}>Maya</Text>
                        </TouchableOpacity>
                      )}
                      
                      {paymentSettings?.enableGrabPay && (
                        <TouchableOpacity
                          style={[
                            styles.paymentMethodOption,
                            selectedPaymentMethod === 'grab_pay' && styles.paymentMethodOptionSelected
                          ]}
                          onPress={() => setSelectedPaymentMethod('grab_pay')}
                        >
                          <Image source={grabpayIcon} style={styles.paymentMethodIcon} resizeMode="contain" />
                          <Text style={[
                            styles.paymentMethodText,
                            selectedPaymentMethod === 'grab_pay' && styles.paymentMethodTextSelected
                          ]}>GrabPay</Text>
                        </TouchableOpacity>
                      )}
                    </ScrollView>
                  </View>
                  
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal (net of VAT)</Text>
                    <Text style={styles.summaryValue}>₱{subtotal.toFixed(2)}</Text>
                  </View>

                  {taxSettings?.enabled && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.taxLabel}>{taxSettings.label} ({taxSettings.percentage}%)</Text>
                      <Text style={styles.taxValue}>₱{tax.toFixed(2)}</Text>
                    </View>
                  )}

                  {paymentSettings?.autoApplyServiceCharge && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Service Charge ({paymentSettings.serviceChargePercentage}%)</Text>
                      <Text style={styles.summaryValue}>₱{serviceCharge.toFixed(2)}</Text>
                    </View>
                  )}

                  {appliedVoucher && voucherDiscount > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.discountLabel}>
                        Voucher ({appliedVoucher.code})
                      </Text>
                      <Text style={styles.discountValue}>-₱{voucherDiscount.toFixed(2)}</Text>
                    </View>
                  )}

                  <Divider style={styles.sectionDivider} />
                
              </Animatable.View>
            </ScrollView>

            <View style={styles.stickyFooter}>
                  <View style={[styles.summaryRow]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>₱{total.toFixed(2)}</Text>
                  </View>
              <TouchableOpacity 
                style={styles.checkoutButton}
                onPress={handleCheckout}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#F36514', '#F8943F']}
                  style={styles.checkoutGradient}
                  start={[0, 0]}
                  end={[1, 0]}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text style={styles.checkoutButtonText}>
                        {isLiveMode() ? 'Pay with ' : 'Pay with '}
                        {selectedPaymentMethod === 'gcash' ? 'GCash' : 
                        selectedPaymentMethod === 'maya' ? 'Maya' : 
                        selectedPaymentMethod === 'grab_pay' ? 'GrabPay' : 'E-Wallet'}
                      </Text>
                      {selectedPaymentMethod === 'gcash' && (
                        <Image source={gcashIcon} style={styles.checkoutButtonIcon} resizeMode="contain" />
                      )}
                      {selectedPaymentMethod === 'maya' && (
                        <Image source={mayaIcon} style={styles.checkoutButtonIcon} resizeMode="contain" />
                      )}
                      {selectedPaymentMethod === 'grab_pay' && (
                        <Image source={grabpayIcon} style={styles.checkoutButtonIcon} resizeMode="contain" />
                      )}
                      <FontAwesome name="arrow-right" size={20} color="#FFFFFF" style={styles.checkoutIcon} />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Caution Modal */}
        <Modal
          visible={cautionModalVisible}
          onDismiss={() => setCautionModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Animatable.View 
            animation="fadeIn" 
            duration={300}
          >
            <View style={styles.cautionModalContent}>
              <View style={styles.cautionIconContainer}>
                <FontAwesome name="exclamation-triangle" size={40} color="#F59E0B" />
              </View>
              
              <Text style={styles.cautionTitle}>Payment Confirmation</Text>
              
              <Text style={styles.cautionMessage}>
                You are about to process a payment of <Text style={styles.cautionAmount}>₱{(getCartTotal() + calculateTax(getCartTotal()) + calculateServiceCharge(getCartTotal()) - calculateVoucherDiscount(getCartTotal())).toFixed(2)}</Text> using {selectedPaymentMethod === 'gcash' ? 'GCash' : selectedPaymentMethod === 'maya' ? 'Maya' : 'GrabPay'}.
              </Text>
              
              <Text style={styles.cautionDetails}>
                • You will be redirected to a secure payment page{'\n'}
                • Your order will be saved with "Awaiting Payment" status{'\n'}
                • After payment, check your order status in the "My Orders" section
              </Text>
              
              <View style={styles.checkboxContainer}>
                <Checkbox
                  status={dontShowCautionAgain ? 'checked' : 'unchecked'}
                  onPress={() => setDontShowCautionAgain(!dontShowCautionAgain)}
                  color="#F36514"
                />
                <TouchableOpacity onPress={() => setDontShowCautionAgain(!dontShowCautionAgain)}>
                  <Text style={styles.checkboxLabel}>Don't show this again</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.cautionButtonRow}>
                <TouchableOpacity
                  style={styles.cautionCancelButton}
                  onPress={() => setCautionModalVisible(false)}
                >
                  <Text style={styles.cautionCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.cautionProceedButton}
                  onPress={handleProceedToPayment}
                >
                  <LinearGradient
                    colors={['#F36514', '#F8943F']}
                    style={styles.cautionProceedGradient}
                    start={[0, 0]}
                    end={[1, 0]}
                  >
                    <Text style={styles.cautionProceedButtonText}>Proceed to Payment</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </Animatable.View>
        </Modal>

        {/* Redirect Modal */}
        <Modal
          visible={redirectModalVisible}
          onDismiss={() => setRedirectModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Animatable.View 
            animation="fadeIn" 
            duration={300}
          >
            <View style={styles.redirectModalContent}>
              <View style={styles.redirectIconContainer}>
                <FontAwesome name="info-circle" size={40} color="#2563EB" />
              </View>
              
              <Text style={styles.redirectTitle}>Payment In Progress</Text>
              
              <View style={styles.redirectCountdownContainer}>
                <Text style={styles.redirectMessage}>
                  Complete your payment in the browser. Your order has been saved.
                </Text>
                
                <View style={styles.redirectCountdownCircle}>
                  <Text style={styles.redirectCountdownNumber}>{redirectCountdown}</Text>
                </View>
                
                <Text style={styles.redirectCountdownText}>
                  Redirecting to orders page in {redirectCountdown} seconds...
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.redirectButton}
                onPress={() => {
                  setRedirectModalVisible(false);
                  router.push('/(tabs)/my-order');
                  setIsLoading(false);
                  setPaymentProcessing(false);
                }}
              >
                <LinearGradient
                  colors={['#2563EB', '#3B82F6']}
                  style={styles.redirectButtonGradient}
                  start={[0, 0]}
                  end={[1, 0]}
                >
                  <Text style={styles.redirectButtonText}>Go to My Orders Now</Text>
                  <FontAwesome name="arrow-right" size={16} color="#FFFFFF" style={{marginLeft: 8}} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animatable.View>
        </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  backgroundPattern: {
    flex: 1,
    width: '100%',
  },
  gradientOverlay: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginRight: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  mainContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 30,
  },
  ordersContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  orderItem: {
    flexDirection: 'row',
    padding: 12,
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 12,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#1F2937',
  },
  addOns: {
    flexDirection: 'column',
    marginTop: 2,
  },
  addOnText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F36514',
    marginTop: 4,
    marginBottom: 8,
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF2E9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FADEC9',
  },
  quantityText: {
    fontSize: 15,
    fontWeight: '600',
    marginHorizontal: 8,
    color: '#1F2937',
    minWidth: 18,
    textAlign: 'center',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 16,
    marginTop: 20,
  },
  summaryContainer: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    marginTop: 5,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#4B5563',
  },
  summaryValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
    paddingTop: 12,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F36514',
  },
  checkoutButton: {
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  checkoutGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  checkoutIcon: {
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 20,
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  browseButton: {
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  buttonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  diningMethodContainer: {
    marginBottom: 20,
  },
  diningMethodButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  diningButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 4,
    backgroundColor: '#FFFFFF',
  },
  diningButtonActive: {
    backgroundColor: '#F36514',
    borderColor: '#F36514',
  },
  diningButtonText: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
    color: '#4B5563',
  },
  diningButtonTextActive: {
    color: '#FFFFFF',
  },
  voucherContainer: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  voucherInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  voucherInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginRight: 8,
  },
  applyVoucherButton: {
    backgroundColor: '#F36514',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#FDBA74',
  },
  applyVoucherButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  appliedVoucherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E1F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  appliedVoucherText: {
    flex: 1,
    color: '#057A44',
    fontSize: 15,
    marginLeft: 4,
  },
  removeVoucherButton: {
    padding: 4,
    marginLeft: 8,
  },
  voucherInfoText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    lineHeight: 18,
  },
  voucherUsageHint: {
    fontStyle: 'italic',
  },
  viewAllVouchersText: {
    fontSize: 13,
    color: '#F36514',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  discountLabel: {
    fontSize: 16,
    color: '#10B981',
  },
  discountValue: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '500',
  },
  voucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addVoucherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  addVoucherButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  voucherSelectionLabel: {
    fontSize: 15,
    color: '#4B5563',
    marginBottom: 12,
  },
  vouchersScrollView: {
    marginBottom: 12,
    maxHeight: 155,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingVertical: 4,
  },
  vouchersScrollContent: {
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  voucherTicket: {
    width: 280,
    height: 150,
    marginRight: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    flexDirection: 'row',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
    overflow: 'hidden',
  },
  voucherTicketIneligible: {
    opacity: 0.7,
    backgroundColor: '#F3F4F6',
  },
  voucherTicketUsed: {
    opacity: 0.6,
    backgroundColor: '#F3F4F6',
  },
  ticketLeftSide: {
    width: 80,
    backgroundColor: '#F36514',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  discountCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F36514',
    lineHeight: 28,
  },
  discountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F36514',
  },
  ticketDashedLine: {
    width: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    backgroundColor: '#F3F4F6',
  },
  dashedItem: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    marginLeft: -3.5,
  },
  ticketRightSide: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  ticketCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  ticketDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginVertical: 4,
    height: 32,
  },
  ticketDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  ticketMinimum: {
    fontSize: 11,
    color: '#6B7280',
  },
  ticketUsage: {
    fontSize: 11,
    color: '#6B7280',
  },
  ticketWarning: {
    color: '#EF4444',
    fontStyle: 'italic',
  },
  ticketAction: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 6,
  },
  ticketApplyText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F36514',
    textAlign: 'center',
  },
  ticketApplyDisabled: {
    color: '#9CA3AF',
  },
  ticketTopCircle: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    top: -8,
    left: 80 - 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ticketBottomCircle: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    bottom: -8,
    left: 80 - 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noVouchersContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    borderRadius: 8,
    width: 200,
  },
  noVouchersText: {
    color: '#6B7280',
    fontSize: 14,
  },
  sectionDivider: {
    height: 1.5,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  totalDivider: {
    height: 1.5,
    backgroundColor: '#E5E7EB',
    marginTop: 16,
    marginBottom: 8,
  },
  stickyFooter: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  paymentMethodContainer: {
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingVertical: 4,
  },
  paymentMethodScrollContent: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  paymentMethodOption: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  paymentMethodOptionSelected: {
    borderColor: '#F36514',
    backgroundColor: '#F36514',
  },
  paymentMethodIconContainer: {
    marginBottom: 12,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paymentMethodIconContainerSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  paymentMethodIcon: {
    width: 60,
    height: 40,
    marginBottom: 12,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    textAlign: 'center',
  },
  paymentMethodTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  paymentHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  livePaymentBadge: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginLeft: 8,
  },
  livePaymentText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkoutButtonIcon: {
    width: 24,
    height: 24,
    marginLeft: 8,
  },
  taxLabel: {
    fontSize: 16,
    color: '#10B981',  // Green color for VAT/tax
  },
  taxValue: {
    fontSize: 16,
    color: '#10B981',  // Green color for VAT/tax
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  loadingText: {
    color: '#F36514',
    fontSize: 18,
    marginTop: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
    margin: 0,
    borderRadius: 0,
  },
  cautionModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Platform.OS === 'web' ? 24 : 16,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 500 : '95%',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  cautionIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FEF3C7',
    ...Platform.select({
      ios: {
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cautionTitle: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  cautionMessage: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#4B5563',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: Platform.OS === 'web' ? 24 : 20,
  },
  cautionAmount: {
    fontWeight: '700',
    color: '#F36514',
  },
  cautionDetails: {
    fontSize: Platform.OS === 'web' ? 14 : 9.3,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: Platform.OS === 'web' ? 22 : 18,
    backgroundColor: '#F9FAFB',
    padding: Platform.OS === 'web' ? 16 : 10,
    borderRadius: 8,
    width: '100%',
  },
  cautionButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    flexWrap: 'wrap',
  },
  cautionCancelButton: {
    padding: Platform.OS === 'web' ? 14 : 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flex: 1,
    marginRight: 12,
    minWidth: 100,
  },
  cautionCancelButtonText: {
    color: '#4B5563',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  cautionProceedButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 160,
    ...Platform.select({
      ios: {
        shadowColor: '#F36514',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cautionProceedGradient: {
    padding: Platform.OS === 'web' ? 14 : 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cautionProceedButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  redirectModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  redirectIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#DBEAFE',
    ...Platform.select({
      ios: {
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  redirectTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  redirectCountdownContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  redirectMessage: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  redirectCountdownCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    borderWidth: 3,
    borderColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  redirectCountdownNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563EB',
  },
  redirectCountdownText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  redirectButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  redirectButtonGradient: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  redirectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Add checkbox styles
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
});
