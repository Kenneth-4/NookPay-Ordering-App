// Service Worker for NookPay PWA
const CACHE_NAME = 'nookpay-cache-v1';
const DYNAMIC_CACHE = 'nookpay-dynamic-v1';

// Assets to cache on install
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/nook.png',
  // Add more critical assets here
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME, DYNAMIC_CACHE];
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim() // Take control of clients immediately
    ])
  );
});

// Fetch event - network-first strategy for API, cache-first for assets
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Handle API requests (network-first)
  if (url.pathname.startsWith('/api/') || request.url.includes('firestore.googleapis.com')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Handle everything else (cache-first)
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          // Return cached response
          return response;
        }

        // Clone the request because it's a one-time use stream
        const fetchRequest = request.clone();

        return fetch(fetchRequest)
          .then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response because it's a one-time use stream
            const responseToCache = response.clone();

            // Cache the fetched response
            caches.open(DYNAMIC_CACHE)
              .then(cache => {
                cache.put(request, responseToCache);
              });

            return response;
          })
          .catch(error => {
            console.error('Fetch failed:', error);
            // You could return a custom offline page here
          });
      })
  );
}); 