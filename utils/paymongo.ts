import axios from 'axios';
import { Platform } from 'react-native';

const PAYMONGO_API_URL = 'https://api.paymongo.com/v1';
const PAYMONGO_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY;
const PAYMONGO_SECRET_KEY = process.env.EXPO_PUBLIC_PAYMONGO_SECRET_KEY;

// Base64 encode function for React Native
const base64Encode = (str: string): string => {
  try {
    return btoa(str);
  } catch (error) {
    console.error('Base64 encoding error:', error);
    throw error;
  }
};

interface PaymentSource {
  id: string;
  type: string;
  attributes: {
    amount: number;
    billing: any;
    currency: string;
    livemode: boolean;
    redirect: {
      checkout_url: string;
      success: string;
      failed: string;
    };
    status: string;
    type: string;
  };
}

interface PaymentIntent {
  id: string;
  attributes: {
    amount: number;
    currency: string;
    payment_method_allowed: string[];
    status: string;
    client_key: string;
  };
}

interface PaymentMethod {
  id: string;
  type: string;
  attributes: {
    billing: any;
    details: any;
    metadata: any;
    type: string;
  };
}

export const createPaymentSource = async (
  amount: number, 
  successUrl: string, 
  failedUrl: string, 
  paymentType: string = 'gcash',
  customerInfo?: {
    name: string;
    email: string;
    phone: string;
  }
) => {
  try {
    console.log('Creating payment source with:', {
      amount,
      successUrl,
      failedUrl,
      currency: 'PHP',
      type: paymentType,
      customerInfo
    });

    if (!PAYMONGO_SECRET_KEY) {
      throw new Error('PayMongo secret key is not configured');
    }

    const encodedKey = base64Encode(`${PAYMONGO_SECRET_KEY}:`);
    
    // Create more complete billing details
    // This is especially important for bank payments and live mode
    const billingInfo = {
      name: customerInfo?.name || 'Customer Name',
      email: customerInfo?.email || 'customer@example.com',
      phone: customerInfo?.phone || '09123456789',
      address: {
        line1: 'Test Address Line 1',
        line2: 'Test Address Line 2',
        city: 'Manila',
        state: 'Metro Manila',
        postal_code: '1000',
        country: 'PH'
      }
    };

    const payload = {
      data: {
        attributes: {
          amount: Math.round(amount * 100), // Convert to cents
          redirect: {
            success: ensureAbsoluteUrl(successUrl),
            failed: ensureAbsoluteUrl(failedUrl),
          },
          billing: billingInfo,
          type: paymentType,
          currency: 'PHP',
        },
      },
    };

    console.log('Request payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post(
      `${PAYMONGO_API_URL}/sources`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${encodedKey}`,
        },
      }
    );

    console.log('Payment source created successfully:', response.data);
    return response.data.data as PaymentSource;
  } catch (error) {
    console.error('Error creating payment source:', error);
    if (axios.isAxiosError(error)) {
      console.error('Full error response:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          data: error.config?.data,
        }
      });
      
      // Provide more helpful error details
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        console.error('PayMongo API errors:', errors);
        
        // Format a detailed error message
        const errorMessages = errors.map((err: any) => {
          return `${err.detail || 'Unknown error'} (${err.code || 'no code'})`;
        }).join(', ');
        
        throw new Error(`PayMongo API Error: ${errorMessages}`);
      }
    }
    throw error;
  }
};

export const createPayment = async (sourceId: string, amount: number) => {
  try {
    if (!PAYMONGO_SECRET_KEY) {
      throw new Error('PayMongo secret key is not configured');
    }

    const encodedKey = base64Encode(`${PAYMONGO_SECRET_KEY}:`);
    
    const payload = {
      data: {
        attributes: {
          amount: Math.round(amount * 100),
          source: {
            id: sourceId,
            type: 'source'
          },
          currency: 'PHP',
          description: 'Payment for order'
        }
      }
    };

    console.log('Creating payment with payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post(
      `${PAYMONGO_API_URL}/payments`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${encodedKey}`,
        },
      }
    );

    console.log('Payment created successfully:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('Error creating payment:', error);
    if (axios.isAxiosError(error)) {
      console.error('Full error response:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
      });
    }
    throw error;
  }
};

export const getPaymentStatus = async (sourceId: string) => {
  try {
    if (!PAYMONGO_SECRET_KEY) {
      throw new Error('PayMongo secret key is not configured');
    }

    const encodedKey = base64Encode(`${PAYMONGO_SECRET_KEY}:`);
    
    console.log('Checking payment status for source:', sourceId);

    const response = await axios.get(`${PAYMONGO_API_URL}/sources/${sourceId}`, {
      headers: {
        Authorization: `Basic ${encodedKey}`,
      },
    });

    console.log('Payment status response:', response.data);
    return response.data.data.attributes.status;
  } catch (error) {
    console.error('Error getting payment status:', error);
    if (axios.isAxiosError(error)) {
      console.error('Full error response:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
      });
    }
    throw error;
  }
};

// Add a helper function to check if we're using live keys
export const isLiveMode = (): boolean => {
  // Check if the secret key contains 'live_' prefix which indicates a live key
  return PAYMONGO_SECRET_KEY?.startsWith('live_') ?? false;
};

// Interface for Checkout Session response
interface CheckoutSession {
  id: string;
  type: string;
  attributes: {
    billing: any;
    checkout_url: string;
    client_key: string;
    description: string;
    line_items: any[];
    payment_intent: any;
    payment_method_types: string[];
    reference_number: string;
    send_email_receipt: boolean;
    show_description: boolean;
    show_line_items: boolean;
    status: string;
    success_url: string;
    created_at: number;
    updated_at: number;
    metadata: any;
  };
}

// Ensure we're using absolute URLs for success and failed redirects
const ensureAbsoluteUrl = (url: string, sessionId?: string) => {
  // For mobile and web, use a static success/failure page
  if (url.includes('payment/success')) {
    return `https://redirect-pages-u3lg-git-main-kenneth-4s-projects.vercel.app/success.html?session=${sessionId || ''}`;
  } else if (url.includes('payment/failed')) {
    return `https://redirect-pages-u3lg-git-main-kenneth-4s-projects.vercel.app/failed.html?session=${sessionId || ''}`;
  }
  
  // Fallback for any other URLs
  return url;
};

// Create a checkout session using the Checkout API
export const createCheckoutSession = async (
  amount: number,
  successUrl: string,
  failedUrl: string,
  customerInfo?: {
    name: string;
    email: string;
    phone: string;
  },
  paymentMethodTypes: string[] = ['card', 'gcash', 'paymaya', 'grab_pay']
) => {
  try {
    console.log('Creating checkout session with:', {
      amount,
      successUrl,
      failedUrl,
      customerInfo,
      paymentMethodTypes
    });

    if (!PAYMONGO_SECRET_KEY) {
      throw new Error('PayMongo secret key is not configured');
    }

    const encodedKey = base64Encode(`${PAYMONGO_SECRET_KEY}:`);
    
    // Generate a unique reference number for this order
    const referenceNumber = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Create billing information
    const billingInfo = customerInfo ? {
      name: customerInfo.name,
      email: customerInfo.email,
      phone: customerInfo.phone,
      address: {
        line1: 'Test Address Line 1',
        line2: 'Test Address Line 2',
        city: 'Manila',
        state: 'Metro Manila',
        postal_code: '1000',
        country: 'PH'
      }
    } : undefined;

    const payload = {
      data: {
        attributes: {
          description: "Payment for Food Order",
          line_items: [
            {
              name: "Food Order",
              quantity: 1,
              amount: Math.round(amount * 100), // Convert to cents
              currency: "PHP",
            }
          ],
          payment_method_types: paymentMethodTypes,
          success_url: ensureAbsoluteUrl(successUrl, referenceNumber),
          cancel_url: ensureAbsoluteUrl(failedUrl, referenceNumber),
          billing: billingInfo,
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          reference_number: referenceNumber,
          metadata: {
            order_id: referenceNumber,
            app_scheme: 'nookapp'
          }
        }
      }
    };

    console.log('Request payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post(
      `${PAYMONGO_API_URL}/checkout_sessions`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${encodedKey}`,
        },
      }
    );

    console.log('Checkout session created successfully:', response.data);
    return response.data.data as CheckoutSession;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    if (axios.isAxiosError(error)) {
      console.error('Full error response:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          data: error.config?.data,
        }
      });
      
      // Provide more helpful error details
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        console.error('PayMongo API errors:', errors);
        
        // Format a detailed error message
        const errorMessages = errors.map((err: any) => {
          return `${err.detail || 'Unknown error'} (${err.code || 'no code'})`;
        }).join(', ');
        
        throw new Error(`PayMongo API Error: ${errorMessages}`);
      }
    }
    throw error;
  }
};

// Get the status of a checkout session
export const retrieveCheckoutSession = async (checkoutSessionId: string) => {
  try {
    if (!PAYMONGO_SECRET_KEY) {
      throw new Error('PayMongo secret key is not configured');
    }

    const encodedKey = base64Encode(`${PAYMONGO_SECRET_KEY}:`);
    
    console.log('Retrieving checkout session:', checkoutSessionId);

    const response = await axios.get(
      `${PAYMONGO_API_URL}/checkout_sessions/${checkoutSessionId}`,
      {
        headers: {
          Authorization: `Basic ${encodedKey}`,
        },
      }
    );

    console.log('Checkout session retrieved:', response.data);
    return response.data.data as CheckoutSession;
  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    if (axios.isAxiosError(error)) {
      console.error('Full error response:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
      });
    }
    throw error;
  }
};
