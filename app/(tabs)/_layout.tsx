import { Tabs, Link } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { TouchableOpacity, View, Text, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Badge, useTheme as usePaperTheme } from 'react-native-paper';
import { useTheme } from '../../contexts/theme';

// Get the correct type for FontAwesome icon names
type FontAwesomeIconName = React.ComponentProps<typeof FontAwesome>['name'];

// This would normally come from your global state management
const useCartItems = () => {
  const [count, setCount] = useState(0);
  return { count };
};

export default function TabLayout() {
  const router = useRouter();
  const { count } = useCartItems();

  const CartButton = () => (
    <Link href="/cart" asChild>
      <TouchableOpacity
        style={{
          marginRight: 15,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View style={{ position: 'relative' }}>
          <FontAwesome name="shopping-basket" size={24} color={Colors.primary} />
          {count > 0 && (
            <View
              style={{
                position: 'absolute',
                top: -8,
                right: -8,
                backgroundColor: Colors.primary,
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                {count}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Link>
  );

  // Custom tab bar icon renderer that ensures both icon and label are visible on web
  const renderTabBarIcon = (name: FontAwesomeIconName, label: string, color: string) => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.webTabContainer}>
          <FontAwesome name={name} size={24} color={color} />
          <Text style={[styles.webTabLabel, { color }]}>{label}</Text>
        </View>
      );
    }
    return <FontAwesome name={name} size={24} color={color} />;
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: Colors.lightGray,
          paddingBottom: 10,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: 5,
          // Ensure labels are visible on web
          display: Platform.OS === 'web' ? 'flex' : undefined,
          opacity: Platform.OS === 'web' ? 1 : undefined,
        },
        tabBarIconStyle: {
          marginTop: .2,
        },
        headerRight: () => <CartButton />,
        // Add this to ensure labels show on web
        tabBarShowLabel: Platform.OS !== 'web', // We're handling labels manually for web
      }}
    >
      <Tabs.Screen
        name="index" 
        options={{
          headerShown: false,
          title: 'Home',
          tabBarIcon: ({ color }) => renderTabBarIcon('home', 'Home', color),
        }}
      />
      <Tabs.Screen
        name="my-order"
        options={{
          title: 'My Order',
          headerShown: false,
          tabBarIcon: ({ color }) => renderTabBarIcon('list-ul', 'MyOrder', color),
        }}
      />
      <Tabs.Screen
        name="order"
        options={{
          title: 'Order',
          headerShown: false,
          tabBarIcon: ({ color }) => renderTabBarIcon('coffee', 'Order', color),
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color }) => renderTabBarIcon('user', 'Profile', color),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  webTabContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  webTabLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  }
});
