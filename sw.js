const CACHE_NAME = 'app-cache-v1.0.2'; // Tăng số này mỗi khi cập nhật code
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png'
];

// 1. Cài đặt và ép kích hoạt ngay lập tức không chờ đóng tab
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// 2. Kích hoạt và xóa toàn bộ cache của phiên bản cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim()) // Chiếm quyền điều khiển trang ngay lập tức
  );
});

// 3. Chiến lược Fetch: Network-First cho HTML/JSON, Cache-First cho ảnh/icon
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bỏ qua các request gọi API ngoài (Google Apps Script, CDN...)
  if (url.origin !== location.origin) return;

  // Với file HTML hoặc version.json: Luôn ưu tiên lấy từ mạng để tránh kẹt giao diện cũ
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('version.json')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Với các tài nguyên tĩnh khác (CSS, JS, Icon): Lấy từ cache, đồng thời cập nhật ngầm
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});