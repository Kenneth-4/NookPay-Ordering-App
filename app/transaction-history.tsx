import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { useRouter } from 'expo-router';
import { db } from '../firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/auth';

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
  items: OrderItem[];
  total: number;
  subtotal?: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  createdAt: any;
  customerName: string;
  customerId: string;
  source: string;
  paymentMethod: string;
  diningMode: string;
  tax?: {
    amount: number;
    percentage: number;
    label: string;
  };
  serviceCharge?: {
    amount: number;
    percentage: number;
  };
  discount?: {
    amount: number;
    percentage: number;
    type: string;
  };
  voucher?: {
    code: string;
    description?: string;
    discountAmount: number;
    percentage: number;
  };
  refundReason?: string;
}

export default function TransactionHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(() => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('customerId', '==', user.uid),
      where('status', 'in', ['completed', 'cancelled', 'refunded'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      // Sort on client side temporarily
      ordersList.sort((a, b) => {
        const timestampA = a.createdAt?.toDate?.() || new Date(0);
        const timestampB = b.createdAt?.toDate?.() || new Date(0);
        return timestampB.getTime() - timestampA.getTime();
      });
      setOrders(ordersList);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('Error fetching orders:', error);
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    const unsubscribe = loadOrders();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const formatDate = (timestamp: any) => {
    // Handle both Firestore Timestamp and regular timestamps
    const date = timestamp?.toDate?.() || new Date(timestamp);
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

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      case 'refunded': return '#9333EA';
      case 'processing': return '#F59E0B';
      default: return '#6366F1';
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'completed': return 'check-circle';
      case 'cancelled': return 'times-circle';
      case 'refunded': return 'undo';
      case 'processing': return 'clock-o';
      default: return 'hourglass-start';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={20} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order History</Text>
      </View>

      {!user ? (
        <View style={styles.emptyContainer}>
          <FontAwesome name="user-circle" size={64} color={Colors.gray} />
          <Text style={styles.emptyTitle}>Not Logged In</Text>
          <Text style={styles.emptyText}>Please login to view your orders</Text>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/(auth)/sign-in')}
          >
            <Text style={styles.actionButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome name="list-alt" size={64} color={Colors.gray} />
          <Text style={styles.emptyText}>No completed orders yet</Text>
          <TouchableOpacity 
            style={styles.orderButton}
            onPress={() => router.push('/(tabs)/my-order')}
          >
            <Text style={styles.orderButtonText}>View Current Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.orderButton, {marginTop: 12, backgroundColor: Colors.secondary}] }
            onPress={() => router.push('/(tabs)/order')}
          >
            <Text style={styles.orderButtonText}>Browse Menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
        >
          {orders.map((order) => {
            // Calculate total with and without discount to detect implicit discounts
            const calculatedTotal = (order.subtotal || 0) + (order.tax?.amount || 0) + 
              (order.serviceCharge?.amount || 0) - (order.discount?.amount || 0) - 
              (order.voucher?.discountAmount || 0);
            const hasImplicitDiscount = Math.abs(calculatedTotal - order.total) > 0.01 && 
              calculatedTotal > order.total;
            
            return (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                  <Text style={styles.orderId}>Order #{order.id.slice(-6).toUpperCase()}</Text>
                  {/* Show refund reason if refunded, below order number */}
                  {order.status === 'refunded' && order.refundReason && (
                    <Text style={styles.refundReasonText} numberOfLines={2} ellipsizeMode="tail">
                      Refund Reason: <Text style={{fontStyle: 'italic'}}>{order.refundReason}</Text>
                    </Text>
                  )}
                </View>
                <View style={[styles.statusContainer, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                  <FontAwesome 
                    name={getStatusIcon(order.status)} 
                    size={14} 
                    color={getStatusColor(order.status)} 
                    style={styles.statusIcon}
                  />
                  <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.itemsContainer}>
                {order.items.map((item, index) => (
                  <View key={item.id} style={[
                    styles.itemRow,
                    index !== order.items.length - 1 && styles.itemBorder
                  ]}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemQuantity}>{item.quantity}x</Text>
                      <View style={styles.itemDetails}>
                        <Text style={styles.itemName}>
                          {item.name}
                          {item.size && <Text style={styles.itemSize}> ({item.size})</Text>}
                        </Text>
                        {item.addOns && item.addOns.length > 0 && (
                          <View style={styles.addOnsContainer}>
                            {item.addOns.map((addOn) => (
                              <Text key={addOn.id} style={styles.addOnText}>
                                + {addOn.name}
                              </Text>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={styles.itemPrice}>
                      ₱{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.orderFooter}>
                <View style={styles.footerRow}>
                  <Text style={styles.footerLabel}>Payment Method</Text>
                  <Text style={styles.footerValue}>{order.paymentMethod || 'Not specified'}</Text>
                </View>
                <View style={styles.footerRow}>
                  <Text style={styles.footerLabel}>Dining Mode</Text>
                  <Text style={styles.footerValue}>{order.diningMode || 'Not specified'}</Text>
                </View>
                
                {order.subtotal && (
                  <View style={styles.footerRow}>
                    <Text style={styles.footerLabel}>Subtotal</Text>
                    <Text style={styles.footerValue}>₱{order.subtotal.toFixed(2)}</Text>
                  </View>
                )}
                
                {order.tax && order.tax.amount > 0 && (
                  <View style={styles.footerRow}>
                    <Text style={styles.footerLabel}>{order.tax.label || 'VAT'} ({order.tax.percentage}%)</Text>
                    <Text style={styles.footerValue}>₱{order.tax.amount.toFixed(2)}</Text>
                  </View>
                )}
                
                {order.serviceCharge && order.serviceCharge.amount > 0 && (
                  <View style={styles.footerRow}>
                    <Text style={styles.footerLabel}>Service Charge ({order.serviceCharge.percentage}%)</Text>
                    <Text style={styles.footerValue}>₱{order.serviceCharge.amount.toFixed(2)}</Text>
                  </View>
                )}
                
                {order.discount && order.discount.amount > 0 && (
                  <View style={styles.footerRow}>
                    <Text style={[styles.footerLabel, { color: Colors.success }]}>
                      {order.discount.type || 'Discount'} {order.discount.percentage > 0 && `(${order.discount.percentage}%)`}
                    </Text>
                    <Text style={[styles.footerValue, { color: Colors.success }]}>-₱{order.discount.amount.toFixed(2)}</Text>
                  </View>
                )}
                
                {order.voucher && order.voucher.discountAmount > 0 && (
                  <View style={styles.footerRow}>
                    <Text style={[styles.footerLabel, { color: Colors.primary }]}>
                      Voucher: {order.voucher.code} {order.voucher.percentage > 0 && `(${order.voucher.percentage}%)`}
                    </Text>
                    <Text style={[styles.footerValue, { color: Colors.primary }]}>-₱{order.voucher.discountAmount.toFixed(2)}</Text>
                  </View>
                )}
                
                {hasImplicitDiscount && !order.discount && !order.voucher && (
                  <View style={styles.footerRow}>
                    <Text style={[styles.footerLabel, { color: Colors.primary }]}>Discount</Text>
                    <Text style={[styles.footerValue, { color: Colors.primary }]}>-₱{(calculatedTotal - order.total).toFixed(2)}</Text>
                  </View>
                )}
                
                <View style={[styles.totalRow, styles.footerRow]}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalAmount}>
                    ₱{(order.total || 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray + '20',
    backgroundColor: Colors.white,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray + '20',
  },
  orderInfo: {
    flex: 1,
  },
  orderDate: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemsContainer: {
    padding: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray + '10',
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemQuantity: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text.secondary,
    marginRight: 12,
    minWidth: 32,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  itemSize: {
    color: Colors.text.secondary,
    fontSize: 14,
  },
  addOnsContainer: {
    marginTop: 4,
  },
  addOnText: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 16,
  },
  orderFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.gray + '20',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  footerLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  footerValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.gray + '20',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  orderButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  orderButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 16,
  },
  refundReasonText: {
    color: '#9333EA',
    fontSize: 13,
    marginTop: 4,
    fontStyle: 'italic',
    fontWeight: '500',
  },
});
