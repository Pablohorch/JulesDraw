// This ensures that 'self' is recognized as ServiceWorkerGlobalScope
// and events like 'install', 'activate', 'fetch' are known.
// It relies on "lib": ["WebWorker"] in tsconfig.json.

const CACHE_NAME: string = 'infinite-whiteboard-cache-v1';
const urlsToCache: string[] = [
    '/',
    'index.html',
    'style.css',
    'script.js', // Build process (e.g., Vite) will handle actual paths for compiled files.
                 // For development with a simple TS setup, this might need to be './dist/script.js'
                 // if running from root and outDir is './dist'.
    // Add paths to any icons if you have them
];

self.addEventListener('install', (event: Event) => {
    // It's an ExtendableEvent, but casting or using more specific InstallEvent if props are needed.
    // For waitUntil, ExtendableEvent is fine.
    const installEvent = event as ExtendableEvent;

    installEvent.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache: Cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('activate', (event: Event) => {
    const activateEvent = event as ExtendableEvent;

    activateEvent.waitUntil(
        caches.keys().then((cacheNames: string[]) => {
            return Promise.all(
                cacheNames.map((cacheName: string) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                    return Promise.resolve(); // Ensure a promise is returned for all paths
                })
            );
        }).then(() => {
            // Ensure new SW takes control immediately.
            // `clients.claim()` is part of ServiceWorkerGlobalScope.
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event: Event) => {
    const fetchEvent = event as FetchEvent;

    fetchEvent.respondWith(
        caches.match(fetchEvent.request)
            .then((response: Response | undefined) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Not in cache - fetch from network
                return fetch(fetchEvent.request).then(
                    (networkResponse: Response) => {
                        // Check if we received a valid response
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // IMPORTANT: Clone the response. A response is a stream
                        // and because we want the browser to consume the response
                        // as well as the cache consuming the response, we need
                        // to clone it so we have two streams.
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then((cache: Cache) => {
                                cache.put(fetchEvent.request, responseToCache);
                            });

                        return networkResponse;
                    }
                ).catch((error) => {
                    console.error('Fetch failed:', error);
                    // Depending on the strategy, you might want to return a fallback page here.
                    // For now, re-throwing the error will let the browser handle it (e.g., show offline page).
                    throw error;
                });
            })
    );
});
