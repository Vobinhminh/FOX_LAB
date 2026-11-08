// FOX-Lab PWA Service Worker v3.3.0
const CACHE_NAME = 'fox-lab-offline-v3-3-0';

// Danh sách các tệp tĩnh cần lưu trữ bộ nhớ đệm (Cache)
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './version.json',
    './icon-512.png'
];

// Sự kiện Install: Tải và lưu các tài nguyên tĩnh vào Cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Sự kiện Activate: Xóa Cache phiên bản cũ khi có bản cập nhật mới
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Sự kiện Fetch: Phục vụ tài nguyên từ Cache khi ngoại tuyến (Offline)
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = event.request.url;

    // Bỏ qua không cache các request API ngoại vi (Google Sheet GAS / Chatbot AI)
    if (url.includes('script.google.com') || url.includes('generativelanguage.googleapis.com')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});
