import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Animated,
  Dimensions,
  ImageBackground,
  Platform,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCart } from '../../contexts/cart';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  categoryId: string;
  name: string;
  price: string;
  imageUrl: string;
  description: string;
  status: 'available' | 'unavailable';
}

const { width } = Dimensions.get('window');
const PRODUCT_CARD_WIDTH = width / 2 - 24;
const HEADER_HEIGHT = 60; // Height of the "Menu" title section
const SEARCH_CONTAINER_HEIGHT = 70; // Height of search bar with padding
const CATEGORIES_HEIGHT = 60; // Height of categories with padding

export default function OrderScreen() {
  const router = useRouter();
  const { items } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Scroll position tracking
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const translateY = useState(new Animated.Value(50))[0];
  const cartButtonScale = useState(new Animated.Value(1))[0];
  const cartPulse = useState(new Animated.Value(1))[0];
  
  // Calculate header animations based on scroll position
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [-HEADER_HEIGHT - SEARCH_CONTAINER_HEIGHT - CATEGORIES_HEIGHT, 0],
    extrapolate: 'clamp',
  });
  
  const searchOpacity = scrollY.interpolate({
    inputRange: [HEADER_HEIGHT, HEADER_HEIGHT + 20],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    // Animate content when loaded
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        })
      ]).start();
      
      // Start the pulse animation for the cart
      startCartPulse();
    }
  }, [loading]);
  
  // Start a gentle pulsing animation for the cart button
  const startCartPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(cartPulse, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(cartPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();
  };

  // Cart button press animation
  const animateCartButton = () => {
    Animated.sequence([
      Animated.timing(cartButtonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(cartButtonScale, {
        toValue: 1.05,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(cartButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    // Subscribe to categories
    const unsubscribeCategories = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        const categoriesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Category[];
        setCategories(categoriesData);
        
        if (categories.length === 0) {
          setSelectedCategory(null);
        }
      },
      (error) => {
        console.error('Error fetching categories:', error);
      }
    );

    // Subscribe to products
    const unsubscribeProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const productsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
        setProducts(productsData);
        setLoading(false);
        if (refreshing) setRefreshing(false);
      },
      (error) => {
        console.error('Error fetching products:', error);
        setLoading(false);
        if (refreshing) setRefreshing(false);
      }
    );

    return () => {
      unsubscribeCategories();
      unsubscribeProducts();
    };
  }, []);

  const filteredProducts = products.filter(product => 
    (!selectedCategory || product.categoryId === selectedCategory?.id) &&
    (searchQuery === '' || 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculate total items in cart
  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);

  // Format price from string to proper currency format
  const formatPrice = (price: string) => {
    // Check if price is a valid string and can be converted to a number
    if (typeof price !== 'string' || price === '') {
      return '$0.00'; // Default fallback price
    }
    
    const parsedPrice = parseFloat(price);
    
    // Check if parseFloat returned a valid number
    if (isNaN(parsedPrice)) {
      console.warn(`Invalid price value: ${price}`);
      return '$0.00'; // Default fallback price
    }
    
    return `$${parsedPrice.toFixed(2)}`;
  };
  
  // Handle scroll events
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  if (loading) {
    return (
      <View style={styles.container}>
          <LinearGradient
            colors={['rgba(249, 250, 251, 0.9)', 'rgba(249, 250, 251, 0.8)']}
            style={styles.gradientOverlay}
          >
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading menu...</Text>
            </View>
          </LinearGradient>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
        {/* Subtle gradient overlay to improve text readability */}
        <LinearGradient
          colors={['rgba(249, 250, 251, 0.9)', 'rgba(249, 250, 251, 0.8)']}
          style={styles.gradientOverlay}
        >
          {/* Sticky header that appears on scroll */}
          <Animated.View 
            style={[
              styles.stickyHeaderContainer,
              {
                transform: [{ translateY: headerTranslateY }],
                opacity: searchOpacity
              }
            ]}
          >
            {/* Search bar */}
            <View style={styles.searchContainer}>
              <FontAwesome name="search" size={20} color={Colors.text.secondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for a dish..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={Colors.text.secondary}
                returnKeyType="search"
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <FontAwesome name="times-circle" size={20} color={Colors.text.secondary} />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Categories */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScrollContent}
            >
              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  !selectedCategory && styles.selectedCategory
                ]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[
                  styles.categoryText,
                  !selectedCategory && styles.selectedCategoryText
                ]}>
                  All
                </Text>
              </TouchableOpacity>
              {categories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    selectedCategory?.id === category.id && styles.selectedCategory
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={[
                    styles.categoryText,
                    selectedCategory?.id === category.id && styles.selectedCategoryText
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
          
          <Animated.ScrollView 
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {/* Header with title */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Brother Nook Menu</Text>
            </View>

            {/* Search Bar (initially visible in content) */}
            <View style={styles.inlineSearchContainer}>
              <FontAwesome name="search" size={20} color={Colors.text.secondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for a dish..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={Colors.text.secondary}
                returnKeyType="search"
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <FontAwesome name="times-circle" size={20} color={Colors.text.secondary} />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Categories (initially visible in content) */}
            <View style={styles.categoriesContainer}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesScrollContent}
              >
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    !selectedCategory && styles.selectedCategory
                  ]}
                  onPress={() => setSelectedCategory(null)}
                >
                  <Text style={[
                    styles.categoryText,
                    !selectedCategory && styles.selectedCategoryText
                  ]}>
                    All
                  </Text>
                </TouchableOpacity>
                {categories.map(category => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryButton,
                      selectedCategory?.id === category.id && styles.selectedCategory
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text style={[
                      styles.categoryText,
                      selectedCategory?.id === category.id && styles.selectedCategoryText
                    ]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Products Grid */}
            <Animated.View 
              style={[
                styles.productsContainer,
                { 
                  opacity: fadeAnim,
                  transform: [{ translateY: translateY }]
                }
              ]}
            >
              <Text style={styles.sectionTitle}>
                {selectedCategory ? selectedCategory.name : 'All Items'}
                {filteredProducts.length > 0 && <Text style={styles.resultCount}> ({filteredProducts.length})</Text>}
              </Text>
              
              {filteredProducts.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="search-off" size={64} color="#9CA3AF" />
                  <Text style={styles.emptyStateText}>No items found</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Try a different search term or category
                  </Text>
                </View>
              ) : (
                <View style={styles.productsGrid}>
                  {filteredProducts.map(product => (
                    <TouchableOpacity
                      key={product.id}
                      style={[
                        styles.productCardWrapper,
                        product.status === 'unavailable' && styles.unavailableCardWrapper
                      ]}
                      onPress={() => router.push(`/(product)/${product.id}`)}
                      activeOpacity={0.7}
                      disabled={product.status === 'unavailable'}
                    >
                      {/* Circular Image Card */}
                      <View 
                        style={[
                          styles.circularImageContainer,
                          product.status === 'unavailable' && { opacity: 0.5 }
                        ]}
                      >
                        {product.imageUrl ? (
                          <Image 
                            source={{ uri: product.imageUrl }} 
                            style={styles.circularImage}
                            onError={(e) => {
                              console.error('Error loading product image:', e.nativeEvent.error);
                            }}
                          />
                        ) : (
                          <View style={[styles.noImage, product.status === 'unavailable' && styles.unavailableNoImage]}>
                            <MaterialIcons 
                              name="image-not-supported" 
                              size={24} 
                              color={product.status === 'unavailable' ? "#D1D5DB" : "#9CA3AF"} 
                            />
                          </View>
                        )}
                        
                        {product.status === 'unavailable' && (
                          <View style={styles.unavailableOverlay}>
                            <Text style={styles.unavailableOverlayText}>Unavailable</Text>
                          </View>
                        )}
                        
                        {product.status === 'available' && (
                          <LinearGradient 
                            colors={['transparent', 'rgba(0,0,0,0.5)']}
                            style={styles.imageGradient}
                            start={[0, 0.6]}
                            end={[0, 1]}
                          />
                        )}
                      </View>
                      
                      {/* Product Name Below the Card */}
                      <Text 
                        style={[
                          styles.productName, 
                          product.status === 'unavailable' && styles.unavailableText
                        ]} 
                        numberOfLines={2}
                      >
                        {product.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Animated.View>
          </Animated.ScrollView>

          {/* Floating Cart Button */}
          {cartItemCount > 0 && (
            <Animated.View
              style={[
                styles.cartButtonContainer,
                { 
                  transform: [
                    { scale: Animated.multiply(cartButtonScale, cartPulse) }
                  ] 
                }
              ]}
            >
              <TouchableOpacity 
                style={styles.cartButton}
                onPress={() => {
                  animateCartButton();
                  router.push('/cart');
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#F36514', '#F36514']}
                  style={{
                    width: '100%',
                    height: '100%',
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                  }}
                  start={[0, 0]}
                  end={[1, 1]}
                >
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 16,
                  }}>
                    <FontAwesome name="shopping-cart" size={22} color={Colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: 'bold',
                    }}>View Cart</Text>
                    <Text style={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: 13,
                      marginTop: 3,
                    }}>{cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}</Text>
                  </View>
                  <View style={{
                    width: 24,
                    height: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <FontAwesome name="angle-right" size={20} color={Colors.white} />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  backgroundPattern: {
    flex: 1,
    width: '100%',
  },
  gradientOverlay: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Add padding for the cart button
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  stickyHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(249, 250, 251, 0.98)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    paddingBottom: Spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 50,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    ...Shadows.small,
  },
  inlineSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 50,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
    height: 50,
  },
  categoriesContainer: {
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
  },
  categoriesScrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    paddingHorizontal: Spacing.md,
    marginBottom: 12,
  },
  resultCount: {
    fontWeight: 'normal',
    color: Colors.text.secondary,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  selectedCategory: {
    backgroundColor: Colors.primary,
    ...Shadows.small,
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  selectedCategoryText: {
    color: Colors.white,
  },
  productsContainer: {
    flex: 1,
    paddingTop: 8,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  productCardWrapper: {
    width: PRODUCT_CARD_WIDTH,
    marginBottom: 24,
    alignItems: 'center',
  },
  unavailableCardWrapper: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }], // Slightly smaller to indicate less importance
  },
  circularImageContainer: {
    position: 'relative',
    width: PRODUCT_CARD_WIDTH - 20,
    height: PRODUCT_CARD_WIDTH - 20,
    borderRadius: (PRODUCT_CARD_WIDTH - 20) / 2,
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
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    width: PRODUCT_CARD_WIDTH - 10,
    marginTop: 6,
  },
  unavailableText: {
    color: '#6B7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  cartButtonContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    left: 24,
    alignItems: 'center',
    zIndex: 10,
  },
  cartButton: {
    width: '100%',
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    ...Shadows.medium,
    elevation: 8, // Enhanced elevation for better pop effect
  },
});
