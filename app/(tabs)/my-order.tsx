import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  RefreshControl,
  ViewStyle,
  TextStyle,
  ImageBackground,
  Dimensions,
  Modal,
  Alert,
  Platform,
  Linking
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows, FontSizes } from '../../constants/theme';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/auth';
import { db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, QuerySnapshot, DocumentData, updateDoc, doc, runTransaction } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { Card, Text, Chip, ActivityIndicator, Divider, List, Button, Surface, Badge } from 'react-native-paper';
import { useTheme } from '../../contexts/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Animatable from 'react-native-animatable';
import * as WebBrowser from 'expo-web-browser';
import { retrieveCheckoutSession, createCheckoutSession } from '../../utils/paymongo';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  addOns?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
}

interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  total?: number;
  status: 'pending' | 'processing' | 'ready for pickup' | 'completed' | 'cancelled';
  createdAt: Timestamp;
  customerName: string;
  customerId: string;
  paymentMethod: string;
  diningMode: string;
  source: string;
  paymentStatus?: 'paid' | 'unpaid' | 'expired';
  paymentId?: string;
  checkoutSessionId?: string;
  paymentExpiryTime?: Timestamp;
  pointsEarned?: number;
}

export default function MyOrderScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const screenWidth = Dimensions.get('window').width;
  
  // Get URL params to determine initial tab selection
  const params = useLocalSearchParams();
  const initialTab = params.initialTab as string;
  const [selectedTab, setSelectedTab] = useState<'paid' | 'unpaid'>(initialTab === 'unpaid' ? 'unpaid' : 'paid');
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState<boolean>(false);
  const [processingPayment, setProcessingPayment] = useState<boolean>(false);
  const [verifyingOrders, setVerifyingOrders] = useState<{[orderId: string]: boolean}>({});
  const [countdowns, setCountdowns] = useState<{[orderId: string]: string}>({});
  const timerRefs = useRef<{[orderId: string]: NodeJS.Timeout}>({});
  const [successModalVisible, setSuccessModalVisible] = useState<boolean>(false);
  const [successOrderDetails, setSuccessOrderDetails] = useState<{orderId: string, total: number, points: number} | null>(null);
  const [errorModalVisible, setErrorModalVisible] = useState<boolean>(false);
  const [errorDetails, setErrorDetails] = useState<{title: string, message: string}>({
    title: '',
    message: ''
  });

  // State to store the callback for when the error modal is dismissed
  const [errorOkCallback, setErrorOkCallback] = useState<(() => void) | null>(null);

  // Effect to handle tab change from URL parameters
  useEffect(() => {
    if (initialTab === 'unpaid') {
      setSelectedTab('unpaid');
    }
  }, [initialTab]);

  const loadOrders = useCallback(() => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return () => {};
    }

    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('customerId', '==', user.uid),
      where('status', 'in', ['pending', 'processing', 'ready for pickup'])
    );

    const unsubscribe = onSnapshot(
      q, 
      (snapshot: QuerySnapshot<DocumentData>) => {
        const ordersList = snapshot.docs.map(doc => ({
          id: doc.id,
          orderNumber: doc.data().orderNumber,
          ...doc.data()
        })) as Order[];
        
        // Sort on client side
        ordersList.sort((a, b) => {
          const timestampA = a.createdAt?.toDate?.() || new Date(0);
          const timestampB = b.createdAt?.toDate?.() || new Date(0);
          return timestampB.getTime() - timestampA.getTime();
        });

        // Clean up any existing timers first
        Object.keys(timerRefs.current).forEach(orderId => {
          clearInterval(timerRefs.current[orderId]);
          delete timerRefs.current[orderId];
        });

        // Start countdown timers for unpaid orders
        ordersList.forEach(order => {
          if (order.paymentStatus === 'unpaid' && order.paymentExpiryTime) {
            startCountdown(order.id, order.paymentExpiryTime);
          }
        });
        
        // Update the UI state
        setOrders(ordersList);
        setLoading(false);
        setRefreshing(false);
      }, 
      (error) => {
        console.error('Error fetching orders:', error);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    const unsubscribe = loadOrders();
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      
      // Clear all countdown timers
      Object.keys(timerRefs.current).forEach(orderId => {
        clearInterval(timerRefs.current[orderId]);
      });
    };
  }, [loadOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders();
  }, [loadOrders]);

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'Unknown Date';
    
    const date = timestamp.toDate();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#6B7280';
      case 'processing':
        return '#3B82F6';
      case 'ready for pickup':
        return '#F59E0B';
      case 'completed':
        return '#059669';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'hourglass-start';
      case 'processing':
        return 'spinner';
      case 'ready for pickup':
        return 'check-circle';
      case 'completed':
        return 'check-circle';
      case 'cancelled':
        return 'times-circle';
      default:
        return 'question-circle';
    }
  };

  const getStatusAnimation = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return "pulse";
      case 'processing':
        return "rotate";
      case 'ready for pickup':
        return "bounce";
      default:
        return "flash";
    }
  };

  const getStatusMessage = (status: string, order: Order) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Your order is pending confirmation';
      case 'processing':
        return 'Your order is being prepared';
      case 'ready for pickup':
        return 'Your order is ready for pickup!';
      case 'completed':
        return 'Order completed';
      case 'cancelled':
        return 'Order cancelled';
      default:
        return 'Status unknown';
    }
  };

  const calculateTotalItems = (order: Order): number => {
    return order.items.reduce((total, item) => total + (item.quantity || 0), 0);
  };

  const renderOrderCard = (order: Order) => {
    const statusColor = getStatusColor(order.status);
    const statusMessage = getStatusMessage(order.status, order);
    const statusIcon = getStatusIcon(order.status);
    const statusAnimation = getStatusAnimation(order.status);
    const isUnpaid = order.paymentStatus === 'unpaid';
    const isVerifying = verifyingOrders[order.id] || false;

    return (
      <Animatable.View 
        animation="fadeInUp" 
        duration={800} 
        delay={200}
        style={[styles.orderCard, isUnpaid && styles.unpaidOrderCard]} 
        key={order.id}
      >
        <LinearGradient
          colors={isUnpaid ? ['#FEF2F2', '#FEE2E2'] : ['#FFFFFF', '#F9FAFB']}
          style={styles.orderCardGradient}
          start={[0, 0]}
          end={[0, 1]}
        >
          {isUnpaid && (
            <Animatable.View 
              animation="pulse" 
              iterationCount="infinite" 
              duration={1500}
              style={styles.unpaidBanner}
            >
              <Text style={styles.unpaidBannerText}>
                PAYMENT REQUIRED • {countdowns[order.id] || 'Loading...'}
              </Text>
            </Animatable.View>
          )}
          
          <View style={styles.orderHeader}>
            <View style={styles.orderHeaderContent}>
              <Animatable.View 
                animation={statusAnimation} 
                iterationCount={order.status !== 'completed' && order.status !== 'cancelled' ? 'infinite' : 1} 
                duration={2000}
                style={[styles.statusIconContainer, isUnpaid && styles.unpaidStatusIconContainer]}
              >
                <FontAwesome 
                  name={isUnpaid ? 'exclamation-circle' : statusIcon}
                  size={24} 
                  color={isUnpaid ? '#EF4444' : statusColor} 
                />
              </Animatable.View>
              <View style={styles.statusTextContainer}>
                <Text style={[
                  styles.orderStatus, 
                  { color: isUnpaid ? '#EF4444' : statusColor }
                ]}>
                  {isUnpaid ? 'AWAITING PAYMENT' : order.status.toUpperCase()}
                </Text>
                <Text 
                  style={styles.statusMessage}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {isUnpaid 
                    ? 'Your order will be processed after payment is complete'
                    : statusMessage}
                </Text>
              </View>
            </View>
            
            <Divider style={styles.headerDivider} />
            
            <View style={styles.orderInfoRow}>
              <Text 
                style={styles.orderNumber} 
                numberOfLines={1} 
                ellipsizeMode="tail"
              >
                Order #{order.id.slice(-6)}
              </Text>
              <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.orderDetails}>
            {order.items.map((item, index) => (
              <Animatable.View 
                key={index} 
                animation="fadeIn" 
                delay={300 + (index * 100)} 
                duration={500}
                style={styles.orderItem}
              >
                <View style={styles.orderItemInfo}>
                  <Text style={styles.orderItemName}>
                    {item.name} 
                    {item.size && ` (${item.size})`}
                  </Text>
                  <Text style={styles.orderItemPrice}>
                    ₱{item.price.toFixed(2)}
                  </Text>
                </View>
                <Badge style={styles.orderItemQuantity}>
                  {`x${item.quantity}`}
                </Badge>
              </Animatable.View>
            ))}
          </View>
          
          <View style={styles.orderFooter}>
            <Text style={styles.orderTotal}>
              Total: ₱{typeof order.total === 'number' ? order.total.toFixed(2) : '0.00'}
            </Text>
            <Chip icon="shopping-outline" style={styles.orderSourceChip}>
              <Text style={styles.orderSource}>
                {calculateTotalItems(order)} Items • {order.diningMode?.toUpperCase() || 'DINE-IN'}
              </Text>
            </Chip>
          </View>

          {isUnpaid && (
            <Animatable.View 
              animation="pulse" 
              iterationCount="infinite" 
              duration={9000}
              style={styles.paymentButton}
            >
              <TouchableOpacity
                onPress={() => {
                  setSelectedOrder(order);
                  setPaymentModalVisible(true);
                }}
                style={{flex: 1}}
              >
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  style={styles.paymentButtonGradient}
                  start={[0, 0]}
                  end={[1, 0]}
                >
                  <FontAwesome name="credit-card" size={18} color="#FFFFFF" style={styles.paymentButtonIcon} />
                  <Text style={styles.paymentButtonText}>
                    Complete Payment
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animatable.View>
          )}

          {isUnpaid && (
            <View style={styles.verifyButtonContainer}>
              <TouchableOpacity
                onPress={() => checkPaymentStatus(order.id, order.checkoutSessionId || '')}
                style={styles.verifyButton}
                disabled={isVerifying}
              >
                <LinearGradient
                  colors={isVerifying ? ['#9CA3AF', '#9CA3AF'] : ['#F36514', '#F36514']}
                  style={styles.verifyButtonGradient}
                  start={[0, 0]}
                  end={[1, 0]}
                >
                  {isVerifying ? (
                    <ActivityIndicator size="small" color="#FFFFFF" style={{marginRight: 8}} />
                  ) : (
                    <FontAwesome name="refresh" size={16} color="#FFFFFF" style={styles.verifyButtonIcon} />
                  )}
                  <Text style={styles.verifyButtonText}>
                    {isVerifying ? 'Verifying...' : 'Verify Payment Status'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <Text style={styles.verifyButtonHint}>
                Click here after completing payment in browser
              </Text>
            </View>
          )}

          {order.status === 'ready for pickup' && !isUnpaid && (
            <Animatable.View 
              animation="pulse" 
              iterationCount="infinite" 
              duration={2000}
              style={styles.pickupInstructions}
            >
              <LinearGradient
                colors={['#F59E0B', '#F59E0B']}
                style={styles.pickupGradient}
                start={[0, 0]}
                end={[1, 0]}
              >
                <FontAwesome name="info-circle" size={18} color="#FFFFFF" style={styles.pickupIcon} />
                <Text style={styles.pickupText}>
                  Please proceed to the counter to pick up your order.
                </Text>
              </LinearGradient>
            </Animatable.View>
          )}
        </LinearGradient>
      </Animatable.View>
    );
  };

  // Function to start countdown for unpaid orders
  const startCountdown = (orderId: string, expiryTime: Timestamp) => {
    // Clear any existing timer for this order
    if (timerRefs.current[orderId]) {
      clearInterval(timerRefs.current[orderId]);
    }

    const updateCountdown = () => {
      const now = new Date();
      const expiry = expiryTime.toDate();
      const diffMs = expiry.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        // Timer expired
        clearInterval(timerRefs.current[orderId]);
        setCountdowns(prev => ({
          ...prev,
          [orderId]: 'Expired'
        }));
        
        // Update the order status in Firebase to expired
        const orderRef = doc(db, 'orders', orderId);
        updateDoc(orderRef, {
          paymentStatus: 'expired',
          status: 'cancelled'
        }).catch(error => {
          console.error('Error updating order payment status to expired:', error);
          showPlatformAlert('Error', 'Could not update order status. Please refresh the page.');
        });
        
        return;
      }
      
      // Calculate minutes and seconds
      const minutes = Math.floor(diffMs / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      
      // Update countdown display
      setCountdowns(prev => ({
        ...prev,
        [orderId]: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      }));
    };
    
    // Run immediately
    updateCountdown();
    
    // Set interval to update every second
    timerRefs.current[orderId] = setInterval(updateCountdown, 1000);
  };

  // Function to show platform-specific alert - replaced with modal
  const showPlatformAlert = (title: string, message: string, onOkPress?: () => void) => {
    if (Platform.OS === 'web') {
      // For web platform - still use alert for now
      alert(`${title}\n\n${message}`);
      if (onOkPress) onOkPress();
    } else {
      // For mobile platforms - use modal instead of Alert
      setErrorDetails({
        title: title,
        message: message
      });
      setErrorModalVisible(true);
      // Store callback for when user dismisses the modal
      if (onOkPress) {
        setErrorOkCallback(() => onOkPress);
      }
    }
  };

  // Function to handle error modal dismiss
  const handleErrorModalDismiss = () => {
    setErrorModalVisible(false);
    if (errorOkCallback) {
      errorOkCallback();
      setErrorOkCallback(null);
    }
  };

  // Function to show success modal instead of alert
  const showSuccessModal = (orderId: string, total: number, points: number) => {
    setSuccessOrderDetails({
      orderId,
      total,
      points
    });
    setSuccessModalVisible(true);
  };

  // Function to retry payment
  const handleRetryPayment = async (order: Order) => {
    if (!user) return;
    
    try {
      setSelectedOrder(order);
      setProcessingPayment(true);
      
      // Check if the order already has a checkout session ID
      if (!order.checkoutSessionId) {
        throw new Error('No checkout session ID found for this order');
      }
      
      // Retrieve the existing checkout session
      const checkoutSession = await retrieveCheckoutSession(order.checkoutSessionId);
      
      if (!checkoutSession || !checkoutSession.id) {
        throw new Error('Could not retrieve checkout session');
      }

      // Check if payment is already completed but not updated in our system
      const sessionStatus = checkoutSession.attributes.status;
      const paymentIntentStatus = checkoutSession.attributes.payment_intent?.attributes?.status;
      const paymentStatus = checkoutSession.attributes.payment_intent?.attributes?.payments?.[0]?.attributes?.status;
      
      console.log('Status check before redirect:', { sessionStatus, paymentIntentStatus, paymentStatus });
      
      // If payment is already completed, just update status without redirecting
      if (sessionStatus === 'paid' || paymentIntentStatus === 'succeeded' || paymentStatus === 'paid') {
        console.log('Payment already completed, updating status without redirect');
        await checkPaymentStatus(order.id, order.checkoutSessionId);
        return;
      }
      
      // Open the payment page with the existing checkout URL
      const checkoutUrl = checkoutSession.attributes.checkout_url;
      
      // Handle different platforms appropriately
      if (Platform.OS === 'web') {
        // For web, use WebBrowser
        const result = await WebBrowser.openBrowserAsync(checkoutUrl);
        
        // Check payment status after browser is closed
        if (result.type === 'cancel' || result.type === 'dismiss') {
          // First force a reload to get fresh data
          await loadOrders();
          
          // Then check payment status
          await checkPaymentStatus(order.id, order.checkoutSessionId);
        }
      } else {
        // For mobile, handle the checkout differently
        try {
          // On mobile, we need to use Linking to open the URL in the device's browser
          const canOpen = await Linking.canOpenURL(checkoutUrl);
          
          if (canOpen) {
            await Linking.openURL(checkoutUrl);
            
            // Show instructions to the user
            showPlatformAlert(
              'Payment in Progress',
              'We\'ve opened the payment page in your browser. After completing payment, please return to this app and tap "Verify Payment Status" to confirm your payment.',
              () => {
                // Start polling for payment status
                startPaymentStatusPolling(order.id, order.checkoutSessionId || '');
              }
            );
          } else {
            throw new Error('Cannot open payment URL on this device');
          }
        } catch (error) {
          console.error('Error opening payment URL:', error);
          showPlatformAlert('Payment Error', 'Could not open the payment page. Please try again later.');
        }
      }
    } catch (error) {
      console.error('Error retrying payment:', error);
      showPlatformAlert('Payment Error', 'There was an error processing your payment. Please try again.');
      
      // Still try to refresh orders after error
      loadOrders();
    } finally {
      setProcessingPayment(false);
      setPaymentModalVisible(false);
    }
  };
  
  // Function to poll for payment status updates
  const startPaymentStatusPolling = (orderId: string, sessionId: string) => {
    // Check immediately first
    checkPaymentStatus(orderId, sessionId);
    
    // Then set up polling every 10 seconds for 2 minutes (12 checks)
    let checkCount = 0;
    const maxChecks = 12;
    
    const pollInterval = setInterval(async () => {
      checkCount++;
      
      try {
        // Attempt to retrieve the checkout session
        const session = await retrieveCheckoutSession(sessionId);
        console.log(`Poll check ${checkCount}/${maxChecks}:`, {
          sessionStatus: session.attributes.status,
          paymentIntentStatus: session.attributes.payment_intent?.attributes?.status
        });
        
        // Check if payment is complete
        const isPaid = 
          session.attributes.status === 'paid' || 
          session.attributes.payment_intent?.attributes?.status === 'succeeded' ||
          session.attributes.payment_intent?.attributes?.payments?.[0]?.attributes?.status === 'paid';
        
        if (isPaid) {
          console.log('Payment completed detected by polling!');
          clearInterval(pollInterval);
          checkPaymentStatus(orderId, sessionId);
        }
      } catch (error) {
        console.error('Error during payment status polling:', error);
      }
      
      // Stop polling after max attempts
      if (checkCount >= maxChecks) {
        clearInterval(pollInterval);
      }
    }, 10000); // Check every 10 seconds
  };

  // Function to check payment status
  const checkPaymentStatus = async (orderId: string, sessionId: string) => {
    // Prevent multiple clicks
    if (verifyingOrders[orderId]) {
      return; // Already processing this order
    }
    
    try {
      // Set loading state for this specific order button
      setVerifyingOrders(prev => ({
        ...prev,
        [orderId]: true
      }));
      
      setProcessingPayment(true);
      
      // Give the payment a moment to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check the checkout session status
      const session = await retrieveCheckoutSession(sessionId);
      console.log('Retrieved checkout session:', session);

      // Enhanced debug logging to identify payment status
      console.log('Payment status check:', {
        sessionStatus: session.attributes.status,
        paymentIntentStatus: session.attributes.payment_intent?.attributes?.status,
        hasPayments: Boolean(session.attributes.payment_intent?.attributes?.payments?.length),
        paymentStatus: session.attributes.payment_intent?.attributes?.payments?.[0]?.attributes?.status
      });

      // Prepare to track if payment is successful
      let paymentSuccessful = false;
      let orderTotal = 0;
      let pointsEarned = 0;

      // First, check if the session itself is marked as paid
      if (session.attributes.status === 'paid') {
        console.log('Session is marked as paid, updating order status');
        paymentSuccessful = true;
        
        // Find the order to get its total and calculate points
        const matchingOrder = orders.find(o => o.id === orderId);
        if (matchingOrder) {
          orderTotal = matchingOrder.total || 0;
          
          // Calculate points based on total quantity of items (1 point per quantity)
          if (matchingOrder.items && matchingOrder.items.length > 0) {
            pointsEarned = matchingOrder.items.reduce((sum, item) => sum + item.quantity, 0);
          }
        }
        
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
          paymentStatus: 'paid' as const,
          paymentId: sessionId,
          pointsEarned: pointsEarned
        });
        
        // If user exists, update their points in Firestore
        if (user && pointsEarned > 0) {
          try {
            const userRef = doc(db, 'users', user.uid);
            // Use transaction to safely update points
            await runTransaction(db, async (transaction) => {
              const userDoc = await transaction.get(userRef);
              if (!userDoc.exists()) {
                throw new Error("User document does not exist!");
              }
          
              const userData = userDoc.data();
              const currentPoints = userData.points || 0;
              const newPoints = currentPoints + pointsEarned;
              
              transaction.update(userRef, { points: newPoints });
              console.log(`Updated user points: ${currentPoints} + ${pointsEarned} = ${newPoints}`);
            });
          } catch (error) {
            console.error('Error updating user points:', error);
          }
        }
        
        // Immediately update local state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? {...order, paymentStatus: 'paid' as 'paid' | 'unpaid' | 'expired' | undefined} 
              : order
          )
        );
        
        // Clear any existing timer for this order
        if (timerRefs.current[orderId]) {
          clearInterval(timerRefs.current[orderId]);
          delete timerRefs.current[orderId];
        }
        
        // Force a proper refresh of the order data from Firestore
        setTimeout(() => {
          loadOrders(); 
        }, 500);
        
        // Switch to paid tab and show success modal instead of alert
        setSelectedTab('paid');
        showSuccessModal(orderId, orderTotal, pointsEarned);
        return;
      }
      
      // Next, check payment intent for paid status
      const paymentIntent = session.attributes.payment_intent;
      
      if (paymentIntent) {
        // Check if the payment intent itself has a successful status
        if (paymentIntent.attributes && paymentIntent.attributes.status === 'succeeded') {
          console.log('Payment intent is marked as succeeded, updating order status');
          paymentSuccessful = true;
          
          // Find the order to get its total and calculate points
          const matchingOrder = orders.find(o => o.id === orderId);
          if (matchingOrder) {
            orderTotal = matchingOrder.total || 0;
            
            // Calculate points based on total quantity of items (1 point per quantity)
            if (matchingOrder.items && matchingOrder.items.length > 0) {
              pointsEarned = matchingOrder.items.reduce((sum, item) => sum + item.quantity, 0);
            }
          }
          
          const orderRef = doc(db, 'orders', orderId);
          await updateDoc(orderRef, {
            paymentStatus: 'paid' as const,
            paymentId: paymentIntent.id || sessionId,
            pointsEarned: pointsEarned
          });
          
          // If user exists, update their points in Firestore
          if (user && pointsEarned > 0) {
            try {
              const userRef = doc(db, 'users', user.uid);
              // Use transaction to safely update points
              await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) {
                  throw new Error("User document does not exist!");
                }
            
                const userData = userDoc.data();
                const currentPoints = userData.points || 0;
                const newPoints = currentPoints + pointsEarned;
                
                transaction.update(userRef, { points: newPoints });
                console.log(`Updated user points: ${currentPoints} + ${pointsEarned} = ${newPoints}`);
              });
            } catch (error) {
              console.error('Error updating user points:', error);
            }
          }
          
          // Update UI and show success modal instead of alert
          setOrders(prevOrders => 
            prevOrders.map(order => 
              order.id === orderId 
                ? {...order, paymentStatus: 'paid' as 'paid' | 'unpaid' | 'expired' | undefined} 
                : order
            )
          );
          
          if (timerRefs.current[orderId]) {
            clearInterval(timerRefs.current[orderId]);
            delete timerRefs.current[orderId];
          }
          
          setTimeout(() => {
            loadOrders(); 
          }, 500);
          
          setSelectedTab('paid');
          showSuccessModal(orderId, orderTotal, pointsEarned);
          return;
        }
        
        // Finally check payments in the payment intent
        if (paymentIntent.attributes && 
            paymentIntent.attributes.payments && 
            paymentIntent.attributes.payments.length > 0) {
          
          const payment = paymentIntent.attributes.payments[0];
          const paymentStatus = payment.attributes.status;
          
          console.log('Payment status from payments array:', paymentStatus);
          
          if (paymentStatus === 'paid') {
            paymentSuccessful = true;
            
            // Find the order to get its total and calculate points
            const matchingOrder = orders.find(o => o.id === orderId);
            if (matchingOrder) {
              orderTotal = matchingOrder.total || 0;
              
              // Calculate points based on total quantity of items (1 point per quantity)
              if (matchingOrder.items && matchingOrder.items.length > 0) {
                pointsEarned = matchingOrder.items.reduce((sum, item) => sum + item.quantity, 0);
              }
            }
            
            // Update order status to paid in Firestore
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, {
              paymentStatus: 'paid' as const,
              paymentId: payment.id || sessionId,
              pointsEarned: pointsEarned
            });
            
            // If user exists, update their points in Firestore
            if (user && pointsEarned > 0) {
              try {
                const userRef = doc(db, 'users', user.uid);
                // Use transaction to safely update points
                await runTransaction(db, async (transaction) => {
                  const userDoc = await transaction.get(userRef);
                  if (!userDoc.exists()) {
                    throw new Error("User document does not exist!");
                  }
              
                  const userData = userDoc.data();
                  const currentPoints = userData.points || 0;
                  const newPoints = currentPoints + pointsEarned;
                  
                  transaction.update(userRef, { points: newPoints });
                  console.log(`Updated user points: ${currentPoints} + ${pointsEarned} = ${newPoints}`);
                });
              } catch (error) {
                console.error('Error updating user points:', error);
              }
            }
            
            // Clear any existing timer for this order
            if (timerRefs.current[orderId]) {
              clearInterval(timerRefs.current[orderId]);
              delete timerRefs.current[orderId];
            }
            
            // Immediately update local state to show the order as paid
            setOrders(prevOrders => {
              const updatedOrders = prevOrders.map(order => 
                order.id === orderId 
                  ? {...order, paymentStatus: 'paid' as 'paid' | 'unpaid' | 'expired' | undefined} 
                  : order
              );
              return updatedOrders;
            });
            
            // Force a proper refresh of the order data from Firestore
            setTimeout(() => {
              loadOrders(); 
            }, 500);
            
            // Show success modal instead of alert
            setSelectedTab('paid');
            showSuccessModal(orderId, orderTotal, pointsEarned);
            return;
          } else {
            // Change to use modal instead of alert
            setErrorDetails({
              title: 'Payment Not Completed',
              message: `Payment status: ${paymentStatus}. Please try again.`
            });
            setErrorModalVisible(true);
          }
        } else {
          // Additional check for general payment success without specific payment details
          if (paymentIntent.attributes && 
              (paymentIntent.attributes.status === 'succeeded' || 
               paymentIntent.attributes.status === 'paid')) {
            
            console.log('Payment intent status indicates success, updating order');
            paymentSuccessful = true;
            
            // Find the order to get its total and calculate points
            const matchingOrder = orders.find(o => o.id === orderId);
            if (matchingOrder) {
              orderTotal = matchingOrder.total || 0;
              
              // Calculate points based on total quantity of items (1 point per quantity)
              if (matchingOrder.items && matchingOrder.items.length > 0) {
                pointsEarned = matchingOrder.items.reduce((sum, item) => sum + item.quantity, 0);
              }
            }
            
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, {
              paymentStatus: 'paid' as const,
              paymentId: sessionId,
              pointsEarned: pointsEarned
            });
            
            // If user exists, update their points in Firestore
            if (user && pointsEarned > 0) {
              try {
                const userRef = doc(db, 'users', user.uid);
                // Use transaction to safely update points
                await runTransaction(db, async (transaction) => {
                  const userDoc = await transaction.get(userRef);
                  if (!userDoc.exists()) {
                    throw new Error("User document does not exist!");
                  }
              
                  const userData = userDoc.data();
                  const currentPoints = userData.points || 0;
                  const newPoints = currentPoints + pointsEarned;
                  
                  transaction.update(userRef, { points: newPoints });
                  console.log(`Updated user points: ${currentPoints} + ${pointsEarned} = ${newPoints}`);
                });
              } catch (error) {
                console.error('Error updating user points:', error);
              }
            }
            
            // Update UI with same pattern as above
            setOrders(prevOrders => 
              prevOrders.map(order => 
                order.id === orderId 
                  ? {...order, paymentStatus: 'paid' as 'paid' | 'unpaid' | 'expired' | undefined} 
                  : order
              )
            );
            
            if (timerRefs.current[orderId]) {
              clearInterval(timerRefs.current[orderId]);
              delete timerRefs.current[orderId];
            }
            
            setTimeout(() => {
              loadOrders(); 
            }, 500);
            
            setSelectedTab('paid');
            showSuccessModal(orderId, orderTotal, pointsEarned);
            return;
          }
          
          // Change to use modal instead of alert
          setErrorDetails({
            title: 'Payment Status: Not Paid',
            message: 'Payment still in progress, Please try again later.'
          });
          setErrorModalVisible(true);
        }
      } else {
        // Change to use modal instead of alert
        setErrorDetails({
          title: 'Payment Not Found',
          message: 'We could not find payment information for your order. Please try again or contact support.'
        });
        setErrorModalVisible(true);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      // Change to use modal instead of alert
      setErrorDetails({
        title: 'Payment Status Error',
        message: 'Could not verify payment status. Please check your payment method or try again later.'
      });
      setErrorModalVisible(true);
    } finally {
      setProcessingPayment(false);
      setPaymentModalVisible(false); // Ensure modal is closed
      
      // Reset loading state for this order button after a slight delay
      // This prevents immediate re-clicking
      setTimeout(() => {
        setVerifyingOrders(prev => ({
          ...prev,
          [orderId]: false
        }));
      }, 1000);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
          <LinearGradient
            colors={['rgba(249, 250, 251, 0.9)', 'rgba(249, 250, 251, 0.8)']}
            style={styles.gradientOverlay}
          >
            <View style={styles.emptyContainer}>
              <Animatable.View animation="bounceIn" duration={1500}>
                <FontAwesome name="user-circle" size={64} color={Colors.gray} />
              </Animatable.View>
              <Text style={styles.emptyText}>Please login to view your order</Text>
              <Animatable.View animation="pulse" iterationCount="infinite" duration={2000}>
                <TouchableOpacity 
                  style={styles.continueButton}
                  onPress={() => router.push('/(auth)/sign-in')}
                >
                  <LinearGradient
                    colors={['#F36514', '#F8943F']}
                    style={styles.continueButtonGradient}
                    start={[0, 0]}
                    end={[1, 0]}
                  >
                    <Text style={styles.continueButtonText}>Login</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animatable.View>
            </View>
          </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
        <LinearGradient
          colors={['rgba(249, 250, 251, 0.9)', 'rgba(249, 250, 251, 0.8)']}
          style={styles.gradientOverlay}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <Animatable.View animation="pulse" easing="ease-out" iterationCount="infinite">
                <ActivityIndicator size="large" color={Colors.primary} />
              </Animatable.View>
              <Text style={styles.loadingText}>Loading your orders...</Text>
            </View>
          ) : orders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Animatable.View animation="bounceIn" duration={1500}>
                <FontAwesome name="shopping-basket" size={64} color={Colors.gray} />
              </Animatable.View>
              <Text style={styles.emptyText}>No active orders</Text>
              <Animatable.View animation="pulse" iterationCount="infinite" duration={2000}>
                <TouchableOpacity 
                  style={styles.continueButton}
                  onPress={() => router.push('/(tabs)/order')}
                >
                  <LinearGradient
                    colors={['#F36514', '#F8943F']}
                    style={styles.continueButtonGradient}
                    start={[0, 0]}
                    end={[1, 0]}
                  >
                    <Text style={styles.continueButtonText}>Browse Menu</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animatable.View>
            </View>
          ) : (
            <View style={styles.contentContainer}>
              <Animatable.View animation="fadeInDown" duration={800}>
                <Text style={styles.screenTitle}>Active Orders</Text>
              </Animatable.View>
              
              <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[styles.tabButton, selectedTab === 'paid' && styles.tabButtonActive]}
                  onPress={() => setSelectedTab('paid')}
                >
                  <Text style={[styles.tabButtonText, selectedTab === 'paid' && styles.tabButtonTextActive]}>Paid Orders</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tabButton, selectedTab === 'unpaid' && styles.tabButtonActive]}
                  onPress={() => setSelectedTab('unpaid')}
                >
                  <Text style={[styles.tabButtonText, selectedTab === 'unpaid' && styles.tabButtonTextActive]}>Awaiting Payment</Text>
                  {orders.filter(order => order.paymentStatus === 'unpaid').length > 0 && (
                    <Badge style={styles.unpaidBadge}>
                      {`${orders.filter(order => order.paymentStatus === 'unpaid').length}`}
                    </Badge>
                  )}
                </TouchableOpacity>
              </View>
              
              {/* Debug information */}
              {(() => {
                console.log('Current orders state:', orders.map(o => ({ id: o.id, status: o.status, paymentStatus: o.paymentStatus })));
                console.log('Selected tab:', selectedTab);
                return null;
              })()}
              <ScrollView 
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[Colors.primary]}
                  />
                }
              >
                {orders
                  .filter(order => {
                    // Force re-evaluate each order's payment status from its stored value
                    const shouldShow = selectedTab === 'paid'
                      ? (order.paymentStatus === 'paid' || 
                        order.paymentMethod === 'cash' || 
                        (!order.paymentStatus && order.paymentStatus !== 'unpaid'))
                      : order.paymentStatus === 'unpaid';
                      
                    // Log for debugging - outside the JSX rendering
                    if (__DEV__) {
                      console.log(`Order ${order.id.slice(-6)}: paymentStatus=${order.paymentStatus}, paymentMethod=${order.paymentMethod}, shouldShow in ${selectedTab} tab: ${shouldShow}`);
                    }
                    return shouldShow;
                  })
                  .map((order) => renderOrderCard(order))}
              </ScrollView>
            </View>
          )}
          
          {/* Payment Modal */}
          <Modal
            visible={paymentModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setPaymentModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Complete Your Payment</Text>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setPaymentModalVisible(false)}
                    disabled={processingPayment}
                  >
                    <FontAwesome name="times" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                
                {selectedOrder && (
                  <View style={styles.modalContent}>
                    <Text style={styles.modalOrderNumber}>Order #{selectedOrder.id.slice(-6)}</Text>
                    <Text style={styles.modalOrderDate}>{formatDate(selectedOrder.createdAt)}</Text>
                    
                    <View style={styles.modalOrderItems}>
                      {selectedOrder.items.map((item, index) => (
                        <View key={index} style={styles.modalOrderItem}>
                          <View style={styles.modalOrderItemInfo}>
                            <Text style={styles.modalOrderItemName}>
                              {item.name} {item.size && `(${item.size})`}
                            </Text>
                            <Badge style={styles.modalOrderItemQuantity}>
                              {`x${item.quantity}`}
                            </Badge>
                          </View>
                          <Text style={styles.modalOrderItemPrice}>₱{item.price.toFixed(2)}</Text>
                        </View>
                      ))}
                    </View>
                    
                    <View style={styles.modalOrderTotal}>
                      <Text style={styles.modalTotalLabel}>Total Amount:</Text>
                      <Text style={styles.modalTotalValue}>
                        ₱{typeof selectedOrder.total === 'number' ? selectedOrder.total.toFixed(2) : '0.00'}
                      </Text>
                    </View>
                    
                    <View style={styles.modalTimerContainer}>
                      <FontAwesome name="clock-o" size={18} color="#EF4444" />
                      <Text style={styles.modalTimerText}>
                        Payment expires in: {countdowns[selectedOrder.id] || 'Loading...'}
                      </Text>
                    </View>
                    
                    <View style={styles.modalPaymentMethod}>
                      <Text style={styles.modalPaymentLabel}>Payment Method:</Text>
                      <View style={styles.modalPaymentValue}>
                        <FontAwesome 
                          name={
                            selectedOrder.paymentMethod === 'gcash' ? 'credit-card' :
                            selectedOrder.paymentMethod === 'maya' ? 'credit-card-alt' : 'money'
                          } 
                          size={16} 
                          color="#4B5563" 
                          style={{marginRight: 8}}
                        />
                        <Text style={styles.modalPaymentText}>
                          {selectedOrder.paymentMethod === 'gcash' ? 'GCash' : 
                           selectedOrder.paymentMethod === 'maya' ? 'Maya' : 
                           selectedOrder.paymentMethod === 'grab_pay' ? 'GrabPay' : 'E-Wallet'}
                        </Text>
                      </View>
                    </View>
                    
                    <TouchableOpacity
                      style={[styles.modalRetryButton, processingPayment && styles.modalButtonDisabled]}
                      onPress={() => handleRetryPayment(selectedOrder)}
                      disabled={processingPayment}
                    >
                      <LinearGradient
                        colors={processingPayment ? ['#9CA3AF', '#9CA3AF'] : ['#F36514', '#F8943F']}
                        style={styles.modalRetryButtonGradient}
                        start={[0, 0]}
                        end={[1, 0]}
                      >
                        {processingPayment ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.modalRetryButtonText}>Pay Now</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </Modal>

          {/* Success Modal */}
          <Modal
            visible={successModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setSuccessModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <Animatable.View 
                animation="zoomIn" 
                duration={500} 
                style={styles.successModalContainer}
              >
                <View style={styles.successModalContent}>
                  <Animatable.View 
                    animation="bounceIn" 
                    delay={300} 
                    style={styles.successIconContainer}
                  >
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      style={styles.successIconGradient}
                      start={[0, 0]}
                      end={[1, 1]}
                    >
                      <FontAwesome name="check" size={40} color="#FFFFFF" />
                    </LinearGradient>
                  </Animatable.View>
                  
                  <Animatable.Text 
                    animation="fadeInUp" 
                    delay={400} 
                    style={styles.successTitle}
                  >
                    Payment Successful!
                  </Animatable.Text>
                  
                  {successOrderDetails && (
                    <>
                      <Animatable.View 
                        animation="fadeInUp" 
                        delay={500} 
                        style={styles.successDetailsContainer}
                      >
                        <View style={styles.successDetailRow}>
                          <Text style={styles.successDetailLabel}>Order ID:</Text>
                          <Text style={styles.successDetailValue}>#{successOrderDetails.orderId.slice(-6)}</Text>
                        </View>
                        
                        <View style={styles.successDetailRow}>
                          <Text style={styles.successDetailLabel}>Amount Paid:</Text>
                          <Text style={styles.successDetailValue}>₱{successOrderDetails.total.toFixed(2)}</Text>
                        </View>
                        
                        <View style={styles.successDetailRow}>
                          <Text style={styles.successDetailLabel}>Points Earned:</Text>
                          <Text style={styles.successDetailValue}>{successOrderDetails.points} points</Text>
                        </View>
                      </Animatable.View>
                      
                      <Animatable.View 
                        animation="fadeInUp" 
                        delay={600} 
                        style={styles.successMessageContainer}
                      >
                        <Text style={styles.successMessage}>
                          Your order will be processed shortly. Thank you for your purchase!
                        </Text>
                      </Animatable.View>
                    </>
                  )}
                  
                  <Animatable.View 
                    animation="fadeInUp" 
                    delay={700} 
                    style={styles.successButtonContainer}
                  >
                    <TouchableOpacity
                      style={styles.successButton}
                      onPress={() => setSuccessModalVisible(false)}
                    >
                      <LinearGradient
                        colors={['#F36514', '#F8943F']}
                        style={styles.successButtonGradient}
                        start={[0, 0]}
                        end={[1, 0]}
                      >
                        <Text style={styles.successButtonText}>
                          Great, Thanks!
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </Animatable.View>
                </View>
              </Animatable.View>
            </View>
          </Modal>

          {/* Error/Status Modal */}
          <Modal
            visible={errorModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => handleErrorModalDismiss()}
          >
            <View style={styles.modalOverlay}>
              <Animatable.View 
                animation="zoomIn" 
                duration={300} 
                style={styles.errorModalContainer}
              >
                <View style={styles.errorModalContent}>
                  <View style={styles.errorIconContainer}>
                    <FontAwesome name="exclamation-circle" size={40} color="#EF4444" />
                  </View>
                  
                  <Text style={styles.errorTitle}>
                    {errorDetails.title}
                  </Text>
                  
                  <Text style={styles.errorMessage}>
                    {errorDetails.message}
                  </Text>
                  
                  <TouchableOpacity
                    style={styles.errorButton}
                    onPress={handleErrorModalDismiss}
                  >
                    <LinearGradient
                      colors={['#6B7280', '#4B5563']}
                      style={styles.errorButtonGradient}
                      start={[0, 0]}
                      end={[1, 0]}
                    >
                      <Text style={styles.errorButtonText}>
                        OK
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </Animatable.View>
            </View>
          </Modal>
        </LinearGradient>
    </SafeAreaView>
  );
}

// Explicitly type the styles
interface Styles {
  container: ViewStyle;
  backgroundPattern: ViewStyle;
  gradientOverlay: ViewStyle;
  loadingContainer: ViewStyle;
  loadingText: TextStyle;
  scrollView: ViewStyle;
  screenTitle: TextStyle;
  emptyContainer: ViewStyle;
  emptyText: TextStyle;
  continueButton: ViewStyle;
  continueButtonGradient: ViewStyle;
  continueButtonText: TextStyle;
  orderCard: ViewStyle;
  orderCardGradient: ViewStyle;
  orderHeader: ViewStyle;
  orderHeaderContent: ViewStyle;
  orderInfoRow: ViewStyle;
  statusIconContainer: ViewStyle;
  orderStatus: TextStyle;
  statusMessage: TextStyle;
  orderNumber: TextStyle;
  orderDate: TextStyle;
  headerDivider: ViewStyle;
  divider: ViewStyle;
  orderDetails: ViewStyle;
  orderItem: ViewStyle;
  orderItemInfo: ViewStyle;
  orderItemName: TextStyle;
  orderItemPrice: TextStyle;
  orderItemQuantity: any;
  orderFooter: ViewStyle;
  orderTotal: TextStyle;
  orderSourceChip: any;
  orderSource: TextStyle;
  pickupInstructions: ViewStyle;
  pickupGradient: ViewStyle;
  pickupIcon: TextStyle;
  pickupText: TextStyle;
  statusTextContainer: ViewStyle;
  contentContainer: ViewStyle;
  tabContainer: ViewStyle;
  tabButton: ViewStyle;
  tabButtonActive: ViewStyle;
  tabButtonText: TextStyle;
  tabButtonTextActive: TextStyle;
  unpaidBadge: any;
  unpaidOrderCard: ViewStyle;
  unpaidStatusIconContainer: ViewStyle;
  unpaidBanner: ViewStyle;
  unpaidBannerText: TextStyle;
  paymentButton: ViewStyle;
  paymentButtonGradient: ViewStyle;
  paymentButtonIcon: TextStyle;
  paymentButtonText: TextStyle;
  modalOverlay: ViewStyle;
  modalContainer: ViewStyle;
  modalHeader: ViewStyle;
  modalTitle: TextStyle;
  modalCloseButton: ViewStyle;
  modalContent: ViewStyle;
  modalOrderNumber: TextStyle;
  modalOrderDate: TextStyle;
  modalOrderItems: ViewStyle;
  modalOrderItem: ViewStyle;
  modalOrderItemInfo: ViewStyle;
  modalOrderItemName: TextStyle;
  modalOrderItemPrice: TextStyle;
  modalOrderItemQuantity: any;
  modalOrderTotal: ViewStyle;
  modalTotalLabel: TextStyle;
  modalTotalValue: TextStyle;
  modalTimerContainer: ViewStyle;
  modalTimerText: TextStyle;
  modalPaymentMethod: ViewStyle;
  modalPaymentLabel: TextStyle;
  modalPaymentValue: ViewStyle;
  modalPaymentText: TextStyle;
  modalRetryButton: ViewStyle;
  modalRetryButtonGradient: ViewStyle;
  modalRetryButtonText: TextStyle;
  modalButtonDisabled: ViewStyle;
  verifyButtonContainer: ViewStyle;
  verifyButton: ViewStyle;
  verifyButtonGradient: ViewStyle;
  verifyButtonText: TextStyle;
  verifyButtonIcon: TextStyle;
  verifyButtonHint: TextStyle;
  successModalContainer: ViewStyle;
  successModalContent: ViewStyle;
  successIconContainer: ViewStyle;
  successIconGradient: ViewStyle;
  successTitle: TextStyle;
  successDetailsContainer: ViewStyle;
  successDetailRow: ViewStyle;
  successDetailLabel: TextStyle;
  successDetailValue: TextStyle;
  successMessageContainer: ViewStyle;
  successMessage: TextStyle;
  successButtonContainer: ViewStyle;
  successButton: ViewStyle;
  successButtonGradient: ViewStyle;
  successButtonText: TextStyle;
  errorModalContainer: ViewStyle;
  errorModalContent: ViewStyle;
  errorIconContainer: ViewStyle;
  errorTitle: TextStyle;
  errorMessage: TextStyle;
  errorButton: ViewStyle;
  errorButtonGradient: ViewStyle;
  errorButtonText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backgroundPattern: {
    flex: 1,
    width: '100%',
  },
  gradientOverlay: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: Colors.text.secondary,
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: Spacing.lg,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.text.secondary,
    marginTop: 16,
    marginBottom: 24,
  },
  continueButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  continueButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  orderCard: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    ...Shadows.medium,
    elevation: 3,
  },
  unpaidOrderCard: {
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  orderCardGradient: {
    borderRadius: BorderRadius.lg,
  },
  orderHeader: {
    padding: Spacing.md,
  },
  orderHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: 'rgba(249, 250, 251, 0.5)',
  },
  statusTextContainer: {
    flex: 1,
  },
  orderStatus: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusMessage: {
    fontSize: 12,
    color: Colors.text.secondary,
    maxWidth: '95%',
    flexWrap: 'wrap',
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  orderDate: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  headerDivider: {
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  divider: {
    marginHorizontal: Spacing.md,
    backgroundColor: '#E5E7EB',
  },
  orderDetails: {
    padding: Spacing.md,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(249, 250, 251, 0.5)',
    padding: 10,
    borderRadius: BorderRadius.md,
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  orderItemPrice: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  orderItemQuantity: {
    backgroundColor: Colors.primary,
    color: Colors.white,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: 'rgba(243, 244, 246, 0.4)',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  orderSourceChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    height: 28,
  },
  orderSource: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  pickupInstructions: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  pickupGradient: {
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickupIcon: {
    marginRight: 8,
  },
  pickupText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.white,
    flex: 1,
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    ...Shadows.small,
  },
  unpaidStatusIconContainer: {
    backgroundColor: '#FEF2F2',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: BorderRadius.md,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
    flexDirection: 'row',
  },
  tabButtonActive: {
    backgroundColor: Colors.white,
    ...Shadows.small,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  tabButtonTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  unpaidBadge: {
    backgroundColor: '#EF4444',
    marginLeft: 6,
  },
  unpaidBanner: {
    backgroundColor: '#EF4444',
    paddingVertical: 6,
    alignItems: 'center',
  },
  unpaidBannerText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
  paymentButton: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  paymentButtonGradient: {
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentButtonIcon: {
    marginRight: 8,
  },
  paymentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    ...Shadows.large,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  modalContent: {
    padding: Spacing.md,
  },
  modalOrderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  modalOrderDate: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  modalOrderItems: {
    marginBottom: 16,
  },
  modalOrderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalOrderItemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOrderItemName: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
  },
  modalOrderItemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  modalOrderItemQuantity: {
    backgroundColor: Colors.primary,
    marginRight: 8,
    color: Colors.white,
  },
  modalOrderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  modalTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  modalTimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: BorderRadius.md,
    marginTop: 16,
    marginBottom: 16,
  },
  modalTimerText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  modalPaymentMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalPaymentLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  modalPaymentValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalPaymentText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  modalRetryButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  modalRetryButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRetryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
  verifyButtonContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  verifyButton: {
    overflow: 'hidden',
    borderRadius: BorderRadius.md,
    ...Shadows.small,
  },
  verifyButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  verifyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  verifyButtonIcon: {
    marginRight: 8,
  },
  verifyButtonHint: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  successModalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    ...Shadows.large,
    overflow: 'hidden',
  },
  successModalContent: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: Spacing.lg,
    borderRadius: 50,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  successIconGradient: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: Spacing.md,
  },
  successDetailsContainer: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  successDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  successDetailLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  successDetailValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  successMessageContainer: {
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  successMessage: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  successButtonContainer: {
    width: '100%',
  },
  successButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  successButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  errorModalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    ...Shadows.large,
    overflow: 'hidden',
  },
  errorModalContent: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: '#FEE2E2',
    ...Shadows.small,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
    lineHeight: 24,
  },
  errorButton: {
    width: '100%',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  errorButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});
