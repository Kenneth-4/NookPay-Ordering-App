import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEY = 'auth_token';

export const getStorageItem = async (key: string = STORAGE_KEY) => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error('Error getting storage item:', error);
    return null;
  }
};

export const setStorageItem = async (key: string, value: string) => {
  try {
    console.log(`Storing data for key: ${key}`);
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.error('Error setting storage item:', error);
  }
};

export const removeStorageItem = async (key: string = STORAGE_KEY) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing storage item:', error);
  }
};