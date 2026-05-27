const CACHE_NAME = 'talkink-v1';
const ASSETS = [
  // 📁 Main Root Paths & Configs
  '/talkink/',
  '/talkink/index.html',
  '/talkink/manifest.json',
  '/talkink/sw.js',
  
  // 🖼️ UI PWA App Icons
  '/talkink/icon-192.png',
  '/talkink/icon-512.png',

  // 📄 HTML Pages
  '/talkink/about.html',
  '/talkink/ads.html',
  '/talkink/payments.html',
  '/talkink/privacy.html',
  '/talkink/terms.html',

  // 🎨 CSS Files (Folder ke andar se)
  '/talkink/css/about.css',
  '/talkink/css/ads.css',
  '/talkink/css/payments.css',
  '/talkink/css/privacy.css',
  '/talkink/css/style.css',
  '/talkink/css/terms.css',

  // ⚡ JS Files (Folder ke andar se - WITHOUT server.js)
  '/talkink/js/about.js',
  '/talkink/js/animation.js',
  '/talkink/js/app.js',
  '/talkink/js/firebase.js',
  '/talkink/js/functions.js',
  '/talkink/js/heroEngine.js',
  '/talkink/js/rewardEngine.js'
];


// Service Worker Install hone par files cache karna (Optional background loading)
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(err => console.log("Cache add error:", err));
    })
  );
});

// Cache query handler taaki app smoothly behave kare
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request);
    })
  );
});
