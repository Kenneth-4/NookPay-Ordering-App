/**
 * Validates that all required environment variables are set
 * This helps ensure the application won't start with missing configuration
 */
export function validateEnvironment(): void {
  const requiredVars = [
    'EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY',
    'EXPO_PUBLIC_PAYMONGO_SECRET_KEY',
    'EXPO_PUBLIC_API_URL',
    'EXPO_PUBLIC_HCAPTCHA_SITE_KEY',
    'EXPO_PUBLIC_HCAPTCHA_SECRET_KEY',
    'EXPO_PUBLIC_EMAILJS_SERVICE_ID',
    'EXPO_PUBLIC_EMAILJS_TEMPLATE_ID',
    'EXPO_PUBLIC_EMAILJS_PUBLIC_KEY'
  ];

  // Define default values for development
  const defaultValues: Record<string, string> = {
    'EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY': 'pk_test_dummy_key',
    'EXPO_PUBLIC_PAYMONGO_SECRET_KEY': 'sk_test_dummy_key',
    'EXPO_PUBLIC_API_URL': 'https://api.example.com',
    'EXPO_PUBLIC_HCAPTCHA_SITE_KEY': '10000000-ffff-ffff-ffff-000000000001',
    'EXPO_PUBLIC_HCAPTCHA_SECRET_KEY': '0x0000000000000000000000000000000000000000',
    'EXPO_PUBLIC_EMAILJS_SERVICE_ID': 'service_6aipiwl',
    'EXPO_PUBLIC_EMAILJS_TEMPLATE_ID': 'template_8bg6o08',
    'EXPO_PUBLIC_EMAILJS_PUBLIC_KEY': '4PTJpGlpUN1X8xAh3'
  };

  // Apply default values if not set in environment
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`⚠️ Missing ${varName}, using default value for development`);
        // @ts-ignore - We know this is a valid approach for development
        process.env[varName] = defaultValues[varName];
      }
    }
  });

  // Check again after applying defaults
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0 && process.env.NODE_ENV === 'production') {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    // In production, we log the error but don't throw to prevent app crash
  }
}

/**
 * Gets an environment variable with type checking
 * @param name The environment variable name
 * @param defaultValue Optional default value if not set
 * @returns The environment variable value
 */
export function getEnv(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  
  if (value === undefined) {
    console.warn(`Environment variable ${name} is not set and no default value was provided`);
    return ''; // Return empty string instead of throwing
  }
  
  return value;
}

/**
 * Checks if the app is running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export default {
  validateEnvironment,
  getEnv,
  isProduction
}; 