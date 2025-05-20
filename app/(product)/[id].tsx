import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
  ImageBackground,
  Platform,
  Modal,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from '../../constants/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useCart } from '../../contexts/cart';
import { useAuth } from '../../contexts/auth';
import { BlurView } from 'expo-blur';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_WIDTH * 0.8;

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

// Define interface for styles
interface Styles {
  container: ViewStyle;
  backgroundPattern: ViewStyle;
  gradientOverlay: ViewStyle;
  loadingContainer: ViewStyle;
  loadingText: TextStyle;
  scrollView: ViewStyle;
  imageContainer: ViewStyle;
  productImage: ImageStyle;
  noImage: ViewStyle;
  imageGradientTop: ViewStyle;
  backButton: ViewStyle;
  blurButton: ViewStyle;
  contentContainer: ViewStyle;
  productName: TextStyle;
  descriptionContainer: ViewStyle;
  sectionTitle: TextStyle;
  productDescription: TextStyle;
  sizesContainer: ViewStyle;
  sizeButtons: ViewStyle;
  sizeButton: ViewStyle;
  selectedSizeButton: ViewStyle;
  sizeButtonText: TextStyle;
  selectedSizeButtonText: TextStyle;
  sizePriceText: TextStyle;
  selectedSizePriceText: TextStyle;
  errorContainer: ViewStyle;
  errorText: TextStyle;
  backToMenuButton: ViewStyle;
  backToMenuText: TextStyle;
  quantitySection: ViewStyle;
  quantityControls: ViewStyle;
  quantityButton: ViewStyle;
  quantityButtonDisabled: ViewStyle;
  quantityText: TextStyle;
  totalSection: ViewStyle;
  totalLabel: TextStyle;
  totalPrice: TextStyle;
  bottomBar: ViewStyle;
  addToCartButton: ViewStyle;
  addToCartGradient: ViewStyle;
  cartIcon: TextStyle;
  addToCartText: TextStyle;
  unavailableBanner: ViewStyle;
  unavailableBannerText: TextStyle;
  // Modal styles
  modalOverlay: ViewStyle;
  successModalContainer: ViewStyle;
  successModalContent: ViewStyle;
  successIconContainer: ViewStyle;
  successIconGradient: ViewStyle;
  successTitle: TextStyle;
  successButton: ViewStyle;
  successButtonGradient: ViewStyle;
  successButtonText: TextStyle;
}

export default function ProductScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [imageError, setImageError] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [addingToCart, setAddingToCart] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const { addItem } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const productDoc = await getDoc(doc(db, 'products', id as string));
        if (productDoc.exists()) {
          const productData = { id: productDoc.id, ...productDoc.data() } as Product;
          setProduct(productData);
          // If product has sizes, select the first size by default
          if (productData.hasSizes && productData.sizes) {
            const firstSize = Object.keys(productData.sizes)[0];
            if (firstSize) {
              setSelectedSize(firstSize);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleAddToCart = async () => {
    if (!user) {
      // Show the login modal instead of alert
      setLoginModalVisible(true);
      return;
    }

    if (!product) return;
    
    // For products with sizes, require size selection
    if (product.hasSizes && !selectedSize) {
      if (Platform.OS === 'web') {
        window.alert('Please select a size');
      } else {
        Alert.alert("Please select a size");
      }
      return;
    }

    setAddingToCart(true);
    try {
      const cartItem = {
        id: Math.random().toString(),
        productId: product.id,
        name: product.hasSizes && selectedSize ? `${product.name} (${selectedSize})` : product.name,
        price: parseFloat(
          product.hasSizes && selectedSize 
            ? product.sizes?.[selectedSize]?.price || '0'
            : product.price
        ),
        image: product.imageUrl,
        quantity: quantity,
        size: product.hasSizes ? selectedSize : undefined,
        addOns: {},
        totalPrice: parseFloat(
          product.hasSizes && selectedSize 
            ? product.sizes?.[selectedSize]?.price || '0'
            : product.price
        ) * quantity,
      };
      
      // Add artificial delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      addItem(cartItem);

      // Add another small delay before showing success message
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Show success modal instead of alert
      setSuccessModalVisible(true);
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert('Failed to add item to cart');
      } else {
        Alert.alert("Error", "Failed to add item to cart");
      }
    } finally {
      setAddingToCart(false);
    }
  };

  // Handle modal close and navigation
  const handleSuccessModalClose = () => {
    setSuccessModalVisible(false);
    router.back();
  };

  // Format price from string to proper currency format
  const formatPrice = (price: string) => {
    if (typeof price !== 'string' || price === '') {
      return '₱0.00';
    }
    
    const parsedPrice = parseFloat(price);
    
    if (isNaN(parsedPrice)) {
      return '₱0.00';
    }
    
    return `₱${parsedPrice.toFixed(2)}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ImageBackground 
          source={{ uri: 'https://www.gardendesign.com/pictures/images/675x529Max/site_3/purple-bell-vine-rhodochiton-atrosanguineus-garden-design_16514.jpg' }} 
          style={styles.backgroundPattern}
          imageStyle={{ opacity: 0.08 }}
          resizeMode="repeat"
        >
          <LinearGradient
            colors={['rgba(249, 250, 251, 0.9)', 'rgba(249, 250, 251, 0.8)']}
            style={styles.gradientOverlay}
          >
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading product details...</Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <ImageBackground 
          source={{ uri: 'https://www.gardendesign.com/pictures/images/675x529Max/site_3/purple-bell-vine-rhodochiton-atrosanguineus-garden-design_16514.jpg' }} 
          style={styles.backgroundPattern}
          imageStyle={{ opacity: 0.08 }}
          resizeMode="repeat"
        >
          <LinearGradient
            colors={['rgba(249, 250, 251, 0.9)', 'rgba(249, 250, 251, 0.8)']}
            style={styles.gradientOverlay}
          >
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={64} color="#9CA3AF" />
              <Text style={styles.errorText}>Product not found</Text>
              <TouchableOpacity 
                style={styles.backToMenuButton}
                onPress={() => router.push('/(tabs)/order')}
              >
                <Text style={styles.backToMenuText}>Back to Menu</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground 
        source={{ uri: 'https://www.gardendesign.com/pictures/images/675x529Max/site_3/purple-bell-vine-rhodochiton-atrosanguineus-garden-design_16514.jpg' }} 
        style={styles.backgroundPattern}
        imageStyle={{ opacity: 0.08 }}
        resizeMode="repeat"
      >
        <LinearGradient
          colors={['rgba(249, 250, 251, 0.9)', 'rgba(249, 250, 251, 0.8)']}
          style={styles.gradientOverlay}
        >
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.imageContainer}>
              {product.imageUrl && !imageError ? (
                <Image 
                  source={{ uri: product.imageUrl }}
                  style={styles.productImage}
                  resizeMode="cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <View style={[styles.productImage as ViewStyle, styles.noImage]}>
                  <MaterialIcons name="image-not-supported" size={48} color="#9CA3AF" />
                </View>
              )}
              <LinearGradient
                colors={['rgba(0,0,0,0.7)', 'transparent']}
                style={styles.imageGradientTop}
                start={[0, 0]}
                end={[0, 1]}
              />
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <BlurView intensity={60} style={styles.blurButton}>
                  <FontAwesome name="arrow-left" size={20} color="#FFFFFF" />
                </BlurView>
              </TouchableOpacity>

              {product.status === 'unavailable' && (
                <View style={styles.unavailableBanner}>
                  <Text style={styles.unavailableBannerText}>Currently Unavailable</Text>
                </View>
              )}
            </View>
            
            <View style={styles.contentContainer}>
              <Text style={styles.productName}>{product.name}</Text>

              {product.description && (
                <View style={styles.descriptionContainer}>
                  <Text style={styles.sectionTitle}>Description</Text>
                  <Text style={styles.productDescription}>{product.description}</Text>
                </View>
              )}

              {product.hasSizes && (
                <View style={styles.sizesContainer}>
                  <Text style={styles.sectionTitle}>Size</Text>
                  <View style={styles.sizeButtons}>
                    {Object.entries(product.sizes || {}).map(([size, { price }]) => (
                      <TouchableOpacity
                        key={size}
                        style={[
                          styles.sizeButton,
                          selectedSize === size && styles.selectedSizeButton
                        ]}
                        onPress={() => setSelectedSize(size)}
                      >
                        <Text style={[
                          styles.sizeButtonText,
                          selectedSize === size && styles.selectedSizeButtonText
                        ]}>
                          {size}
                        </Text>
                        <Text style={[
                          styles.sizePriceText,
                          selectedSize === size && styles.selectedSizePriceText
                        ]}>
                          {formatPrice(price)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {product.status === 'available' && (
                <>
                  <View style={styles.quantitySection}>
                    <Text style={styles.sectionTitle}>Quantity</Text>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity 
                        style={[styles.quantityButton, quantity <= 1 && styles.quantityButtonDisabled]}
                        onPress={() => quantity > 1 && setQuantity(q => q - 1)}
                        disabled={quantity <= 1}
                      >
                        <FontAwesome name="minus" size={16} color={quantity <= 1 ? Colors.text.light : Colors.text.primary} />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{quantity}</Text>
                      <TouchableOpacity 
                        style={styles.quantityButton}
                        onPress={() => setQuantity(q => q + 1)}
                      >
                        <FontAwesome name="plus" size={16} color={Colors.text.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.totalSection}>
                    <Text style={styles.totalLabel}>Total Amount</Text>
                    {(!product.hasSizes || (product.hasSizes && selectedSize)) && (
                      <Text style={styles.totalPrice}>{formatPrice(
                        (parseFloat(
                          product.hasSizes && selectedSize 
                            ? product.sizes?.[selectedSize]?.price || '0'
                            : product.price
                        ) * quantity).toString()
                      )}</Text>
                    )}
                  </View>
                </>
              )}
            </View>
          </ScrollView>

          {product.status === 'available' && (
            <View style={styles.bottomBar}>
              <TouchableOpacity 
                style={styles.addToCartButton}
                onPress={handleAddToCart}
                disabled={addingToCart}
              >
                <LinearGradient
                  colors={['#F36514', '#F36514']}
                  style={styles.addToCartGradient}
                  start={[0, 0]}
                  end={[1, 0]}
                >
                  {addingToCart ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <FontAwesome name="shopping-cart" size={18} color="#FFFFFF" style={styles.cartIcon} />
                      <Text style={styles.addToCartText}>Add to Cart</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Success Modal */}
          <Modal
            visible={successModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={handleSuccessModalClose}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.successModalContainer}>
                <View style={styles.successModalContent}>
                  <View style={styles.successIconContainer}>
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      style={styles.successIconGradient}
                      start={[0, 0]}
                      end={[1, 1]}
                    >
                      <FontAwesome name="check" size={40} color="#FFFFFF" />
                    </LinearGradient>
                  </View>
                  
                  <Text style={styles.successTitle}>
                    Item Added to Cart!
                  </Text>
                  
                  <TouchableOpacity
                    style={styles.successButton}
                    onPress={handleSuccessModalClose}
                  >
                    <LinearGradient
                      colors={['#F36514', '#F8943F']}
                      style={styles.successButtonGradient}
                      start={[0, 0]}
                      end={[1, 0]}
                    >
                      <Text style={styles.successButtonText}>
                        OK
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Login Required Modal */}
          <Modal
            visible={loginModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setLoginModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.successModalContainer}>
                <View style={styles.successModalContent}>
                  <View style={styles.successIconContainer}>
                    <LinearGradient
                      colors={['#4F46E5', '#3730A3']}
                      style={styles.successIconGradient}
                      start={[0, 0]}
                      end={[1, 1]}
                    >
                      <FontAwesome name="user" size={40} color="#FFFFFF" />
                    </LinearGradient>
                  </View>
                  
                  <Text style={[styles.successTitle, { color: '#4F46E5' }]}>
                    Login Required
                  </Text>
                  
                  <Text style={{
                    fontSize: 16,
                    color: Colors.text.secondary,
                    textAlign: 'center',
                    marginBottom: 24,
                  }}>
                    Please login to add items to your cart
                  </Text>
                  
                  <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
                    <TouchableOpacity
                      style={[styles.successButton, { width: '48%' }]}
                      onPress={() => setLoginModalVisible(false)}
                    >
                      <LinearGradient
                        colors={['#9CA3AF', '#6B7280']}
                        style={styles.successButtonGradient}
                        start={[0, 0]}
                        end={[1, 0]}
                      >
                        <Text style={styles.successButtonText}>
                          Cancel
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.successButton, { width: '48%' }]}
                      onPress={() => {
                        setLoginModalVisible(false);
                        router.push('/(auth)/sign-in');
                      }}
                    >
                      <LinearGradient
                        colors={['#F36514', '#F8943F']}
                        style={styles.successButtonGradient}
                        start={[0, 0]}
                        end={[1, 0]}
                      >
                        <Text style={styles.successButtonText}>
                          Login
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </Modal>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create<Styles>({
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  backToMenuButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.md,
  },
  backToMenuText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: IMAGE_HEIGHT,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imageGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  noImage: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  blurButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  unavailableBanner: {
    position: 'absolute',
    top: 20,
    right: 0,
    backgroundColor: 'rgba(220, 38, 38, 0.8)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  unavailableBannerText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  descriptionContainer: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  productDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.text.secondary,
  },
  sizesContainer: {
    marginBottom: Spacing.lg,
  },
  sizeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sizeButton: {
    minWidth: 80,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  selectedSizeButton: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
  },
  sizeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  selectedSizeButtonText: {
    color: Colors.primary,
  },
  sizePriceText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  selectedSizePriceText: {
    color: Colors.primary,
  },
  quantitySection: {
    marginBottom: Spacing.lg,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    width: 50,
    textAlign: 'center',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addToCartButton: {
    height: 56,
    borderRadius: 15,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  addToCartGradient: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartIcon: {
    marginRight: 10,
  },
  addToCartText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  successButton: {
    width: '100%',
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
});
