import 'dotenv/config';

export default ({ config }) => {
  // Determine environment
  const isProduction = process.env.NODE_ENV === 'production';
  const isPreview = process.env.NODE_ENV === 'preview';
  
  // Base configuration
  const appConfig = {
    ...config,
    extra: {
      ...config.extra,
      hcaptchaSiteKey: process.env.EXPO_PUBLIC_HCAPTCHA_SITE_KEY,
      hcaptchaSecretKey: process.env.EXPO_PUBLIC_HCAPTCHA_SECRET_KEY,
      emailJsServiceId: process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID,
      emailJsTemplateId: process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID,
      emailJsPublicKey: process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY,
      paymongoPublicKey: process.env.EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY,
      paymongoSecretKey: process.env.EXPO_PUBLIC_PAYMONGO_SECRET_KEY,
      isProduction,
      isPreview,
      buildEnvironment: process.env.NODE_ENV || 'development',
      version: config.version,
    },
    web: {
      ...config.web,
      favicon: './assets/images/nook.png',
      name: 'NookPay App',
      shortName: 'Nook Pay',
      description: 'Mobile food ordering application',
      themeColor: '#F36514',
      backgroundColor: '#FFFFFF',
      intentFilters: [
        {
          action: 'VIEW',
          data: [
            {
              scheme: 'https',
              host: '*.foodordering.app',
              pathPrefix: '/',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
      build: {
        ...config.web?.build,
        babel: {
          dangerouslyAddModulePathsToTranspile: [
            '@expo/vector-icons'
          ]
        }
      },
      // PWA configuration
      meta: {
        viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
        'theme-color': '#F36514',
        'apple-mobile-web-app-capable': 'yes',
        'apple-mobile-web-app-status-bar-style': 'black-translucent',
        'apple-mobile-web-app-title': 'Food App',
      },
      // Custom HTML head content for PWA
      headTags: [
        {
          tagName: 'link',
          attributes: {
            rel: 'manifest',
            href: '/manifest.json',
          },
        },
        {
          tagName: 'link',
          attributes: {
            rel: 'apple-touch-icon',
            href: '/icons/icon-192x192.png',
          },
        },
        {
          tagName: 'script',
          innerHTML: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/service-worker.js')
                  .then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
              });
            }
          `,
        },
      ],
    }
  };
  
  // Production-specific configurations
  if (isProduction) {
    // Add production optimizations
    appConfig.web.build = {
      ...appConfig.web.build,
      minify: true,
    };
    
    // Enable hermes for production
    appConfig.jsEngine = 'hermes';
  }
  
  return appConfig;
}; 