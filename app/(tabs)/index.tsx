import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
  FlatList,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadows, FontSizes } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/auth';
import { BlurView } from 'expo-blur';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, getDoc, Timestamp, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Card, Text, Button, ActivityIndicator, Chip, Surface, ProgressBar, Avatar } from 'react-native-paper';
import { useTheme } from '../../contexts/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Animatable from 'react-native-animatable';

interface Product {
  id: string;
  name: string;
  price: string;
  imageUrl: string;
  description: string;
  categoryId: string;
  status: 'available' | 'unavailable';
  hasSizes?: boolean;
  sizes?: {
    [key: string]: {
      price: string;
    };
  };
}

interface UserPoints {
  points: number;
  ordersCount: number;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  id: string;  // This is the productId
}

interface Order {
  items: OrderItem[];
  timestamp: Timestamp;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
}

interface Banner {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  targetRoute: string;
  createdAt: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const width = Dimensions.get('window').width;
  const [userPoints, setUserPoints] = useState<UserPoints>({ points: 0, ordersCount: 0 });
  const [loading, setLoading] = useState(true);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const bannerRef = useRef<FlatList>(null);
  
  const [banners, setBanners] = useState<Banner[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Run entrance animations when component mounts
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  useEffect(() => {
    // Subscribe to banners from Firestore
    const settingsRef = doc(db, 'settings', 'config');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists() && doc.data().banners) {
        setBanners(doc.data().banners);
      }
    }, (error) => {
      console.error('Error loading banners:', error);
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadBestSellers();
    if (user?.uid) {
      loadUserPoints();
    }
  }, [user]);
  
  // Auto-scroll banner effect
  useEffect(() => {
    if (banners.length === 0) return;
    
    const autoScrollInterval = setInterval(() => {
      if (bannerRef.current) {
        const nextIndex = (currentBannerIndex + 1) % banners.length;
        if (nextIndex >= 0 && nextIndex < banners.length) {
          bannerRef.current.scrollToIndex({
            index: nextIndex,
            animated: true,
            viewPosition: 0
          });
          setCurrentBannerIndex(nextIndex);
        }
      }
    }, 4000); // Change banner every 4 seconds
    
    return () => clearInterval(autoScrollInterval);
  }, [currentBannerIndex, banners.length]);

  const loadUserPoints = () => {
    if (!user?.uid) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setUserPoints({
          points: data.points || 0,
          ordersCount: data.ordersCount || 0
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const loadBestSellers = async () => {
    try {
      setLoading(true);
      
      // Get best seller product IDs from settings
      const settingsRef = doc(db, 'settings', 'config');
      const settingsDoc = await getDoc(settingsRef);
      
      if (!settingsDoc.exists() || !settingsDoc.data().bestSellers?.products) {
        console.log('No best sellers configured in settings');
        setBestSellers([]);
        setLoading(false);
        return;
      }
      
      const bestSellerIds: string[] = settingsDoc.data().bestSellers.products;
      
      if (bestSellerIds.length === 0) {
        console.log('No best seller products configured');
        setBestSellers([]);
        setLoading(false);
        return;
      }
      
      console.log('Best seller IDs from settings:', bestSellerIds);
      
      // Fetch all products
      const productsRef = collection(db, 'products');
      const productsSnapshot = await getDocs(productsRef);
      const allProducts = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));
      
      // Filter products to get only best sellers and maintain order from settings
      const orderedBestSellers = bestSellerIds
        .map(id => allProducts.find(product => product.id === id))
        .filter((product): product is Product => product !== undefined);
      
      console.log(`Found ${orderedBestSellers.length} best seller products`);
      setBestSellers(orderedBestSellers);
    } catch (error) {
      console.error('Error loading best sellers:', error);
    } finally {
      setLoading(false);
    }
  };

  const [pointsThreshold, setPointsThreshold] = useState(100);
  
  useEffect(() => {
    // Load points threshold from settings with real-time updates
    const settingsRef = doc(db, 'settings', 'config');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists() && doc.data().rewards?.pointsThreshold) {
        setPointsThreshold(doc.data().rewards.pointsThreshold);
      }
    }, (error) => {
      console.error('Error loading points threshold:', error);
    });
    
    return () => unsubscribe();
  }, []);
  
  const pointsToNextReward = pointsThreshold - (userPoints.points % pointsThreshold);
  const availableRewards = Math.floor(userPoints.points / pointsThreshold);

  // Format price with peso sign
  const formatPrice = (price: number): string => {
    return `₱${price.toFixed(2)}`;
  };

  const renderBestSellerCard = (item: Product, index: number) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.bestSellerCardWrapper,
        item.status === 'unavailable' && styles.unavailableCard
      ]}
      onPress={() => router.push(`/(product)/${item.id}`)}
      activeOpacity={0.7}
      disabled={item.status === 'unavailable'}
    >
      <View 
        style={[
          styles.circularImageContainer,
          item.status === 'unavailable' && { opacity: 0.5 }
        ]}
      >
        {item.imageUrl ? (
          <Image 
            source={{ uri: item.imageUrl }} 
            style={styles.circularImage}
            onError={(e) => {
              console.error('Error loading product image:', e.nativeEvent.error);
            }}
          />
        ) : (
          <View style={[
            styles.noImage, 
            item.status === 'unavailable' && styles.unavailableNoImage
          ]}>
            <FontAwesome 
              name="image" 
              size={24} 
              color={item.status === 'unavailable' ? "#D1D5DB" : "#9CA3AF"} 
            />
          </View>
        )}
        
        {item.status === 'unavailable' && (
          <View style={styles.unavailableOverlay}>
            <Text style={styles.unavailableOverlayText}>Unavailable</Text>
          </View>
        )}
        
        <LinearGradient 
          colors={['transparent', 'rgba(0,0,0,0.5)']}
          style={styles.imageGradient}
          start={[0, 0.6]}
          end={[0, 1]}
        />
        <View style={styles.topBadge}>
          <Text style={styles.topBadgeText}>Best Sellers</Text>
        </View>
      </View>
      <Text 
        style={[
          styles.bestSellerName, 
          item.status === 'unavailable' && styles.unavailableText
        ]} 
        numberOfLines={2}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

        <LinearGradient
          colors={['rgba(249, 250, 251, 0.9)', 'rgba(249, 250, 251, 0.8)']}
          style={styles.gradientOverlay}
        >
          <ScrollView 
            style={[
              styles.content, 
              Platform.OS === 'web' ? styles.webScrollView : null
            ]}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={false}
          >
            <Animated.View 
              style={[
                styles.header,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }]
                }
              ]}
            >
              <View>
                <Animatable.View animation="fadeIn" duration={1000}>
                  <View style={styles.welcomeContainer}>
                    <Text style={styles.welcomeText}>
                      Welcome back, <Text style={styles.username}>{user ? (user.displayName || user.email?.split('@')[0]) : 'Guest'}</Text>
                    </Text>
                  </View>
                </Animatable.View>
              </View>
              {!user ? (
                <Animatable.View animation="pulse" iterationCount="infinite" duration={2000}>
                  <TouchableOpacity 
                    style={styles.signInButton} 
                    onPress={() => router.push('/(auth)/sign-in')}
                  >
                    <LinearGradient
                      colors={['#F36514', '#F8943F']}
                      style={styles.gradientButton}
                      start={[0, 0]}
                      end={[1, 0]}
                    >
                      <Text style={styles.signInText}>Sign In</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animatable.View>
              ) : (
                <Animatable.View animation="bounceIn" duration={1500}>
                </Animatable.View>
              )}
            </Animated.View>

            {user && (
              <Animatable.View 
                animation="fadeInUp" 
                duration={800}
                delay={200}
                style={styles.pointsCard}
              >
                <LinearGradient
                  colors={['#F36514', '#F8943F']}
                  style={styles.pointsGradient}
                  start={[0, 0]}
                  end={[1, 0]}
                >
                  <View style={styles.pointsHeader}>
                    <Text style={styles.pointsTitle}>Your Rewards Points</Text>
                  </View>
                  <View style={styles.pointsInfo}>
                    <View style={styles.pointsValueContainer}>
                      <Animatable.View animation="rotate" duration={2000} iterationCount="infinite" easing="ease-in-out">
                        <FontAwesome name="star" size={18} color={Colors.white} style={styles.pointsStar} />
                      </Animatable.View>
                      <Text style={styles.pointsText}>{userPoints.points}</Text>
                      <Text style={styles.pointsLabel}>points</Text>
                    </View>
                    <Text style={styles.pointsSubtext}>
                      {availableRewards > 0 
                        ? `You have ${availableRewards} free meal or drink${availableRewards > 1 ? 's' : ''} available!` 
                        : `${pointsToNextReward} more points until your next free meal`}
                    </Text>
                    <Animatable.View animation="fadeIn" duration={1000} delay={600}>
                      <View style={styles.progressBar}>
                        <Animatable.View 
                          animation="fadeIn" 
                          duration={1000}
                          delay={800}
                          style={[
                            styles.progressFill, 
                            { width: `${((userPoints.points % pointsThreshold) / pointsThreshold) * 100}%` }
                          ]} 
                        />
                      </View>
                    </Animatable.View>
                    <Text style={styles.pointsDetails}>
                      Earn 1 point per item • Free meal or drink at {pointsThreshold} points
                    </Text>
                  </View>
                </LinearGradient>
              </Animatable.View>
            )}

            <Animatable.View 
              animation="fadeInUp" 
              duration={800}
              delay={300}
              style={styles.bannerContainer}
            >
              <FlatList
                ref={bannerRef}
                data={banners}
                horizontal
                pagingEnabled
                scrollEnabled={true}
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                getItemLayout={(data, index) => ({
                  length: width - (Spacing.lg * 2),
                  offset: (width - (Spacing.lg * 2)) * index,
                  index,
                })}
                onMomentumScrollEnd={(event) => {
                  const newIndex = Math.round(
                    event.nativeEvent.contentOffset.x / (width - (Spacing.lg * 2))
                  );
                  setCurrentBannerIndex(newIndex);
                }}
                renderItem={({ item }) => (
                  <Animatable.View animation="fadeIn" duration={800}>
                    <TouchableOpacity 
                      style={{ width: width - (Spacing.lg * 2), height: 320 }}
                      onPress={() => router.push(item.targetRoute)}
                      activeOpacity={0.9}
                    >
                      <ImageBackground
                        source={{ uri: item.imageUrl }}
                        style={[styles.bannerImage, { width: width - (Spacing.lg * 2) }]}
                        resizeMode="cover"
                        imageStyle={{ borderRadius: BorderRadius.lg }}
                      >
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.7)']}
                          style={styles.bannerGradient}
                          start={[0, 0.4]}
                          end={[0, 1]}
                        >
                          <View style={styles.bannerContent}>
                            {item.title && (
                              <Text style={styles.bannerTitle}>{item.title}</Text>
                            )}
                            {item.subtitle && (
                              <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
                            )}
                          </View>
                        </LinearGradient>
                      </ImageBackground>
                    </TouchableOpacity>
                  </Animatable.View>
                )}
              />
            </Animatable.View>

            <Animatable.View 
              animation="fadeInUp" 
              duration={800} 
              delay={400}
              style={styles.bestSellersSection}
            >
              <Text style={styles.sectionTitle}>Best Sellers</Text>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <Animatable.View animation="pulse" easing="ease-out" iterationCount="infinite">
                    <ActivityIndicator size="large" color={Colors.primary} />
                  </Animatable.View>
                  <Text style={styles.loadingText}>Loading best sellers...</Text>
                </View>
              ) : bestSellers.length > 0 ? (
                <View style={styles.bestSellersGridContainer}>
                  {bestSellers.map((item, index) => renderBestSellerCard(item, index))}
                </View>
              ) : (
                <Animatable.View 
                  animation="fadeIn" 
                  duration={1000}
                  style={styles.noDataContainer}
                >
                  <FontAwesome name="shopping-basket" size={48} color={Colors.gray} />
                  <Text style={styles.noDataText}>No best sellers found</Text>
                  <Animatable.View animation="pulse" iterationCount="infinite" duration={2000}>
                    <TouchableOpacity 
                      style={styles.browseMenuButton}
                      onPress={() => router.push('/(tabs)/order')}
                    >
                      <Text style={styles.browseMenuText}>Browse Menu</Text>
                    </TouchableOpacity>
                  </Animatable.View>
                </Animatable.View>
              )}
            </Animatable.View>
          </ScrollView>
        </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  welcomeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: FontSizes.lg,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  username: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  signInButton: {
    height: 44,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  gradientButton: {
    height: '100%',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.white,
  },
  profileButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.round,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    ...Shadows.small,
  },
  bannerContainer: {
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  bannerImage: {
    height: 320,
    borderRadius: BorderRadius.lg,
  },
  bannerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
    borderRadius: BorderRadius.lg,
  },
  bannerContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  bannerSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.white,
    opacity: 0.9,
  },
  bestSellersSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
  },
  bestSellersGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  bestSellerCardWrapper: {
    width: '48%',
    paddingHorizontal: 4,
    marginBottom: Spacing.md,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { 
      cursor: 'pointer',
      touchAction: 'manipulation'
    } : {}),
  },
  unavailableCard: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  circularImageContainer: {
    position: 'relative',
    width: (Dimensions.get('window').width / 2) - 40,
    height: (Dimensions.get('window').width / 2) - 40,
    borderRadius: ((Dimensions.get('window').width / 2) - 40) / 2,
    overflow: 'hidden',
    marginBottom: 12,
    ...Shadows.medium,
  },
  circularImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 40,
  },
  noImage: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  unavailableNoImage: {
    backgroundColor: '#E5E7EB',
  },
  topBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: '50%',
    transform: [{ translateX: -40 }],
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.round,
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  topBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  bestSellerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 6,
    marginBottom: 8,
    width: (Dimensions.get('window').width / 2) - 50,
    textAlign: 'center',
  },
  pointsCard: {
    margin: 5,
    borderRadius: BorderRadius.lg,
    padding: 0,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    ...Shadows.medium,
  },
  pointsGradient: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  pointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  pointsTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.white,
  },
  pointsInfo: {
    padding: Spacing.sm,
    paddingTop: 0,
  },
  pointsValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  pointsText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    marginRight: 4,
  },
  pointsLabel: {
    fontSize: FontSizes.sm,
    color: Colors.white,
    fontWeight: '500',
  },
  pointsStar: {
    marginRight: Spacing.xs,
  },
  pointsSubtext: {
    fontSize: FontSizes.xs,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.white,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  pointsDetails: {
    fontSize: 11,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 14,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  noDataContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: FontSizes.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  unavailableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableOverlayText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: 'bold',
    backgroundColor: 'rgba(220, 38, 38, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
  unavailableText: {
    color: '#6B7280',
  },
  browseMenuButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.md,
    ...Shadows.small,
  },
  browseMenuText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  waveEmoji: {
    fontSize: 24,
    marginLeft: 8,
  },
  webScrollView: {
    zIndex: 1,
    touchAction: 'pan-y',
  },
});
