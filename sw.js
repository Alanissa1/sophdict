const CACHE_NAME = 'sophdict-v51';
const SETTINGS_CACHE = 'sophdict-settings';

// Essential files for the app to function
const REQUIRED_ASSETS = [
  './',
  './?source=pwa',
  './index.html',
  './manifest.json',
  './sophdicta.png',
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
  './css/custom-lists.css',
  './js/config.js',
  './js/ielts-words.js',
  './js/sat.js',
  './js/pre-a1-words.js',
  './js/a2-words.js',
  './js/b1.js',
  './js/b2.js',
  './js/academic-list.js',
  './js/custom-lists.js',
  './js/feedback-support.js',
  './js/db-manager.js',
  './js/tts-manager.js',
  './js/audio-observer.js',
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
  './js/voice-filter.js',
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

let offlineFirst = false;

// Try to initialize setting from settings cache
const initSettings = async () => {
    try {
        const cache = await caches.open(SETTINGS_CACHE);
        const response = await cache.match('offline_first');
        if (response) {
            const data = await response.json();
            offlineFirst = data.value;
        }
    } catch (e) {}
};

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
    Promise.all([
        initSettings(),
        caches.keys().then((keys) => {
          return Promise.all(
            keys.filter((key) => key !== CACHE_NAME && key !== SETTINGS_CACHE).map((key) => caches.delete(key))
          );
        })
    ])
  );
  return self.clients.claim();
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SET_OFFLINE_FIRST') {
        offlineFirst = event.data.value;
        // Persist in settings cache
        caches.open(SETTINGS_CACHE).then(cache => {
            cache.put('offline_first', new Response(JSON.stringify({ value: offlineFirst })));
        });
    }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('translate.googleapis.com')) return;

  if (offlineFirst) {
      // CACHE FIRST Strategy
      event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(event.request).then((response) => {
            if (response && response.status === 200 && response.type === 'basic') {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
            }
            return response;
          }).catch(() => {
            if (event.request.mode === 'navigate') return caches.match('./index.html');
          });
        })
      );
  } else {
      // NETWORK FIRST Strategy (Default)
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response && response.status === 200 && response.type === 'basic') {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
            }
            return response;
          })
          .catch(() => {
            return caches.match(event.request).then((cachedResponse) => {
              if (cachedResponse) return cachedResponse;
              if (event.request.mode === 'navigate') return caches.match('./index.html');
            });
          })
      );
  }
});
