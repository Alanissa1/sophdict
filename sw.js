const CACHE_NAME = 'sophdict-v40';

// Essential files for the app to function
const REQUIRED_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './SophDicta.png',
  './SophDict.png',
  './Merriam-Webster_logo.svg.webp',
  './css/base.css',
  './css/search-bar.css',
  './css/flashcards.css',
  './css/modal.css',
  './css/pin-list.css',
  './css/navigation.css',
  './css/tts.css',
  './css/text-scaler.css',
  './css/stats.css',
  './css/history.css',
  './css/theme.css',
  './css/license.css',
  './css/seo.css',
  './css/translation.css',
  './css/wallpaper.css',
  './js/config.js',
  './js/db-manager.js',
  './js/tts-manager.js',
  './js/pin-manager.js',
  './js/dictionary-api.js',
  './js/thesaurus-api.js',
  './js/api-client.js',
  './js/pre-fetcher.js',
  './js/ui-utils.js',
  './js/ui-dictionary.js',
  './js/ui-thesaurus.js',
  './js/ui-entry.js',
  './js/modal-manager.js',
  './js/keyboard-navigator.js',
  './js/scroll-manager.js',
  './js/scroll-fixer.js',
  './js/text-scaler.js',
  './js/history-manager.js',
  './js/stats.js',
  './js/theme-manager.js',
  './js/translation-manager.js',
  './js/license-manager.js',
  './js/wallpaper-manager.js',
  './js/app.js',
  './js/seo.js',
  './js/vercel-analytics.js',
  './js/vercel-speed-insights.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        REQUIRED_ASSETS.map(asset =>
          cache.add(asset).catch(err => console.warn(`[SW] Failed to cache: ${asset}`, err))
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  return self.clients.claim();
});

// Network First strategy for everything except API calls and translation
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/') || event.request.url.includes('translate.googleapis.com')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If successful, update the cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try the cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If it's a navigation request and we're offline, return index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
