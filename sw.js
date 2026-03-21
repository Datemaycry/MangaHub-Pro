// MangaHub Pro — Service Worker
// Stratégie : Cache-First pour les assets CDN, Network-First pour le HTML

const CACHE_NAME = ‘mangahub-v1’;

const PRECACHE_ASSETS = [
‘./’,
‘./MangaHub.html’,
‘https://unpkg.com/react@18/umd/react.production.min.js’,
‘https://unpkg.com/react-dom@18/umd/react-dom.production.min.js’,
‘https://unpkg.com/@babel/standalone/babel.min.js’,
‘https://cdn.tailwindcss.com’,
‘https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js’,
‘https://cdn.jsdelivr.net/npm/mobile-drag-drop@2.3.0-rc.2/index.min.js’,
‘https://cdn.jsdelivr.net/npm/mobile-drag-drop@2.3.0-rc.2/default.css’,
‘https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap’,
];

// Installation : précache de l’app shell
self.addEventListener(‘install’, (event) => {
event.waitUntil(
caches.open(CACHE_NAME).then(async (cache) => {
await Promise.allSettled(
PRECACHE_ASSETS.map(url =>
cache.add(url).catch(err => console.warn(`[SW] Cache manqué: ${url}`, err))
)
);
return self.skipWaiting();
})
);
});

// Activation : suppression des anciens caches
self.addEventListener(‘activate’, (event) => {
event.waitUntil(
caches.keys()
.then(keys => Promise.all(
keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
))
.then(() => self.clients.claim())
);
});

// Fetch : routage des stratégies
self.addEventListener(‘fetch’, (event) => {
const { request } = event;
if (request.method !== ‘GET’) return;
if (!request.url.startsWith(‘http’)) return;

```
const isHTML = request.url.includes('MangaHub.html') || request.url.endsWith('/');
event.respondWith(isHTML ? networkFirst(request) : cacheFirst(request));
```

});

// Network-First : toujours la dernière version du HTML
async function networkFirst(request) {
try {
const res = await fetch(request);
if (res.ok) (await caches.open(CACHE_NAME)).put(request, res.clone());
return res;
} catch {
return (await caches.match(request)) || caches.match(’./MangaHub.html’);
}
}

// Cache-First : rapide pour les assets CDN stables
async function cacheFirst(request) {
const cached = await caches.match(request);
if (cached) return cached;
try {
const res = await fetch(request);
if (res.ok) (await caches.open(CACHE_NAME)).put(request, res.clone());
return res;
} catch {
return new Response(’’, { status: 408, statusText: ‘Offline’ });
}
}

// Message depuis le HTML (mise à jour immédiate)
self.addEventListener(‘message’, (event) => {
if (event.data?.type === ‘SKIP_WAITING’) self.skipWaiting();
});
