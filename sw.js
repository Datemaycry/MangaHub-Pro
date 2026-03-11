const CACHE_NAME = 'mangahub-pro-cache-v1';

// Liste des fichiers de base à mettre en cache pour le mode hors-ligne
const urlsToCache = [
  './',
  './index.html'
];

// ÉTAPE 1 : Installation du Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache ouvert');
                return cache.addAll(urlsToCache);
            })
    );
    // Force le SW à s'activer immédiatement
    self.skipWaiting();
});

// ÉTAPE 2 : Activation et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Ancien cache supprimé:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// ÉTAPE 3 : Interception des requêtes (Stratégie: Stale-While-Revalidate / Cache-First)
self.addEventListener('fetch', (event) => {
    // On ne gère que les requêtes GET
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Si le fichier est dans le cache, on le retourne immédiatement
                if (response) {
                    return response;
                }
                
                // Sinon on fait la requête sur le réseau
                return fetch(event.request).then(
                    (networkResponse) => {
                        // On vérifie qu'on a bien reçu une réponse valide
                        if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // On clone la réponse car elle ne peut être utilisée qu'une seule fois
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                // On ajoute le nouveau fichier au cache pour la prochaine fois
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    }
                );
            }).catch(() => {
                // Fallback optionnel en cas de coupure réseau complète
                console.log('Mode hors-ligne actif, ressource introuvable sur le réseau.');
            })
    );
});
