import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/auth';

interface VoucherSettings {
  id: string;
  code: string;
  description: string;
  discountAmount: number;
  minimumOrderAmount: number;
  maxUsagePerUser: number;
  enabled: boolean;
}

interface UserVoucherUsage {
    [voucherCode: string]: number;
}

export default function VouchersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState<VoucherSettings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userVoucherUsage, setUserVoucherUsage] = useState<UserVoucherUsage>({});
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);

  useEffect(() => {
    const loadData = async () => {
        setIsLoading(true);
        setIsLoadingUsage(true);

        const loadVouchersPromise = async () => {
            try {
                const settingsRef = doc(db, 'settings', 'config');
                const settingsDoc = await getDoc(settingsRef);
                if (settingsDoc.exists() && settingsDoc.data()?.vouchers) {
                    const enabledVouchers = (settingsDoc.data().vouchers as VoucherSettings[])
                                              .filter(v => v.enabled);
                    setVouchers(enabledVouchers);
                } else {
                    setVouchers([]);
                }
            } catch (error) {
                console.error("Error loading vouchers:", error);
                setVouchers([]);
            }
        };

        const loadUsagePromise = async () => {
            if (!user) {
                setUserVoucherUsage({});
                return;
            }
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
                setUserVoucherUsage({});
            }
        };

        await Promise.all([loadVouchersPromise(), loadUsagePromise()]);

        setIsLoading(false);
        setIsLoadingUsage(false);
    };

    loadData();
  }, [user]);

  const renderVoucherItem = ({ item }: { item: VoucherSettings }) => {
    const maxUsage = item.maxUsagePerUser ?? 0;
    const currentUsage = userVoucherUsage[item.code] || 0;
    const isUsedUp = maxUsage > 0 && currentUsage >= maxUsage;

    // Handle old voucher format for backward compatibility
    const discountAmount = (item as any).discountAmount !== undefined 
      ? (item as any).discountAmount 
      : (item as any).discountPercentage || 0;

    return (
      <View style={[styles.ticketCard, isUsedUp && styles.usedTicketCard]}>
        <View style={styles.ticketLeft}>
          <View style={styles.discountCircle}>
            <Text style={[styles.discountAmount, isUsedUp && styles.usedTicketText]}>₱{discountAmount}</Text>
            <Text style={[styles.discountLabel, isUsedUp && styles.usedTicketText]}>OFF</Text>
          </View>
        </View>
        
        <View style={styles.ticketDashedLine}>
          {Array(8).fill(0).map((_, i) => (
            <View key={i} style={[styles.dashedItem, isUsedUp && styles.usedDashedItem]} />
          ))}
        </View>
        
        <View style={styles.ticketRight}>
          <Text style={[styles.ticketCode, isUsedUp && styles.usedTicketText]}>{item.code}</Text>
          
          {item.description && (
            <Text style={[styles.ticketDescription, isUsedUp && styles.usedTicketText]}>
              {item.description}
            </Text>
          )}
          
          <View style={styles.ticketDetails}>
            <Text style={[styles.minimumText, isUsedUp && styles.usedTicketText]}>
              Min. spend: ₱{item.minimumOrderAmount.toFixed(2)}
            </Text>
            
            {maxUsage > 0 && (
              <Text style={[styles.usageText, isUsedUp && styles.usedTicketText]}>
                Uses: {currentUsage}/{maxUsage}
                {isUsedUp && <Text style={styles.limitReachedText}> (Limit reached)</Text>}
              </Text>
            )}
          </View>
          
          <View style={styles.ticketAction}>
            <Text style={[
              styles.actionText,
              isUsedUp && styles.usedActionText
            ]}>
              {isUsedUp ? "LIMIT REACHED" : "USE IN CHECKOUT"}
            </Text>
          </View>
        </View>
        
        <View style={[styles.ticketTopCircle, isUsedUp && styles.usedCircle]} />
        <View style={[styles.ticketBottomCircle, isUsedUp && styles.usedCircle]} />
      </View>
    );
  };

  const showLoading = isLoading || (user && isLoadingUsage);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Available Vouchers</Text>
      </View>
      <View style={styles.content}>
        {showLoading ? (
          <ActivityIndicator size="large" color="#F36514" style={styles.loader} />
        ) : vouchers.length > 0 ? (
          <FlatList
            data={vouchers}
            renderItem={renderVoucherItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          <View style={styles.noVoucherContainer}>
            <FontAwesome name="ticket" size={64} color="#D1D5DB" />
            <Text style={styles.noVoucherText}>No active vouchers available right now.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketCard: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    marginBottom: 24,
    borderRadius: 8,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
    height: 165,
    position: 'relative',
  },
  ticketLeft: {
    width: 90,
    backgroundColor: '#F36514',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  discountCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountAmount: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#F36514',
    lineHeight: 30,
  },
  discountLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F36514',
  },
  ticketDashedLine: {
    width: 1,
    backgroundColor: '#F3F4F6',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  dashedItem: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    marginLeft: -3.5,
  },
  usedDashedItem: {
    backgroundColor: '#E5E7EB',
  },
  ticketRight: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    padding: 14,
    justifyContent: 'space-between',
  },
  ticketCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    letterSpacing: 0.5,
  },
  ticketDescription: {
    fontSize: 13,
    color: '#4B5563',
    marginVertical: 4,
    height: 36,
  },
  ticketDetails: {
    marginTop: 4,
  },
  minimumText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  usageText: {
    fontSize: 12,
    color: '#6B7280',
  },
  ticketAction: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F36514',
    textAlign: 'center',
  },
  usedActionText: {
    color: '#9CA3AF',
  },
  ticketTopCircle: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    top: -8,
    left: 90 - 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 2,
  },
  ticketBottomCircle: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    bottom: -8,
    left: 90 - 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 2,
  },
  usedCircle: {
    backgroundColor: '#F3F4F6',
  },
  usedTicketCard: {
    opacity: 0.7,
  },
  usedTicketText: {
    color: '#9CA3AF',
  },
  limitReachedText: {
    color: '#EF4444',
    fontStyle: 'italic',
  },
  noVoucherContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 50,
  },
  noVoucherText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
});
