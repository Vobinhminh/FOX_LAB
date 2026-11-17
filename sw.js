// ============================================================================
// Service Worker cho FOX_LAB - Phòng thí nghiệm Vật lý về sóng cơ học
// Hỗ trợ chạy Offline trên lớp học & tự động cập nhật khi có phiên bản mới
// ============================================================================

// Tăng số phiên bản này mỗi khi bạn cập nhật index.html, report.html hoặc JS
const CACHE_VERSION = "fox-lab-v1.0.1";

// Các file cốt lõi nằm cùng thư mục trên GitHub Pages / Hosting
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./report.html",
  "./graph-snapshot.js",
  "./manifest.json"
];

// Các thư viện CDN dùng chung (QRCode, Google Fonts, MathJax) để cache khi chạy offline
const ALLOWED_CDN_HOSTS = [
  "cdnjs.cloudflare.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "cdn.jsdelivr.net"
];

// 1. CÀI ĐẶT (INSTALL): Lưu trước các file cốt lõi vào Cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      // Dùng allSettled để nếu thiếu file tùy chọn (VD: manifest.json) vẫn cài SW thành công
      await Promise.allSettled(
        CORE_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => null)
        )
      );
    })
  );
  // Kích hoạt ngay bản SW mới mà không bắt người dùng đóng hết tab
  self.skipWaiting();
});

// 2. KÍCH HOẠT (ACTIVATE): Dọn sạch bộ nhớ đệm của các phiên bản cũ
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((oldKey) => caches.delete(oldKey))
      )
    )
  );
  self.clients.claim();
});

// 3. XỬ LÝ YÊU CẦU MẠNG (FETCH)
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Chỉ xử lý phương thức GET và giao thức http/https
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!url.protocol.startsWith("http")) return;

  // Luôn lấy từ mạng đối với file kiểm tra phiên bản (version.json) hoặc Google Apps Script
  if (
    url.pathname.endsWith("version.json") ||
    url.hostname.includes("script.google.com")
  ) {
    event.respondWith(fetch(req, { cache: "no-store" }));
    return;
  }

  const isSameOrigin = url.origin === self.location.origin;
  const isAllowedCDN = ALLOWED_CDN_HOSTS.some((host) =>
    url.hostname.includes(host)
  );

  // Chiến lược A: File nội bộ của web (index.html, report.html, graph-snapshot.js...)
  // -> Ưu tiên mạng (Network-First) để luôn nhận code mới; mất mạng thì lấy từ Cache
  if (isSameOrigin) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const copy = networkRes.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return networkRes;
        })
        .catch(async () => {
          const cached = await caches.match(req, { ignoreSearch: true });
          if (cached) return cached;
          // Nếu đang mở trang điều hướng (có kèm tham số QR ?role=...) thì trả về index.html
          if (req.mode === "navigate") {
            return caches.match("./index.html");
          }
          return new Response("Đang ngoại tuyến và chưa có dữ liệu cache.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          });
        })
    );
    return;
  }

  // Chiến lược B: Thư viện ngoài (QRCode.js, MathJax, Google Fonts)
  // -> Ưu tiên Cache (Cache-First) để mở cực nhanh và hoạt động cả khi mất mạng
  if (isAllowedCDN) {
    event.respondWith(
      caches.match(req).then((cachedRes) => {
        if (cachedRes) return cachedRes;
        return fetch(req).then((networkRes) => {
          if (networkRes && (networkRes.status === 200 || networkRes.type === "opaque")) {
            const copy = networkRes.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return networkRes;
        });
      })
    );
  }
});

// Cho phép trang web gửi lệnh cập nhật ngay lập tức khi phát hiện phiên bản mới
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
