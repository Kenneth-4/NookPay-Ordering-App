import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { Colors } from '../constants/theme';
import QRCode from 'react-native-qrcode-svg';

interface MobileOnlyMessageProps {
  message?: string;
  appLink?: string;
}

const MobileOnlyMessage: React.FC<MobileOnlyMessageProps> = ({ 
  message = "This application is designed for mobile devices only",
  appLink = "https://www.nook-pay.com/"
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.messageContainer}>
        <Image 
          source={require('../assets/images/nook.png')} 
          style={styles.icon}
          // Fallback in case the image doesn't exist
          onError={(e) => console.log('Image not found, using text only')}
        />
        <Text style={styles.title}>Mobile Only Application</Text>
        <Text style={styles.message}>{message}</Text>
        <Text style={styles.instruction}>Please open this app on your smartphone or tablet device.</Text>
        <View style={styles.divider} />
        <Text style={styles.scanText}>Or scan this QR code with your mobile device:</Text>
        <View style={styles.qrContainer}>
          <QRCode
            value={appLink}
            size={150}
            color={Colors.text.primary || '#000'}
            backgroundColor="#ffffff"
          />
        </View>
        <Text style={styles.linkText}>{appLink}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background || '#f5f5f5',
    padding: 20,
    height: Dimensions.get('window').height,
    width: Dimensions.get('window').width,
  },
  messageContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 30,
    alignItems: 'center',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  icon: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: Colors.primary,
    textAlign: 'center',
  },
  message: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    color: Colors.text.primary,
  },
  instruction: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: Colors.text.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    width: '100%',
    marginBottom: 20,
  },
  scanText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: Colors.text.secondary,
  },
  qrContainer: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  linkText: {
    fontSize: 14,
    color: Colors.primary,
    textAlign: 'center',
  }
});

export default MobileOnlyMessage; 