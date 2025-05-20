import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadows, FontSizes } from '../../constants/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { collection, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width / 2 - 16;

interface Product {
  id: string;
  categoryId: string;
  name: string;
  price: string;
  imageUrl: string;
  description: string;
  status: 'available' | 'unavailable';
}

interface Category {
  id: string;
  name: string;
}

export default function CategoryScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Fetch the category name
    const fetchCategory = async () => {
      try {
        const categoryDoc = await getDoc(doc(db, 'categories', id as string));
        if (categoryDoc.exists()) {
          setCategory({ id: categoryDoc.id, ...categoryDoc.data() } as Category);
        }
      } catch (error) {
        console.error('Error fetching category:', error);
      }
    };

    fetchCategory();

    // Fetch products in this category
    const q = query(
      collection(db, 'products'),
      where('categoryId', '==', id)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const productsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
        setProducts(productsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching products:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <Text style={styles.loadingText}>Loading products...</Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <FontAwesome name="arrow-left" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
            <View style={styles.searchContainer}>
              <FontAwesome name="search" size={20} color={Colors.text.secondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search items..."
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
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.categoryTitle}>{category?.name || 'Category'}</Text>
            <Text style={styles.resultCount}>{filteredProducts.length} items</Text>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              {filteredProducts.map(product => (
                <TouchableOpacity
                  key={product.id}
                  style={[
                    styles.card,
                    product.status === 'unavailable' && styles.unavailableCard
                  ]}
                  onPress={() => router.push(`/(product)/${product.id}`)}
                  activeOpacity={0.7}
                  disabled={product.status === 'unavailable'}
                >
                  <View style={[
                    styles.imageContainer,
                    product.status === 'unavailable' && styles.imageContainerUnavailable
                  ]}>
                    {product.imageUrl && !imageErrors[product.id] ? (
                      <Image 
                        source={{ uri: product.imageUrl }} 
                        style={styles.image}
                        onError={() => {
                          setImageErrors(prev => ({
                            ...prev,
                            [product.id]: true
                          }));
                        }}
                      />
                    ) : (
                      <View style={[styles.image, styles.noImage]}>
                        <MaterialIcons name="image-not-supported" size={24} color={Colors.gray} />
                      </View>
                    )}
                    {product.status === 'unavailable' && (
                      <View style={styles.unavailableOverlay}>
                        <Text style={styles.unavailableText}>Unavailable</Text>
                      </View>
                    )}
                    {product.status === 'available' && (
                      <LinearGradient 
                        colors={['transparent', 'rgba(0,0,0,0.3)']}
                        style={styles.imageGradient}
                        start={[0, 0.6]}
                        end={[0, 1]}
                      />
                    )}
                  </View>
                  <View style={styles.info}>
                    <Text 
                      style={[
                        styles.name, 
                        product.status === 'unavailable' && styles.unavailableText
                      ]} 
                      numberOfLines={2}
                    >
                      {product.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </LinearGradient>
      </ImageBackground>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    backgroundColor: Colors.white,
    ...Shadows.small,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
    ...Shadows.small,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text.primary,
    height: 48,
  },
  titleContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  categoryTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  resultCount: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  content: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  card: {
    width: CARD_WIDTH,
    marginBottom: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    ...Shadows.small,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    transform: [{ scale: 1 }],
  },
  unavailableCard: {
    backgroundColor: '#F9FAFB',
    opacity: 0.9,
    borderColor: '#E5E7EB',
    transform: [{ scale: 0.98 }],
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
  },
  imageContainerUnavailable: {
    opacity: 0.5,
  },
  image: {
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
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
  unavailableText: {
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
  info: {
    padding: Spacing.md,
    paddingTop: 14,
    paddingBottom: 14,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    minHeight: 40,
  },
});
