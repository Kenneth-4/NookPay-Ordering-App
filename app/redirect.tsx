import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Linking, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native-paper';

export default function RedirectPage() {
  const { to } = useLocalSearchParams<{ to: string }>();
  const [status, setStatus] = useState<'redirecting' | 'success' | 'error'>('redirecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        if (to) {
          console.log('Redirect: Received deep link to redirect to:', to);
          
          // Small delay to ensure the page has loaded
          setTimeout(async () => {
            try {
              const canOpen = await Linking.canOpenURL(to);
              console.log('Redirect: Can open URL:', canOpen, to);
              
              if (canOpen) {
                // For Android, we need a bit longer delay to ensure it works properly
                if (Platform.OS === 'android') {
                  await new Promise(resolve => setTimeout(resolve, 800));
                }
                
                await Linking.openURL(to);
                setStatus('success');
              } else {
                console.error('Cannot open URL:', to);
                setStatus('error');
                setErrorMessage(`Cannot open URL: ${to}`);
              }
            } catch (openError) {
              console.error('Error opening URL:', openError);
              setStatus('error');
              setErrorMessage(`Error opening URL: ${openError instanceof Error ? openError.message : String(openError)}`);
            }
          }, 600);
        } else {
          setStatus('error');
          setErrorMessage('No redirect URL provided');
        }
      } catch (error) {
        console.error('Error redirecting:', error);
        setStatus('error');
        setErrorMessage(`Error redirecting: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    handleRedirect();
  }, [to]);

  return (
    <View style={styles.container}>
      {status === 'redirecting' && (
        <>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.text}>Redirecting back to app...</Text>
        </>
      )}
      
      {status === 'success' && (
        <>
          <Text style={styles.text}>Redirected successfully!</Text>
          <Text style={styles.subText}>You can close this window and return to the app.</Text>
        </>
      )}
      
      {status === 'error' && (
        <>
          <Text style={styles.errorText}>Error redirecting</Text>
          {errorMessage && <Text style={styles.errorMessage}>{errorMessage}</Text>}
          <Text style={styles.subText}>Please close this window and open the NookPay app manually.</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF8F0',
  },
  text: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#222',
  },
  subText: {
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
  },
  errorText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#E11D48',
  },
  errorMessage: {
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
    color: '#E11D48',
    padding: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    maxWidth: '90%',
  },
}); 