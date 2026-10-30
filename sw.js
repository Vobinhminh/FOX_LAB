// Tên bộ nhớ cache (thay đổi version khi bạn cập nhật code mới để app tải lại)
const CACHE_NAME = 'fox-lab-offline-v8';

// Danh sách các tệp tĩnh cần lưu về máy người dùng
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon-512.png'
];

// Sự kiện Install: Tải và lưu trữ các tệp tĩnh vào Cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Sự kiện Activate: Dọn dẹp bộ nhớ Cache cũ nếu có bản cập nhật
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

// Sự kiện Fetch: Trả về dữ liệu từ Cache nếu mất mạng
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Ưu tiên trả về file trong Cache trước để tốc độ load siêu nhanh
            if (cachedResponse) {
                return cachedResponse;
            }
            // Nếu không có trong Cache thì tải từ mạng
            return fetch(event.request).catch(() => {
                // Xử lý lỗi khi offline hoàn toàn (Chatbot API rớt mạng sẽ được xử lý ngầm ở file HTML)
            });
        })
    );
});
