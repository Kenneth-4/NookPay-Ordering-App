import { View, Text, StyleSheet, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

export default function PaymentStatus() {
  const { status } = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (status === 'success') {
      if (Platform.OS === 'web') {
        window.alert('Payment Successful\nYour order has been placed successfully!');
        window.location.href = '/(tabs)/my-order';
      } else {
        Alert.alert(
          'Payment Successful',
          'Your order has been placed successfully!',
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
      if (Platform.OS === 'web') {
        window.alert('Payment Failed\nYour payment was not successful. Please try again.');
        window.location.href = '/(tabs)/cart';
      } else {
        Alert.alert(
          'Payment Failed',
          'Your payment was not successful. Please try again.',
          [
            {
              text: 'Return to Cart',
              onPress: () => router.push('/(tabs)/cart'),
            },
          ]
        );
      }
    }
  }, [status]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {status === 'success' ? 'Processing your payment...' : 'Payment failed'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
    color: '#333',
  },
});
